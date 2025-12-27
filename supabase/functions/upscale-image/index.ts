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

type UpscaleRequest = {
  imageUrl?: string;
  imageBase64?: string;
  model?: string;
  requestId?: string;
  statusUrl?: string;
  responseUrl?: string;
};

type FalImageFile = {
  url?: string;
  content_type?: string;
  file_data?: string;
  file_name?: string;
  file_size?: number;
  width?: number;
  height?: number;
};

type FalSubmitResponse = {
  request_id?: string;
  status?: string;
  image?: FalImageFile;
  status_url?: string;
  response_url?: string;
  error?: unknown;
};

type FalStatusResponse = {
  status?: string;
  error?: unknown;
};

type FalResultResponse = {
  status?: string;
  image?: FalImageFile;
  caption?: string;
  seed?: number;
  error?: unknown;
};

type UpscaleModelConfig = {
  id: "seedvr2";
  submitUrl: string;
  defaultStatusUrl: (requestId: string) => string;
  defaultResponseUrl: (requestId: string) => string;
  buildBody: (imageUrlOrDataUri: string) => Record<string, unknown>;
};

const UPSCALE_MODELS: Record<string, UpscaleModelConfig> = {
  seedvr2: {
    id: "seedvr2",
    submitUrl: "https://queue.fal.run/fal-ai/seedvr/upscale/image",
    defaultStatusUrl: (requestId) => `https://queue.fal.run/fal-ai/seedvr/requests/${requestId}/status`,
    defaultResponseUrl: (requestId) => `https://queue.fal.run/fal-ai/seedvr/requests/${requestId}`,
    buildBody: (imageUrlOrDataUri) => ({
      image_url: imageUrlOrDataUri,
      upscale_mode: "factor",
      upscale_factor: 2,
      output_format: "png",
    }),
  },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractHttpStatus(message: string) {
  const match = message.match(/\((\d{3})\)/);
  if (!match) return null;
  const code = Number(match[1]);
  return Number.isFinite(code) ? code : null;
}

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

  const text = await res.text().catch(() => "");
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const message = normalizeFalError(res.status, json, "fal.ai request failed");
    const details = text && text !== "[object Object]" ? ` — ${text.slice(0, 400)}` : "";
    throw new Error(`${message}${details}`);
  }
  return json as T;
}

type UpscaleOk = { ok: true; image: FalImageFile; requestId: string | null };
type UpscaleProcessing = { ok: false; processing: true; requestId: string };
type UpscaleError = { ok: false; error: string; code?: string; details?: Record<string, unknown> };

async function waitForFalResult(params: {
  apiKey: string;
  requestId: string;
  statusUrl: string;
  responseUrl: string;
  maxSeconds: number;
}): Promise<UpscaleOk | UpscaleProcessing | UpscaleError> {
  let completed = false;
  for (let attempt = 0; attempt < params.maxSeconds; attempt += 1) {
    let status: FalStatusResponse;
    try {
      status = await falRequestJson<FalStatusResponse>({
        url: params.statusUrl,
        method: "GET",
        apiKey: params.apiKey,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`fal.ai status check failed: ${message}`);
    }

    const normalized = String(status.status || "").toLowerCase();
    if (normalized.includes("fail") || normalized.includes("error") || status.error) {
      return { ok: false as const, error: "fal.ai upscale failed." };
    }
    if (normalized.includes("complete") || normalized.includes("success") || normalized.includes("done")) {
      completed = true;
      break;
    }
    await delay(1000);
  }

  if (!completed) {
    return { ok: false as const, processing: true, requestId: params.requestId };
  }

  let result: FalResultResponse;
  try {
    result = await falRequestJson<FalResultResponse>({
      url: params.responseUrl,
      method: "GET",
      apiKey: params.apiKey,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("(400)")) {
      return { ok: false as const, processing: true, requestId: params.requestId };
    }
    throw new Error(`fal.ai result fetch failed: ${message}`);
  }

  if (!result.image?.url && !result.image?.file_data) {
    return { ok: false as const, error: "fal.ai response missing image output." };
  }

  return { ok: true as const, image: result.image, requestId: params.requestId };
}

async function upscaleWithFal(params: {
  imageUrlOrDataUri: string;
  model: UpscaleModelConfig;
}): Promise<
  | UpscaleOk
  | (UpscaleProcessing & { statusUrl?: string; responseUrl?: string })
  | UpscaleError
> {
  const apiKey = Deno.env.get("FAL_KEY");
  if (!apiKey) {
    return { ok: false as const, error: "fal.ai not configured (missing FAL_KEY)." };
  }

  const submit = await falRequestJson<FalSubmitResponse>({
    url: params.model.submitUrl,
    method: "POST",
    apiKey,
    body: params.model.buildBody(params.imageUrlOrDataUri),
  });

  if (submit.image?.url || submit.image?.file_data) {
    return { ok: true as const, image: submit.image, requestId: submit.request_id ?? null };
  }

  const requestId = submit.request_id;
  if (!requestId) {
    return { ok: false as const, error: "fal.ai did not return a request_id or output image." };
  }

  const statusUrl = submit.status_url || params.model.defaultStatusUrl(requestId);
  const responseUrl = submit.response_url || params.model.defaultResponseUrl(requestId);

  const waitResult = await waitForFalResult({
    apiKey,
    requestId,
    statusUrl,
    responseUrl,
    maxSeconds: 25,
  });

  if (!waitResult.ok && "processing" in waitResult && waitResult.processing) {
    return { ...waitResult, statusUrl, responseUrl };
  }
  return waitResult;
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

  let payload: UpscaleRequest;
  try {
    payload = (await req.json()) as UpscaleRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const requestId = payload.requestId?.trim() || "";
  const statusUrl = payload.statusUrl?.trim() || "";
  const responseUrl = payload.responseUrl?.trim() || "";
  const imageUrlOrDataUri = payload.imageUrl?.trim() || payload.imageBase64?.trim() || "";
  const modelId = (payload.model?.trim() || "seedvr2").toLowerCase();
  const model = UPSCALE_MODELS[modelId] ?? UPSCALE_MODELS.seedvr2;

  try {
    if (requestId) {
      const apiKey = Deno.env.get("FAL_KEY");
      if (!apiKey) {
        return jsonResponse(502, { error: "fal.ai not configured (missing FAL_KEY)." });
      }
      const resolvedStatusUrl = statusUrl || model.defaultStatusUrl(requestId);
      const resolvedResponseUrl = responseUrl || model.defaultResponseUrl(requestId);
      const polled = await waitForFalResult({
        apiKey,
        requestId,
        statusUrl: resolvedStatusUrl,
        responseUrl: resolvedResponseUrl,
        maxSeconds: 25,
      });

      if (!polled.ok) {
        if ("processing" in polled && polled.processing) {
          return jsonResponse(200, {
            status: "processing",
            model: model.id,
            requestId,
            statusUrl: resolvedStatusUrl,
            responseUrl: resolvedResponseUrl,
            retry_after_seconds: 3,
          });
        }
        return jsonResponse(502, { error: polled.error });
      }

      const image = polled.image;
      const dataUrl = image.file_data && image.file_data.startsWith("data:") ? image.file_data : null;
      const url = image.url ?? null;
      return jsonResponse(200, {
        status: "completed",
        model: model.id,
        requestId,
        dataUrl,
        url,
        image,
      });
    }

    if (!imageUrlOrDataUri) {
      return jsonResponse(400, { error: "Provide imageUrl or imageBase64." });
    }

    const result = await upscaleWithFal({ imageUrlOrDataUri, model });
    if (!result.ok) {
      if ("processing" in result && result.processing) {
        return jsonResponse(200, {
          status: "processing",
          model: model.id,
          requestId: result.requestId,
          statusUrl: (result as { statusUrl?: string }).statusUrl ?? null,
          responseUrl: (result as { responseUrl?: string }).responseUrl ?? null,
          retry_after_seconds: 5,
        });
      }
      return jsonResponse(502, { error: result.error, code: (result as UpscaleError).code ?? "fal_error" });
    }

    const image = result.image;
    const dataUrl = image.file_data && image.file_data.startsWith("data:") ? image.file_data : null;
    const url = image.url ?? null;

    return jsonResponse(200, {
      status: "completed",
      model: model.id,
      requestId: result.requestId,
      dataUrl,
      url,
      image,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upscale failed.";
    const status = typeof message === "string" ? extractHttpStatus(message) : null;
    if (status === 422) {
      return jsonResponse(422, { error: message, code: "fal_validation_error" });
    }
    return jsonResponse(502, { error: message, code: "fal_error" });
  }
});
