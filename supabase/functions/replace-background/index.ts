import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

type ReplaceBackgroundRequest = {
  imageUrl?: string;
  imageBase64?: string;
  refImageUrl?: string;
  refImageBase64?: string;
  prompt?: string;
  fast?: boolean;
  refine_prompt?: boolean;
};

type FalImage = {
  url?: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
  width?: number;
  height?: number;
  file_data?: string;
};

type FalSubmitResponse = {
  request_id?: string;
  status?: string;
  images?: FalImage[];
  seed?: number;
  error?: unknown;
};

type FalStatusResponse = {
  status?: string;
  error?: unknown;
};

type FalResultResponse = {
  status?: string;
  images?: FalImage[];
  seed?: number;
  error?: unknown;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeFalError(status: number, payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return `${fallback} (${status})`;
  }
  const asAny = payload as Record<string, unknown>;
  const message =
    (typeof asAny.message === "string" && asAny.message) ||
    (typeof asAny.error === "string" && asAny.error) ||
    fallback;
  return `${message} (${status})`;
}

async function falRequestJson<T>(params: { url: string; method: "GET" | "POST"; apiKey: string; body?: unknown }) {
  const res = await fetch(params.url, {
    method: params.method,
    headers: {
      Authorization: `Key ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: params.method === "POST" ? JSON.stringify(params.body ?? {}) : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    throw new Error(normalizeFalError(res.status, json, "fal.ai request failed"));
  }
  return json;
}

async function replaceWithFal(params: { imageUrlOrDataUri: string; refImageUrlOrDataUri?: string; prompt?: string; fast?: boolean; refinePrompt?: boolean }) {
  const apiKey = Deno.env.get("FAL_KEY");
  if (!apiKey) {
    return { ok: false as const, error: "fal.ai not configured (missing FAL_KEY)." };
  }

  const body: Record<string, unknown> = {
    image_url: params.imageUrlOrDataUri,
    sync_mode: true,
    num_images: 1,
    fast: params.fast ?? true,
    refine_prompt: params.refinePrompt ?? true,
  };

  if (params.prompt) {
    body.prompt = params.prompt;
  } else if (params.refImageUrlOrDataUri) {
    body.ref_image_url = params.refImageUrlOrDataUri;
  }

  const submit = await falRequestJson<FalSubmitResponse>({
    url: "https://queue.fal.run/fal-ai/bria/background/replace",
    method: "POST",
    apiKey,
    body,
  });

  const immediate = submit.images?.[0];
  if (immediate?.url || immediate?.file_data) {
    return { ok: true as const, image: immediate, images: submit.images ?? [], seed: submit.seed ?? null, requestId: submit.request_id ?? null };
  }

  const requestId = submit.request_id;
  if (!requestId) {
    return { ok: false as const, error: "fal.ai did not return a request_id or output images." };
  }

  const statusUrl = `https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const status = await falRequestJson<FalStatusResponse>({ url: statusUrl, method: "GET", apiKey });
    const normalized = String(status.status || "").toLowerCase();
    if (normalized.includes("fail") || normalized.includes("error") || status.error) {
      return { ok: false as const, error: "fal.ai background replace failed." };
    }
    if (normalized.includes("complete") || normalized.includes("success") || normalized.includes("done")) {
      break;
    }
    await delay(1000);
  }

  const resultUrl = `https://queue.fal.run/fal-ai/bria/requests/${requestId}`;
  const result = await falRequestJson<FalResultResponse>({ url: resultUrl, method: "GET", apiKey });
  const image = result.images?.[0];
  if (!image?.url && !image?.file_data) {
    return { ok: false as const, error: "fal.ai response missing image output." };
  }

  return { ok: true as const, image, images: result.images ?? [], seed: result.seed ?? null, requestId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: "Server is missing Supabase env vars." });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  let payload: ReplaceBackgroundRequest;
  try {
    payload = (await req.json()) as ReplaceBackgroundRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const imageUrlOrDataUri = payload.imageUrl?.trim() || payload.imageBase64?.trim() || "";
  const refImageUrlOrDataUri = payload.refImageUrl?.trim() || payload.refImageBase64?.trim() || "";
  const prompt = payload.prompt?.trim() || "";

  if (!imageUrlOrDataUri) {
    return jsonResponse(400, { error: "Provide imageUrl or imageBase64." });
  }

  const hasPrompt = Boolean(prompt);
  const hasRefImage = Boolean(refImageUrlOrDataUri);
  if (!hasPrompt && !hasRefImage) {
    return jsonResponse(400, { error: "Provide either prompt or a reference background image." });
  }
  if (hasPrompt && hasRefImage) {
    return jsonResponse(400, { error: "Provide prompt OR reference image, not both." });
  }

  try {
    const result = await replaceWithFal({
      imageUrlOrDataUri,
      refImageUrlOrDataUri: hasRefImage ? refImageUrlOrDataUri : undefined,
      prompt: hasPrompt ? prompt : undefined,
      fast: payload.fast,
      refinePrompt: payload.refine_prompt,
    });
    if (!result.ok) {
      return jsonResponse(502, { error: result.error });
    }

    const dataUrl = result.image.file_data && result.image.file_data.startsWith("data:") ? result.image.file_data : null;
    const url = result.image.url ?? null;

    return jsonResponse(200, {
      requestId: result.requestId,
      seed: result.seed,
      dataUrl,
      url,
      image: result.image,
      images: result.images,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background replace failed.";
    return jsonResponse(500, { error: message });
  }
});

