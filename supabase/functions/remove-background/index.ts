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

type RemoveBackgroundRequest = {
  imageUrl?: string;
  imageBase64?: string;
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
  image?: FalImage;
  error?: unknown;
};

type FalStatusResponse = {
  status?: string;
  error?: unknown;
};

type FalResultResponse = {
  status?: string;
  image?: FalImage;
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

async function removeWithFal(params: { imageUrlOrDataUri: string }) {
  const apiKey = Deno.env.get("FAL_KEY");
  if (!apiKey) {
    return { ok: false as const, error: "fal.ai not configured (missing FAL_KEY)." };
  }

  const submit = await falRequestJson<FalSubmitResponse>({
    url: "https://queue.fal.run/fal-ai/bria/background/remove",
    method: "POST",
    apiKey,
    body: {
      image_url: params.imageUrlOrDataUri,
      sync_mode: true,
    },
  });

  const immediateImage = submit.image;
  if (immediateImage?.url || immediateImage?.file_data) {
    return { ok: true as const, image: immediateImage, requestId: submit.request_id ?? null };
  }

  const requestId = submit.request_id;
  if (!requestId) {
    return { ok: false as const, error: "fal.ai did not return a request_id or image." };
  }

  const statusUrl = `https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const status = await falRequestJson<FalStatusResponse>({ url: statusUrl, method: "GET", apiKey });
    const normalized = String(status.status || "").toLowerCase();
    if (normalized.includes("fail") || normalized.includes("error") || status.error) {
      return { ok: false as const, error: "fal.ai background removal failed." };
    }
    if (normalized.includes("complete") || normalized.includes("success") || normalized.includes("done")) {
      break;
    }
    await delay(1000);
  }

  const resultUrl = `https://queue.fal.run/fal-ai/bria/requests/${requestId}`;
  const result = await falRequestJson<FalResultResponse>({ url: resultUrl, method: "GET", apiKey });
  if (!result.image?.url && !result.image?.file_data) {
    return { ok: false as const, error: "fal.ai response missing image output." };
  }

  return { ok: true as const, image: result.image, requestId };
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

  let payload: RemoveBackgroundRequest;
  try {
    payload = (await req.json()) as RemoveBackgroundRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const imageUrl = payload.imageUrl?.trim() || undefined;
  const imageBase64 = payload.imageBase64?.trim() || undefined;
  if (!imageUrl && !imageBase64) {
    return jsonResponse(400, { error: "Provide imageUrl or imageBase64." });
  }

  try {
    const imageUrlOrDataUri = imageUrl ?? imageBase64 ?? "";
    const result = await removeWithFal({ imageUrlOrDataUri });
    if (!result.ok) {
      return jsonResponse(502, { error: result.error });
    }

    const image = result.image;
    const dataUrl =
      image.file_data && image.file_data.startsWith("data:") ? image.file_data : undefined;

    return jsonResponse(200, {
      requestId: result.requestId,
      url: image.url ?? null,
      dataUrl: dataUrl ?? null,
      image: image ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background removal failed.";
    return jsonResponse(500, { error: message });
  }
});
