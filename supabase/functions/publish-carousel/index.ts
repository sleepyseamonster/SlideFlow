import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

const META_GRAPH_VERSION = "v18.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const MAX_MEDIA_ITEMS = 10;

type PublishRequest = {
  carouselId?: string;
  connectedAccountId?: string;
  caption?: string;
  is_ai_generated?: boolean;
  platforms?: {
    instagram?: boolean;
    facebook?: boolean;
  };
  slides?: Array<{
    id?: string;
    position?: number;
    image?: string;
    originalMedia?: Record<string, unknown> | null;
  }>;
};

type GraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function normalizeGraphError(error?: GraphError, fallback?: string) {
  if (!error) return fallback || "Meta API error";
  const details = [error.message, error.type, error.code, error.error_subcode]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" ");
  return details || fallback || "Meta API error";
}

function applyAiDisclosure(caption: string, isAiGenerated: boolean) {
  if (!isAiGenerated) return caption;
  const disclosure = "AI-generated content.";
  const normalized = caption.toLowerCase();
  if (normalized.includes("ai-generated content")) {
    return caption.trim();
  }
  const trimmed = caption.trim();
  const spacer = trimmed ? "\n\n" : "";
  return `${trimmed}${spacer}${disclosure}`.trim();
}

function buildParams(params: Record<string, string | number | boolean | null | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") {
      body.set(key, value ? "true" : "false");
    } else {
      body.set(key, String(value));
    }
  }
  return body;
}

async function graphPost(path: string, accessToken: string, params: Record<string, string | number | boolean | null | undefined>) {
  const url = `${META_GRAPH_BASE}/${path.replace(/^\//, "")}`;
  const body = buildParams({ access_token: accessToken, ...params });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: GraphError };
  if (!res.ok || json.error) {
    throw new Error(normalizeGraphError(json.error, `Meta API error (${res.status})`));
  }
  return json;
}

async function graphGet(path: string, accessToken: string, params: Record<string, string | number | boolean | null | undefined>) {
  const url = new URL(`${META_GRAPH_BASE}/${path.replace(/^\//, "")}`);
  const search = buildParams({ access_token: accessToken, ...params });
  url.search = search.toString();
  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json().catch(() => ({}))) as { status_code?: string; error?: GraphError };
  if (!res.ok || json.error) {
    throw new Error(normalizeGraphError(json.error, `Meta API error (${res.status})`));
  }
  return json;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForInstagramContainer(creationId: string, accessToken: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const status = await graphGet(creationId, accessToken, { fields: "status_code" });
    if (status.status_code === "FINISHED") {
      return;
    }
    if (status.status_code === "ERROR") {
      throw new Error("Instagram media processing failed");
    }
    await delay(1500);
  }
}

async function publishInstagramCarousel(
  igUserId: string,
  accessToken: string,
  caption: string,
  imageUrls: string[]
) {
  if (imageUrls.length === 1) {
    const media = await graphPost(`${igUserId}/media`, accessToken, {
      image_url: imageUrls[0],
      caption: caption || undefined,
    });
    if (!media.id) {
      throw new Error("Failed to create Instagram media container");
    }
    await waitForInstagramContainer(media.id, accessToken);
    const published = await graphPost(`${igUserId}/media_publish`, accessToken, { creation_id: media.id });
    return { creationId: media.id, postId: published.id };
  }

  const childIds: string[] = [];
  for (const imageUrl of imageUrls) {
    const child = await graphPost(`${igUserId}/media`, accessToken, {
      image_url: imageUrl,
      is_carousel_item: true,
    });
    if (!child.id) {
      throw new Error("Failed to create Instagram carousel item");
    }
    childIds.push(child.id);
  }

  const carousel = await graphPost(`${igUserId}/media`, accessToken, {
    media_type: "CAROUSEL",
    caption: caption || undefined,
    children: childIds.join(","),
  });

  if (!carousel.id) {
    throw new Error("Failed to create Instagram carousel container");
  }

  await waitForInstagramContainer(carousel.id, accessToken);
  const published = await graphPost(`${igUserId}/media_publish`, accessToken, { creation_id: carousel.id });
  return { creationId: carousel.id, postId: published.id };
}

async function publishFacebookCarousel(
  pageId: string,
  accessToken: string,
  message: string,
  imageUrls: string[]
) {
  const mediaIds: string[] = [];
  for (const imageUrl of imageUrls) {
    const photo = await graphPost(`${pageId}/photos`, accessToken, {
      url: imageUrl,
      published: false,
    });
    if (!photo.id) {
      throw new Error("Failed to create Facebook photo");
    }
    mediaIds.push(photo.id);
  }

  const feedParams: Record<string, string> = {};
  if (message) {
    feedParams.message = message;
  }
  mediaIds.forEach((mediaId, index) => {
    feedParams[`attached_media[${index}]`] = JSON.stringify({ media_fbid: mediaId });
  });

  const feedPost = await graphPost(`${pageId}/feed`, accessToken, feedParams);
  if (!feedPost.id) {
    throw new Error("Failed to publish Facebook post");
  }
  return { postId: feedPost.id };
}

async function logPostingAttempt(params: {
  supabaseService: ReturnType<typeof createClient>;
  userId: string;
  carouselId: string;
  connectedAccountId: string;
  attemptId: string;
  platform: "instagram" | "facebook";
  status: "publishing" | "posted" | "failed";
  metaResponse?: Record<string, unknown> | null;
  errorMessage?: string | null;
}) {
  const {
    supabaseService,
    userId,
    carouselId,
    connectedAccountId,
    attemptId,
    platform,
    status,
    metaResponse,
    errorMessage,
  } = params;

  await supabaseService.from("posting_log").insert({
    user_id: userId,
    carousel_id: carouselId,
    connected_account_id: connectedAccountId,
    attempt_id: attemptId,
    platform,
    status,
    meta_response: metaResponse ?? null,
    error_message: errorMessage ?? null,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse(401, { error: "Missing or invalid Authorization header", code: "auth_missing" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonResponse(500, { error: "Server misconfiguration", code: "config_missing" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse(401, { error: "Unauthorized", code: "auth_failed" });
  }
  const userId = userData.user.id;

  const body = (await req.json().catch(() => ({}))) as PublishRequest;
  const carouselId = typeof body.carouselId === "string" ? body.carouselId.trim() : "";
  const connectedAccountId = typeof body.connectedAccountId === "string" ? body.connectedAccountId.trim() : "";
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  const isAiGenerated = body.is_ai_generated === true;
  const platforms = body.platforms || {};
  const slides = Array.isArray(body.slides) ? body.slides : [];

  if (!carouselId || !connectedAccountId) {
    return jsonResponse(422, { error: "carouselId and connectedAccountId are required", code: "invalid_request" });
  }

  if (!platforms.instagram && !platforms.facebook) {
    return jsonResponse(422, { error: "At least one platform must be selected", code: "platform_missing" });
  }

  if (slides.length === 0) {
    return jsonResponse(422, { error: "Slides are required", code: "slides_missing" });
  }

  if ((platforms.instagram || platforms.facebook) && slides.length > MAX_MEDIA_ITEMS) {
    return jsonResponse(422, {
      error: `Carousels are limited to ${MAX_MEDIA_ITEMS} slides per post`,
      code: "slides_limit",
    });
  }

  const imageUrls = slides.map((slide) => (typeof slide.image === "string" ? slide.image.trim() : ""));
  if (imageUrls.some((url) => !url || !url.startsWith("http"))) {
    return jsonResponse(422, { error: "All slide images must be accessible URLs", code: "invalid_media" });
  }

  const { data: account, error: accountError } = await supabase
    .from("connected_account")
    .select("id, ig_user_id, page_id, ig_username, page_name")
    .eq("id", connectedAccountId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .maybeSingle();

  if (accountError || !account) {
    return jsonResponse(403, { error: "Connected account not found", code: "account_missing" });
  }

  if (platforms.instagram && !account.ig_user_id) {
    return jsonResponse(422, { error: "Instagram account missing for this destination", code: "ig_missing" });
  }

  if (platforms.facebook && !account.page_id) {
    return jsonResponse(422, { error: "Facebook Page missing for this destination", code: "fb_missing" });
  }

  const { data: secret, error: secretError } = await supabaseService
    .from("connected_account_secret")
    .select("page_access_token, user_access_token")
    .eq("account_id", connectedAccountId)
    .maybeSingle();

  if (secretError || !secret) {
    return jsonResponse(403, { error: "Publishing token not found", code: "token_missing" });
  }

  const accessToken = secret.page_access_token || secret.user_access_token;
  if (!accessToken) {
    return jsonResponse(403, { error: "Publishing token missing", code: "token_missing" });
  }

  const { data: carousel, error: carouselError } = await supabase
    .from("carousel")
    .select("id, title, user_id, status")
    .eq("id", carouselId)
    .eq("user_id", userId)
    .maybeSingle();

  if (carouselError || !carousel) {
    return jsonResponse(404, { error: "Carousel not found", code: "carousel_missing" });
  }

  if ((carousel.status || "").toLowerCase() === "published") {
    return jsonResponse(409, {
      error: "Carousel already published",
      code: "publish_locked",
    });
  }

  const { data: priorPosts, error: priorPostsError } = await supabaseService
    .from("posting_log")
    .select("id")
    .eq("carousel_id", carouselId)
    .eq("status", "posted")
    .limit(1);

  if (priorPostsError) {
    console.error("Failed to check prior publish attempts", { priorPostsError, carouselId, userId });
    return jsonResponse(500, {
      error: "Failed to verify publish history",
      code: "publish_history_failed",
      details: priorPostsError.message,
    });
  }

  if (priorPosts && priorPosts.length > 0) {
    return jsonResponse(409, {
      error: "Carousel already published",
      code: "publish_locked",
    });
  }

  const attemptId = crypto.randomUUID();

  const results: Record<string, unknown> = {};
  const publishCaption = applyAiDisclosure(caption, isAiGenerated);
  let currentPlatform: "instagram" | "facebook" | null = null;

  try {
    if (platforms.instagram) {
      currentPlatform = "instagram";
      await logPostingAttempt({
        supabaseService,
        userId,
        carouselId,
        connectedAccountId,
        attemptId,
        platform: "instagram",
        status: "publishing",
        metaResponse: { ai_generated: isAiGenerated },
      });
      const instagramResult = await publishInstagramCarousel(account.ig_user_id, accessToken, publishCaption, imageUrls);
      results.instagram = instagramResult;
      await logPostingAttempt({
        supabaseService,
        userId,
        carouselId,
        connectedAccountId,
        attemptId,
        platform: "instagram",
        status: "posted",
        metaResponse: { ...(instagramResult as Record<string, unknown>), ai_generated: isAiGenerated },
      });
    }
    if (platforms.facebook) {
      currentPlatform = "facebook";
      await logPostingAttempt({
        supabaseService,
        userId,
        carouselId,
        connectedAccountId,
        attemptId,
        platform: "facebook",
        status: "publishing",
        metaResponse: { ai_generated: isAiGenerated },
      });
      const facebookResult = await publishFacebookCarousel(account.page_id, accessToken, publishCaption, imageUrls);
      results.facebook = facebookResult;
      await logPostingAttempt({
        supabaseService,
        userId,
        carouselId,
        connectedAccountId,
        attemptId,
        platform: "facebook",
        status: "posted",
        metaResponse: { ...(facebookResult as Record<string, unknown>), ai_generated: isAiGenerated },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    const hadPartialSuccess = Object.keys(results).length > 0;
    if (currentPlatform) {
      await logPostingAttempt({
        supabaseService,
        userId,
        carouselId,
        connectedAccountId,
        attemptId,
        platform: currentPlatform,
        status: "failed",
        errorMessage: message,
      });
    }
    console.error("Publish failed", { message, carouselId, connectedAccountId });
    if (hadPartialSuccess) {
      await supabaseService
        .from("carousel")
        .update({
          status: "published",
        })
        .eq("id", carouselId)
        .eq("user_id", userId);
    }
    const partialNote =
      hadPartialSuccess
        ? " One platform may have been posted successfully. Retries are disabled for safety."
        : "";
    return jsonResponse(500, {
      error: `${message}.${partialNote}`.trim(),
      code: hadPartialSuccess ? "publish_partial" : "publish_failed",
    });
  }

  await supabaseService
    .from("carousel")
    .update({
      status: "published",
    })
    .eq("id", carouselId)
    .eq("user_id", userId);

  return jsonResponse(200, {
    ok: true,
    message: "Carousel posted",
    results,
  });
});
