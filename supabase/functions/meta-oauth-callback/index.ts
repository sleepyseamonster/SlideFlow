import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_GRAPH_VERSION = "v18.0";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string) {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
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

async function hmacSha256Hex(message: string, secret: string) {
  const signature = await hmacSign(message, secret);
  return Array.from(signature)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function debugMetaToken(userAccessToken: string, metaAppId: string, metaAppSecret: string) {
  try {
    const debugUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/debug_token`);
    debugUrl.searchParams.set("input_token", userAccessToken);
    debugUrl.searchParams.set("access_token", `${metaAppId}|${metaAppSecret}`);

    const res = await fetch(debugUrl.toString(), { method: "GET" });
    const json = await res.json() as {
      data?: {
        is_valid?: boolean;
        user_id?: string;
        app_id?: string;
        expires_at?: number;
        scopes?: string[];
      };
      error?: unknown;
    };

    if (!res.ok || json.error) return null;

    const scopes = json.data?.scopes || [];
    return {
      isValid: !!json.data?.is_valid,
      userId: json.data?.user_id || null,
      scopes,
      hasPagesShowList: scopes.includes("pages_show_list"),
      hasBusinessManagement: scopes.includes("business_management"),
      hasInstagramBasic: scopes.includes("instagram_basic"),
      hasInstagramPublish: scopes.includes("instagram_content_publish"),
    };
  } catch {
    return null;
  }
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

type StatePayload = {
  user_id?: string;
  return_base?: string;
  iat?: number;
  exp?: number;
};

type MetaPage = {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id: string; username?: string };
  connected_instagram_account?: { id: string; username?: string };
};

async function parseState(rawState: string, secret: string) {
  const [payloadB64, signatureB64] = rawState.split(".");
  if (!payloadB64 || !signatureB64) return null;

  const expectedSignature = await hmacSign(payloadB64, secret);
  const expectedSignatureB64 = base64UrlEncode(expectedSignature);
  if (!timingSafeEqual(expectedSignatureB64, signatureB64)) return null;

  const payloadBytes = base64UrlDecode(payloadB64);
  if (!payloadBytes) return null;

  try {
    const payload = JSON.parse(decoder.decode(payloadBytes)) as StatePayload;
    if (!payload.user_id || !payload.return_base) return null;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    const normalizedReturnBase = normalizeReturnBase(payload.return_base);
    if (!normalizedReturnBase) return null;
    return { userId: payload.user_id, returnBase: normalizedReturnBase };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const metaAppId = Deno.env.get("META_APP_ID");
  const metaAppSecret = Deno.env.get("META_APP_SECRET");
  const siteUrl = Deno.env.get("SITE_URL");

  if (!supabaseUrl || !supabaseServiceKey || !metaAppId || !metaAppSecret) {
    return jsonResponse(500, { error: "Server misconfiguration" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  try {
    const normalizedSiteUrl = siteUrl ? normalizeReturnBase(siteUrl) : null;
    const state = stateRaw ? await parseState(stateRaw, metaAppSecret) : null;
    const redirectBase = normalizedSiteUrl || state?.returnBase || null;
    const finalConnected = redirectBase ? `${redirectBase}/profile?meta=connected` : null;
    const finalError = (reason: string) =>
      redirectBase ? `${redirectBase}/profile?meta=error&reason=${encodeURIComponent(reason)}` : null;

    if (!code) {
      const err = url.searchParams.get("error_description") || "missing_code";
      if (finalError) {
        return Response.redirect(finalError(err), 302);
      }
      return jsonResponse(400, { error: err });
    }

    if (!state?.userId) {
      if (finalError) {
        return Response.redirect(finalError("invalid_state"), 302);
      }
      return jsonResponse(400, { error: "Missing user context" });
    }
    if (!redirectBase || !finalConnected || !finalError) {
      return jsonResponse(400, { error: "Missing redirect base" });
    }

    const redirectUri = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/meta-oauth-callback`;

    // Exchange code -> short-lived token
    const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", metaAppId);
    tokenUrl.searchParams.set("client_secret", metaAppSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
    const tokenJson = await tokenRes.json() as { access_token?: string; expires_in?: number; error?: unknown };
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("meta oauth token exchange failed", tokenJson);
      return Response.redirect(finalError("token_exchange_failed"), 302);
    }

    const shortLivedToken = tokenJson.access_token;

    // Exchange short-lived -> long-lived
    const llUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    llUrl.searchParams.set("grant_type", "fb_exchange_token");
    llUrl.searchParams.set("client_id", metaAppId);
    llUrl.searchParams.set("client_secret", metaAppSecret);
    llUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const llRes = await fetch(llUrl.toString(), { method: "GET" });
    const llJson = await llRes.json() as { access_token?: string; expires_in?: number; error?: unknown };
    if (!llRes.ok || !llJson.access_token) {
      console.error("meta long-lived exchange failed", llJson);
      return Response.redirect(finalError("long_lived_failed"), 302);
    }

    const userAccessToken = llJson.access_token;
    const expiresInSeconds = typeof llJson.expires_in === "number" ? llJson.expires_in : null;
    const userTokenExpiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000).toISOString() : null;
    const tokenDebug = await debugMetaToken(userAccessToken, metaAppId, metaAppSecret);

    // Fetch pages with IG business accounts
    const accountsUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts`);
    accountsUrl.searchParams.set(
      "fields",
      "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}"
    );
    accountsUrl.searchParams.set("access_token", userAccessToken);
    accountsUrl.searchParams.set("appsecret_proof", await hmacSha256Hex(userAccessToken, metaAppSecret));

    const accountsRes = await fetch(accountsUrl.toString(), { method: "GET" });
    const accountsJson = await accountsRes.json() as {
      data?: MetaPage[];
      error?: unknown;
    };
    if (!accountsRes.ok || accountsJson.error) {
      console.error("meta accounts fetch failed", accountsJson);
      return Response.redirect(finalError("accounts_failed"), 302);
    }

    let pages: MetaPage[] = accountsJson.data || [];
    let pagesSource: "me_accounts" | "business_pages" = "me_accounts";

    // Fallback: some environments/users may return an empty /me/accounts list even when they can access Pages.
    // Try Business Manager assets via /me/businesses -> {owned_pages,client_pages}.
    if (pages.length === 0) {
      const businessesUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/businesses`);
      businessesUrl.searchParams.set("fields", "id,name");
      businessesUrl.searchParams.set("limit", "500");
      businessesUrl.searchParams.set("access_token", userAccessToken);
      businessesUrl.searchParams.set("appsecret_proof", await hmacSha256Hex(userAccessToken, metaAppSecret));

      const businessesRes = await fetch(businessesUrl.toString(), { method: "GET" });
      const businessesJson = await businessesRes.json() as { data?: Array<{ id: string; name?: string }>; error?: unknown };

      if (businessesRes.ok && !businessesJson.error && businessesJson.data?.length) {
        const businessPages: MetaPage[] = [];
        const businessFetchErrors: Array<{ businessId: string; edge: string; error: unknown }> = [];

        for (const biz of businessesJson.data) {
          for (const edge of ["owned_pages", "client_pages"]) {
            const bizPagesUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${biz.id}/${edge}`);
            bizPagesUrl.searchParams.set(
              "fields",
              "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}"
            );
            bizPagesUrl.searchParams.set("limit", "500");
            bizPagesUrl.searchParams.set("access_token", userAccessToken);
            bizPagesUrl.searchParams.set("appsecret_proof", await hmacSha256Hex(userAccessToken, metaAppSecret));

            const bizPagesRes = await fetch(bizPagesUrl.toString(), { method: "GET" });
            const bizPagesJson = await bizPagesRes.json() as { data?: MetaPage[]; error?: unknown };
            if (!bizPagesRes.ok || bizPagesJson.error) {
              businessFetchErrors.push({
                businessId: biz.id,
                edge,
                error: bizPagesJson.error || `Status ${bizPagesRes.status}`,
              });
              continue;
            }

            for (const p of bizPagesJson.data || []) {
              businessPages.push(p);
            }
          }
        }

        if (businessPages.length > 0) {
          pages = businessPages;
          pagesSource = "business_pages";
        } else {
          console.warn("meta-oauth-callback: no pages returned from /me/accounts or business assets", {
            accountsLength: 0,
            businessesCount: businessesJson.data.length,
            businessFetchErrors,
            tokenDebug,
          });
          const reason = `no_pages_biz${businessesJson.data.length}_pageerr${businessFetchErrors.length}_psl${tokenDebug?.hasPagesShowList ? 1 : 0}_bm${tokenDebug?.hasBusinessManagement ? 1 : 0}`;
          return Response.redirect(finalError(reason), 302);
        }
      } else {
        console.warn("meta-oauth-callback: accounts list empty and businesses unavailable", {
          accountsLength: 0,
          businessesError: businessesJson.error || `Status ${businessesRes.status}`,
          tokenDebug,
        });
        const reason = `no_pages_bizerr_psl${tokenDebug?.hasPagesShowList ? 1 : 0}_bm${tokenDebug?.hasBusinessManagement ? 1 : 0}`;
        return Response.redirect(finalError(reason), 302);
      }
    }

    const accountsSummary = pages.map((p) => ({
      pageId: p.id,
      pageName: p.name || null,
      hasAccessToken: !!p.access_token,
      igBusinessId: p.instagram_business_account?.id || null,
      igConnectedId: p.connected_instagram_account?.id || null,
      igBusinessUsername: p.instagram_business_account?.username || null,
      igConnectedUsername: p.connected_instagram_account?.username || null,
    }));

    const pageRows = pages.map((p) => {
      const ig =
        p.instagram_business_account?.id || p.connected_instagram_account?.id
          ? p.instagram_business_account ?? p.connected_instagram_account
          : null;

      return {
        pageId: p.id,
        pageName: p.name || null,
        pageAccessToken: p.access_token || null,
        igUserId: ig?.id || null,
        igUsername: ig?.username || null,
      };
    });

    const tokenFetchErrors: Array<{ pageId: string; error: unknown }> = [];
    const igLinkFetchErrors: Array<{ pageId: string; error: unknown }> = [];
    const missingIg: Array<{ pageId: string; pageName: string | null }> = [];
    const candidatesWithTokens: Array<{
      pageId: string;
      pageName: string | null;
      pageAccessToken: string;
      igUserId: string;
      igUsername: string | null;
    }> = [];

    for (const page of pageRows) {
      let pageAccessToken = page.pageAccessToken;
      if (!pageAccessToken) {
        const pageUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${page.pageId}`);
        pageUrl.searchParams.set("fields", "access_token");
        pageUrl.searchParams.set("access_token", userAccessToken);
        pageUrl.searchParams.set("appsecret_proof", await hmacSha256Hex(userAccessToken, metaAppSecret));

        const pageRes = await fetch(pageUrl.toString(), { method: "GET" });
        const pageJson = await pageRes.json() as { access_token?: string; error?: unknown };
        if (pageRes.ok && pageJson.access_token) {
          pageAccessToken = pageJson.access_token;
        } else {
          tokenFetchErrors.push({ pageId: page.pageId, error: pageJson.error || `Status ${pageRes.status}` });
        }
      }

      let igUserId = page.igUserId;
      let igUsername = page.igUsername;
      const effectiveAccessToken = pageAccessToken || userAccessToken;

      // Some contexts don't return IG linkage on /me/accounts; fetch from the Page directly.
      if (!igUserId) {
        const igLinkUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${page.pageId}`);
        igLinkUrl.searchParams.set("fields", "instagram_business_account{id,username},connected_instagram_account{id,username}");
        igLinkUrl.searchParams.set("access_token", effectiveAccessToken);
        igLinkUrl.searchParams.set("appsecret_proof", await hmacSha256Hex(effectiveAccessToken, metaAppSecret));

        const igLinkRes = await fetch(igLinkUrl.toString(), { method: "GET" });
        const igLinkJson = (await igLinkRes.json()) as {
          instagram_business_account?: { id: string; username?: string };
          connected_instagram_account?: { id: string; username?: string };
          error?: unknown;
        };

        if (igLinkRes.ok && !igLinkJson.error) {
          const ig =
            igLinkJson.instagram_business_account?.id || igLinkJson.connected_instagram_account?.id
              ? igLinkJson.instagram_business_account ?? igLinkJson.connected_instagram_account
              : null;
          igUserId = ig?.id || null;
          igUsername = ig?.username || null;
        } else {
          igLinkFetchErrors.push({ pageId: page.pageId, error: igLinkJson.error || `Status ${igLinkRes.status}` });
        }
      }

      if (igUserId) {
        candidatesWithTokens.push({
          pageId: page.pageId,
          pageName: page.pageName,
          pageAccessToken: effectiveAccessToken,
          igUserId,
          igUsername,
        });
      } else {
        missingIg.push({ pageId: page.pageId, pageName: page.pageName });
      }
    }

    const pagesWithTokens = candidatesWithTokens;
    const candidates = pagesWithTokens;

    if (candidates.length === 0) {
      const debugPayload = {
        pagesSource,
        pagesWithTokens: pagesWithTokens.map((p) => ({ pageId: p.pageId, igUserId: p.igUserId })),
        missingIg,
        tokenFetchErrors,
        igLinkFetchErrors,
        accountsSummary,
      };
      console.warn("meta-oauth-callback: no IG business candidates", debugPayload);

      const reason = `no_ig_business_pwt${pagesWithTokens.length}_missing${missingIg.length}_tokenerr${tokenFetchErrors.length}_igerr${igLinkFetchErrors.length}`;
      return Response.redirect(finalError(reason), 302);
    }

    // State is signed and time-limited to bind the OAuth response to the initiating user.

    // Persist connections
    const { data: existingPrimary } = await supabase
      .from("connected_account")
      .select("id")
      .eq("user_id", state.userId)
      .eq("platform", "instagram")
      .is("revoked_at", null)
      .eq("is_primary", true)
      .maybeSingle();

    const connected: Array<{ accountId: string; igUserId: string; pageId: string }> = [];

    for (const c of candidates) {
      const { data: upserted, error } = await supabase
        .from("connected_account")
        .upsert(
          {
            user_id: state.userId,
            platform: "instagram",
            ig_user_id: c.igUserId,
            ig_username: c.igUsername,
            page_id: c.pageId,
            page_name: c.pageName,
            revoked_at: null,
          },
          { onConflict: "user_id,platform,ig_user_id" }
        )
        .select("id")
        .limit(1);
      if (error || !upserted?.length) {
        console.error("db upsert connected_account failed", error);
        continue;
      }
      const accountId = upserted[0].id;
      const { error: secretErr } = await supabase
        .from("connected_account_secret")
        .upsert(
          {
            account_id: accountId,
            page_access_token: c.pageAccessToken,
            user_access_token: userAccessToken,
            user_access_token_expires_at: userTokenExpiresAt,
          },
          { onConflict: "account_id" }
        );
      if (secretErr) {
        console.error("db upsert connected_account_secret failed", secretErr);
      } else {
        connected.push({ accountId, igUserId: c.igUserId, pageId: c.pageId });
      }
    }

    if (!existingPrimary?.id && connected.length > 0) {
      await supabase
        .from("connected_account")
        .update({ is_primary: true })
        .eq("id", connected[0].accountId);
    }

    return Response.redirect(finalConnected, 302);
  } catch (err: unknown) {
    console.error("meta-oauth-callback error", err);
    return jsonResponse(500, { error: "Internal error" });
  }
});
