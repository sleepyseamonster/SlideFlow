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

type FluxImageSize =
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9"
  | { width: number; height: number };

type GenerateBackgroundRequest = {
  prompt?: string;
  imageSize?: FluxImageSize;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  numImages?: number;
  enableSafetyChecker?: boolean;
  outputFormat?: "jpeg" | "png";
  acceleration?: "none" | "regular" | "high";
};

type FalImage = {
  url?: string;
  content_type?: string;
  width?: number;
  height?: number;
  file_data?: string;
};

type FalSubmitResponse = {
  request_id?: string;
  status?: string;
  images?: FalImage[];
  seed?: number;
  prompt?: string;
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
  prompt?: string;
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

async function generateWithFal(params: GenerateBackgroundRequest & { prompt: string }) {
  const apiKey = Deno.env.get("FAL_KEY");
  if (!apiKey) {
    return { ok: false as const, error: "fal.ai not configured (missing FAL_KEY)." };
  }

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    image_size: params.imageSize ?? "landscape_4_3",
    num_inference_steps: params.numInferenceSteps ?? 28,
    guidance_scale: params.guidanceScale ?? 10,
    num_images: params.numImages ?? 1,
    enable_safety_checker: params.enableSafetyChecker ?? true,
    output_format: params.outputFormat ?? "jpeg",
    acceleration: params.acceleration ?? "none",
  };

  if (typeof params.seed === "number") {
    body.seed = params.seed;
  }

  const submit = await falRequestJson<FalSubmitResponse>({
    url: "https://queue.fal.run/fal-ai/flux/dev",
    method: "POST",
    apiKey,
    body,
  });

  const immediate = submit.images?.[0];
  if (immediate?.url || immediate?.file_data) {
    return { ok: true as const, image: immediate, images: submit.images ?? [], seed: submit.seed ?? null, prompt: submit.prompt ?? null, requestId: submit.request_id ?? null };
  }

  const requestId = submit.request_id;
  if (!requestId) {
    return { ok: false as const, error: "fal.ai did not return a request_id or output images." };
  }

  const statusUrl = `https://queue.fal.run/fal-ai/flux/requests/${requestId}/status`;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const status = await falRequestJson<FalStatusResponse>({ url: statusUrl, method: "GET", apiKey });
    const normalized = String(status.status || "").toLowerCase();
    if (normalized.includes("fail") || normalized.includes("error") || status.error) {
      return { ok: false as const, error: "fal.ai background generation failed." };
    }
    if (normalized.includes("complete") || normalized.includes("success") || normalized.includes("done")) {
      break;
    }
    await delay(1000);
  }

  const resultUrl = `https://queue.fal.run/fal-ai/flux/requests/${requestId}`;
  const result = await falRequestJson<FalResultResponse>({ url: resultUrl, method: "GET", apiKey });
  const image = result.images?.[0];
  if (!image?.url && !image?.file_data) {
    return { ok: false as const, error: "fal.ai response missing image output." };
  }

  return { ok: true as const, image, images: result.images ?? [], seed: result.seed ?? null, prompt: result.prompt ?? null, requestId };
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

  let payload: GenerateBackgroundRequest;
  try {
    payload = (await req.json()) as GenerateBackgroundRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const prompt = payload.prompt?.trim() || "";
  if (!prompt) {
    return jsonResponse(400, { error: "Provide a prompt." });
  }

  try {
    const result = await generateWithFal({ ...payload, prompt });
    if (!result.ok) {
      return jsonResponse(502, { error: result.error });
    }

    const dataUrl = result.image.file_data && result.image.file_data.startsWith("data:") ? result.image.file_data : null;
    const url = result.image.url ?? null;

    return jsonResponse(200, {
      requestId: result.requestId,
      seed: result.seed,
      prompt: result.prompt,
      dataUrl,
      url,
      image: result.image,
      images: result.images,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background generation failed.";
    return jsonResponse(500, { error: message });
  }
});
