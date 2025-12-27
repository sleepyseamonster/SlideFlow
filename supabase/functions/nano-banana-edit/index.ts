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

type NanoBananaEditRequest = {
  prompt?: string;
  imageUrl?: string;
  imageBase64?: string;
  imageUrls?: string[];
  numImages?: number;
  aspectRatio?: string;
  outputFormat?: "jpeg" | "png" | "webp";
  resolution?: "1K" | "2K" | "4K";
  syncMode?: boolean;
  limitGenerations?: boolean;
};

type FalImageFile = {
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
  images?: FalImageFile[];
  description?: string;
  error?: unknown;
};

type FalStatusResponse = {
  status?: string;
  error?: unknown;
};

type FalResultResponse = {
  status?: string;
  images?: FalImageFile[];
  description?: string;
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

async function falRequestJson<T>(params: {
  url: string;
  method: "GET" | "POST";
  apiKey: string;
  body?: unknown;
}) {
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

async function editWithFal(params: {
  prompt: string;
  imageUrls: string[];
  aspectRatio?: string;
  outputFormat?: "jpeg" | "png" | "webp";
  numImages?: number;
  resolution?: "1K" | "2K" | "4K";
  syncMode?: boolean;
  limitGenerations?: boolean;
}) {
  const apiKey = Deno.env.get("FAL_KEY");
  if (!apiKey) {
    return { ok: false as const, error: "fal.ai not configured (missing FAL_KEY)." };
  }

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    image_urls: params.imageUrls,
    num_images: params.numImages ?? 1,
    output_format: params.outputFormat ?? "png",
    aspect_ratio: params.aspectRatio ?? "auto",
    resolution: params.resolution ?? "1K",
  };

  if (typeof params.syncMode === "boolean") {
    body.sync_mode = params.syncMode;
  }
  if (typeof params.limitGenerations === "boolean") {
    body.limit_generations = params.limitGenerations;
  }

  const submit = await falRequestJson<FalSubmitResponse>({
    url: "https://queue.fal.run/fal-ai/nano-banana-pro/edit",
    method: "POST",
    apiKey,
    body,
  });

  const immediate = submit.images?.[0];
  if (immediate?.url || immediate?.file_data) {
    return {
      ok: true as const,
      images: submit.images ?? [],
      description: submit.description ?? null,
      requestId: submit.request_id ?? null,
    };
  }

  const requestId = submit.request_id;
  if (!requestId) {
    return { ok: false as const, error: "fal.ai did not return a request_id or output images." };
  }

  const statusUrl = `https://queue.fal.run/fal-ai/nano-banana-pro/requests/${requestId}/status`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await falRequestJson<FalStatusResponse>({ url: statusUrl, method: "GET", apiKey });
    const normalized = String(status.status || "").toLowerCase();
    if (normalized.includes("fail") || normalized.includes("error") || status.error) {
      return { ok: false as const, error: "fal.ai AI edit failed." };
    }
    if (normalized.includes("complete") || normalized.includes("success") || normalized.includes("done")) {
      break;
    }
    await delay(1000);
  }

  const resultUrl = `https://queue.fal.run/fal-ai/nano-banana-pro/requests/${requestId}`;
  const result = await falRequestJson<FalResultResponse>({ url: resultUrl, method: "GET", apiKey });
  const first = result.images?.[0];
  if (!first?.url && !first?.file_data) {
    return { ok: false as const, error: "fal.ai response missing image output." };
  }

  return {
    ok: true as const,
    images: result.images ?? [],
    description: result.description ?? null,
    requestId,
  };
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

  let payload: NanoBananaEditRequest;
  try {
    payload = (await req.json()) as NanoBananaEditRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const prompt = payload.prompt?.trim() || "";
  if (!prompt) {
    return jsonResponse(400, { error: "Provide a prompt." });
  }

  const imageUrls =
    (payload.imageUrls ?? []).filter((url) => typeof url === "string" && url.length > 0) ||
    [];
  const fallbackUrl = payload.imageUrl?.trim() || payload.imageBase64?.trim() || "";
  const finalImageUrls = imageUrls.length ? imageUrls : fallbackUrl ? [fallbackUrl] : [];
  if (!finalImageUrls.length) {
    return jsonResponse(400, { error: "Provide imageUrl, imageBase64, or imageUrls." });
  }

  try {
    const result = await editWithFal({
      prompt,
      imageUrls: finalImageUrls,
      aspectRatio: payload.aspectRatio,
      outputFormat: payload.outputFormat,
      numImages: payload.numImages,
      resolution: payload.resolution,
      syncMode: payload.syncMode,
      limitGenerations: payload.limitGenerations,
    });
    if (!result.ok) {
      return jsonResponse(502, { error: result.error });
    }

    const first = result.images[0] ?? null;
    const dataUrl = first?.file_data && first.file_data.startsWith("data:") ? first.file_data : null;

    return jsonResponse(200, {
      requestId: result.requestId,
      description: result.description,
      image: first,
      images: result.images,
      url: first?.url ?? null,
      dataUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI edit failed.";
    return jsonResponse(500, { error: message });
  }
});

