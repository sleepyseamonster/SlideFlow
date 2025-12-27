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

type VectorizeRequest = {
  imageUrl?: string;
  imageBase64?: string;
};

type FalSubmitResponse = {
  request_id?: string;
  status?: string;
  image?: {
    url?: string;
    file_data?: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
  error?: unknown;
};

type FalStatusResponse = {
  status?: string;
  error?: unknown;
};

type FalResultResponse = {
  status?: string;
  image?: {
    url?: string;
    file_data?: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
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

async function vectorizeWithFal(imageUrl: string) {
  const apiKey = Deno.env.get("FAL_KEY");
  if (!apiKey) {
    return { ok: false as const, error: "fal.ai not configured (missing FAL_KEY)." };
  }

  const submit = await falRequestJson<FalSubmitResponse>({
    url: "https://queue.fal.run/fal-ai/recraft/vectorize",
    method: "POST",
    apiKey,
    body: { image_url: imageUrl },
  });

  const immediate = submit.image;
  if (immediate?.url || immediate?.file_data) {
    return { ok: true as const, image: immediate, requestId: submit.request_id ?? null };
  }

  const requestId = submit.request_id;
  if (!requestId) {
    return { ok: false as const, error: "fal.ai did not return a request_id." };
  }

  const statusUrl = `https://queue.fal.run/fal-ai/recraft/requests/${requestId}/status`;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const status = await falRequestJson<FalStatusResponse>({ url: statusUrl, method: "GET", apiKey });
    const normalized = String(status.status || "").toLowerCase();
    if (normalized.includes("fail") || normalized.includes("error") || status.error) {
      return { ok: false as const, error: "fal.ai vectorize failed." };
    }
    if (normalized.includes("complete") || normalized.includes("success") || normalized.includes("done")) {
      break;
    }
    await delay(1000);
  }

  const resultUrl = `https://queue.fal.run/fal-ai/recraft/requests/${requestId}`;
  const result = await falRequestJson<FalResultResponse>({ url: resultUrl, method: "GET", apiKey });
  const image = result.image;
  if (!image?.url && !image?.file_data) {
    return { ok: false as const, error: "fal.ai response missing vector output." };
  }

  return { ok: true as const, image, requestId };
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

  let payload: VectorizeRequest;
  try {
    payload = (await req.json()) as VectorizeRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const imageUrl = payload.imageUrl || payload.imageBase64 || "";
  if (!imageUrl) {
    return jsonResponse(400, { error: "Provide an imageUrl or imageBase64." });
  }

  try {
    const result = await vectorizeWithFal(imageUrl);
    if (!result.ok) {
      return jsonResponse(502, { error: result.error });
    }

    return jsonResponse(200, {
      requestId: result.requestId,
      image: result.image,
      url: result.image.url ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vectorize failed.";
    return jsonResponse(500, { error: message });
  }
});
