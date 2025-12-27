import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

const STATE_TTL_MS = 10 * 60 * 1000;
const encoder = new TextEncoder();

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signature);
}

async function buildState(payload: Record<string, unknown>, secret: string) {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(encoder.encode(payloadJson));
  const signature = await hmacSign(payloadB64, secret);
  const signatureB64 = base64UrlEncode(signature);
  return `${payloadB64}.${signatureB64}`;
}

function normalizeReturnBase(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const metaAppId = Deno.env.get("META_APP_ID");
  const metaAppSecret = Deno.env.get("META_APP_SECRET");
  const siteUrl = Deno.env.get("SITE_URL"); // optional override for return base

  if (!supabaseUrl || !supabaseAnonKey || !metaAppId || !metaAppSecret) {
    return jsonResponse(500, { error: "Server misconfiguration" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") || "",
        apikey: supabaseAnonKey,
      },
    },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const body = (await req.json().catch(() => ({}))) as { redirectBase?: string };
  const origin = req.headers.get("origin") || "";
  const redirectBase = typeof body.redirectBase === "string" ? body.redirectBase.trim() : "";
  let returnBase = siteUrl?.trim() || "";

  if (!returnBase) {
    if (redirectBase) {
      if (origin && redirectBase !== origin) {
        return jsonResponse(400, { error: "redirectBase must match request origin" });
      }
      returnBase = redirectBase;
    } else if (origin) {
      returnBase = origin;
    }
  }

  const normalizedReturnBase = returnBase ? normalizeReturnBase(returnBase) : null;
  if (!normalizedReturnBase) {
    return jsonResponse(400, { error: "Missing or invalid redirect base" });
  }

  const redirectUri = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/meta-oauth-callback`;

  const now = Date.now();
  const state = await buildState(
    {
      user_id: userData.user.id,
      return_base: normalizedReturnBase,
      iat: now,
      exp: now + STATE_TTL_MS,
      nonce: crypto.randomUUID(),
    },
    metaAppSecret
  );

  const scopes = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_manage_posts",
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
    "business_management",
  ].join(",");

  const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  authUrl.searchParams.set("client_id", metaAppId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);
  // Ensure Meta re-prompts for any previously declined granular permissions (pages/IG assets).
  authUrl.searchParams.set("auth_type", "rerequest");
  authUrl.searchParams.set("return_scopes", "true");

  return jsonResponse(200, { authUrl: authUrl.toString() });
});
