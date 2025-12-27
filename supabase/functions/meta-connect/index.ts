import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const META_GRAPH_VERSION = "v18.0";

type RequestBody = {
  providerToken?: string;
};

type GraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type MetaTokenExchangeResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: GraphError;
};

type MetaAccountsResponse = {
  data?: Array<{
    id: string;
    name?: string;
    access_token?: string;
    instagram_business_account?: { id: string; username?: string };
    connected_instagram_account?: { id: string; username?: string };
  }>;
  error?: GraphError;
};

type InstagramAccountResponse = {
  id?: string;
  username?: string;
  account_type?: string;
  error?: GraphError;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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
  const metaAppId = Deno.env.get("META_APP_ID");
  const metaAppSecret = Deno.env.get("META_APP_SECRET");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error("Missing Supabase env vars");
    return jsonResponse(500, { error: "Server misconfiguration", code: "config_missing" });
  }
  if (!metaAppId || !metaAppSecret) {
    console.error("Missing META_APP_ID or META_APP_SECRET");
    return jsonResponse(500, { error: "Server misconfiguration", code: "meta_config_missing" });
  }

  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
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

  try {
    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse(401, { error: "Unauthorized", code: "auth_failed" });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as RequestBody;
    const providerToken = typeof body?.providerToken === "string" ? body.providerToken.trim() : "";
    if (!providerToken) {
      return jsonResponse(422, { error: "providerToken is required", code: "invalid_request" });
    }

    const exchangeUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
    exchangeUrl.searchParams.set("client_id", metaAppId);
    exchangeUrl.searchParams.set("client_secret", metaAppSecret);
    exchangeUrl.searchParams.set("fb_exchange_token", providerToken);

    const exchangeRes = await fetch(exchangeUrl.toString(), { method: "GET" });
    const exchangeJson = (await exchangeRes.json()) as MetaTokenExchangeResponse;
    if (!exchangeRes.ok || exchangeJson.error || !exchangeJson.access_token) {
      console.error("Meta token exchange failed", { status: exchangeRes.status, body: exchangeJson });
      const message = exchangeJson.error?.message || "Failed to exchange Meta token";
      return jsonResponse(400, { error: message, code: "meta_token_exchange_failed" });
    }

    const longLivedUserToken = exchangeJson.access_token;
    const expiresInSeconds = typeof exchangeJson.expires_in === "number" ? exchangeJson.expires_in : null;
    const userTokenExpiresAt = expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      : null;

    const accountsUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts`);
    accountsUrl.searchParams.set(
      "fields",
      "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}"
    );
    accountsUrl.searchParams.set("access_token", longLivedUserToken);

    const accountsRes = await fetch(accountsUrl.toString(), { method: "GET" });
    const accountsJson = (await accountsRes.json()) as MetaAccountsResponse;
    if (!accountsRes.ok || accountsJson.error) {
      console.error("Meta accounts fetch failed", { status: accountsRes.status, body: accountsJson });
      const message = accountsJson.error?.message || "Failed to fetch Meta pages";
      return jsonResponse(400, { error: message, code: "meta_pages_fetch_failed" });
    }

    const rawCandidates = (accountsJson.data || [])
      .filter((page) => !!page.access_token)
      .map((page) => {
        // Meta content publishing requires an Instagram Business account linked to the Page.
        const igAccount = page.instagram_business_account || null;
        if (!igAccount?.id) return null;

        return {
          pageId: page.id,
          pageName: page.name || null,
          pageAccessToken: page.access_token!,
          igUserId: igAccount.id,
          igUsername: igAccount.username || null,
        };
      })
      .filter(
        (
          candidate
        ): candidate is {
          pageId: string;
          pageName: string | null;
          pageAccessToken: string;
          igUserId: string;
          igUsername: string | null;
        } => !!candidate
      );

    const candidates: typeof rawCandidates = [];
    const igFetchErrors: Array<{ igUserId: string; error: GraphError | string }> = [];
    for (const candidate of rawCandidates) {
      const igInfoUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${candidate.igUserId}`);
      // Only request username; avoid account_type to prevent (#100) nonexisting field errors on some IGUser nodes.
      igInfoUrl.searchParams.set("fields", "username");
      igInfoUrl.searchParams.set("access_token", candidate.pageAccessToken || longLivedUserToken);

      const igRes = await fetch(igInfoUrl.toString(), { method: "GET" });
      const igJson = (await igRes.json()) as InstagramAccountResponse;

      if (!igRes.ok || igJson.error) {
        igFetchErrors.push({
          igUserId: candidate.igUserId,
          error: igJson.error || `Status ${igRes.status}`,
        });
      }

      candidates.push({
        ...candidate,
        igUsername: igRes.ok && !igJson.error ? igJson.username || candidate.igUsername : candidate.igUsername,
      });
    }

    if (candidates.length === 0) {
      const pagesWithTokens = (accountsJson.data || [])
        .filter((p) => !!p.access_token)
        .map((p) => ({
          pageId: p.id,
          pageName: p.name || null,
          hasIGBusinessAccount: !!p.instagram_business_account?.id,
          hasConnectedIG: !!p.connected_instagram_account?.id,
          igBusinessId: p.instagram_business_account?.id || null,
          igConnectedId: p.connected_instagram_account?.id || null,
          igBusinessUsername: p.instagram_business_account?.username || null,
          igConnectedUsername: p.connected_instagram_account?.username || null,
        }));

      return jsonResponse(422, {
        error:
          "No eligible Instagram Business account found. Make sure you have an Instagram Business account connected to a Facebook Page in Meta, then try again.",
        code: "no_instagram_business_account",
        debug: {
          pagesWithTokens,
          rawCandidateCount: rawCandidates.length,
          igFetchErrors,
        },
      });
    }

    // Revoke any existing Instagram connections for this user that are not in the newly fetched set.
    const candidateIgIds = candidates.map((c) => c.igUserId);
    const { data: existingActive } = await supabaseService
      .from("connected_account")
      .select("id, ig_user_id")
      .eq("user_id", userId)
      .eq("platform", "instagram")
      .is("revoked_at", null);

    const toRevoke =
      existingActive?.filter((row) => !candidateIgIds.includes(row.ig_user_id)).map((row) => row.id) ?? [];

    if (toRevoke.length > 0) {
      await supabaseService
        .from("connected_account")
        .update({ revoked_at: new Date().toISOString(), is_primary: false })
        .in("id", toRevoke);

      await supabaseService.from("connected_account_secret").delete().in("account_id", toRevoke);
    }

    // Determine if we need to set a primary account.
    const { data: existingPrimary } = await supabaseService
      .from("connected_account")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", "instagram")
      .is("revoked_at", null)
      .eq("is_primary", true)
      .maybeSingle();

    const connected: Array<{
      accountId: string;
      igUserId: string;
      igUsername: string | null;
      pageId: string;
      pageName: string | null;
      isPrimary: boolean;
    }> = [];

    for (const candidate of candidates) {
      const { data: upserted, error: upsertError } = await supabaseService
        .from("connected_account")
        .upsert(
          {
            user_id: userId,
            platform: "instagram",
            ig_user_id: candidate.igUserId,
            ig_username: candidate.igUsername,
            page_id: candidate.pageId,
            page_name: candidate.pageName,
            revoked_at: null,
          },
          { onConflict: "user_id,platform,ig_user_id" }
        )
        .select("id, ig_user_id, ig_username, page_id, page_name, is_primary")
        .limit(1);

      if (upsertError || !upserted || upserted.length === 0) {
        console.error("Upsert connected_account failed", { candidate, error: upsertError });
        return jsonResponse(500, { error: "Failed to save connected account", code: "db_account_upsert_failed" });
      }

      const row = upserted[0];

      const { error: secretError } = await supabaseService
        .from("connected_account_secret")
        .upsert(
          {
            account_id: row.id,
            page_access_token: candidate.pageAccessToken,
            user_access_token: longLivedUserToken,
            user_access_token_expires_at: userTokenExpiresAt,
          },
          { onConflict: "account_id" }
        );

      if (secretError) {
        console.error("Upsert connected_account_secret failed", { accountId: row.id, error: secretError });
        return jsonResponse(500, { error: "Failed to save token", code: "db_token_upsert_failed" });
      }

      connected.push({
        accountId: row.id,
        igUserId: row.ig_user_id,
        igUsername: row.ig_username ?? null,
        pageId: row.page_id,
        pageName: row.page_name ?? null,
        isPrimary: !!row.is_primary,
      });
    }

    if (!existingPrimary?.id && connected.length > 0) {
      const primaryId = connected[0].accountId;
      await supabaseService
        .from("connected_account")
        .update({ is_primary: true })
        .eq("id", primaryId);

      connected[0].isPrimary = true;
    }

    return jsonResponse(200, {
      ok: true,
      platform: "instagram",
      connectedCount: connected.length,
      connectedAccounts: connected,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("meta-connect error:", error);
    return jsonResponse(500, { error: message, code: "unexpected_error" });
  }
});

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
