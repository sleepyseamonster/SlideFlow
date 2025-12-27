# Meta Connection Context (Instagram + Facebook)

## Overview (current flow)
- Meta connect is a **server-side OAuth** flow using Edge Functions:
  - `supabase/functions/meta-oauth-start` (returns the Meta auth URL + signed state)
  - `supabase/functions/meta-oauth-callback` (exchanges code → long-lived token, fetches Pages + IG, stores rows)
- Frontend: Profile → “Connect to Meta” calls `supabase.functions.invoke('meta-oauth-start')` and redirects to Meta.
- Callback redirect: `https://<project>.supabase.co/functions/v1/meta-oauth-callback` → redirects back to `/profile?meta=connected` (or `?meta=error`).
- Data persisted:
  - `public.connected_account` (user-visible rows, RLS user-scoped)
  - `public.connected_account_secret` (tokens, service-role only)
  - RPCs: `set_connected_account_primary`, `revoke_connected_account`

## Latest behavior notes
- **JWT verification disabled on callback** (`verify_jwt = false`) to avoid `401 Missing authorization header` when Meta redirects.
- State is **signed + time-limited** (HMAC with `META_APP_SECRET`) to bind the callback to the initiating user and return base.
- `meta-oauth-start` validates the redirect base (either `SITE_URL`, request origin, or matching `redirectBase` from the client).
- `meta-oauth-start` uses `auth_type=rerequest` + `return_scopes=true` so Meta will re-prompt for any previously declined permissions when connecting another account.
- Meta requests include `appsecret_proof` for Graph calls.
- Candidate discovery is robust across Meta environments:
  - Pages from `me/accounts` (when available)
  - Fallback Pages from Business Manager assets (`/me/businesses` → `owned_pages` + `client_pages`) when `me/accounts` returns empty
  - IG linkage from both `instagram_business_account` and `connected_instagram_account`
  - Per-Page IG lookup when the initial Page list omits IG fields (`/{page_id}?fields=instagram_business_account,connected_instagram_account`)
- If Page tokens can’t be fetched, the callback falls back to the long-lived **user** token to keep multi-account connects unblocked (stored in `connected_account_secret.page_access_token` for compatibility).

## Deploy steps (functions)
- From repo root (`SlideFlow`):
  - `supabase functions deploy meta-oauth-start --project-ref <project-ref>`
  - `supabase functions deploy meta-oauth-callback --no-verify-jwt --project-ref <project-ref>`
- Ensure env vars set in Supabase: `META_APP_ID`, `META_APP_SECRET`, `SITE_URL` (recommended). Hosted functions get `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` automatically; set them manually if self-hosting.

## Disconnect RPC fix (DB)
Issue: `column reference "account_id" is ambiguous` and later missing RPC in cache.
Resolution: drop old function, recreate with safe parameter, and add a wrapper matching the original signature.
SQL to run in Supabase SQL Editor (or via CLI):
```sql
drop function if exists public.revoke_connected_account(uuid);

create or replace function public.revoke_connected_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_platform text;
  v_was_primary boolean;
  v_new_primary uuid;
begin
  select user_id, platform, is_primary
    into v_user_id, v_platform, v_was_primary
  from public.connected_account
  where id = p_account_id and revoked_at is null;

  if not found then
    return;
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  update public.connected_account
    set revoked_at = now(), is_primary = false
  where id = p_account_id;

  delete from public.connected_account_secret
  where account_id = p_account_id;

  if v_was_primary then
    select id into v_new_primary
    from public.connected_account
    where user_id = v_user_id
      and platform = v_platform
      and revoked_at is null
    order by connected_at asc
    limit 1;

    if v_new_primary is not null then
      perform public.set_connected_account_primary(v_new_primary);
    end if;
  end if;
end;
$$;

-- Wrapper to preserve the original signature used by the client
create or replace function public.revoke_connected_account(account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.revoke_connected_account(p_account_id := account_id);
end;
$$;

grant execute on function public.revoke_connected_account(uuid) to authenticated;
```
After running, PostgREST will see the function and the UI “Disconnect” will succeed.

## How to test connect
1. Refresh app and click “Connect to Meta”.
2. In Meta consent, click “Edit access” and explicitly select the Page and IG you want (don’t rely only on “all current/future”).
3. After redirect, `meta-oauth-callback` saves the connection and sends you back to `/profile?meta=connected`. If it fails, capture the Response JSON from Network → `meta-oauth-callback` or the error reason on the redirect URL.
   - Useful error codes include `no_pages...` and `no_ig_business_pwt...tokenerr...igerr...` (see `meta_connection_sop.md`).

## How to test disconnect
1. Ensure the DB function is updated (see SQL above).
2. On Profile, click “Disconnect” for a destination.
3. If it fails, copy the Response body from Network → `revoke_connected_account` and check Postgres logs for permission/parameter issues.

## Known Meta issues seen
- Graph error `(#100) Tried accessing nonexisting field (account_type) on node type (IGUser)` → fixed by removing `account_type` from requested fields.
- Schema cache mismatch for `revoke_connected_account` after parameter rename → fixed by drop + recreate + wrapper.

## UX notes
- “Login with Facebook” signs in the user; “Connect to Meta” fetches Page/IG assets. Even FB‑signed‑in users must still “Connect to Meta” to store tokens. Consider future UI copy: “Signed in with Facebook. Connect to Meta to pull your Page/IG.”
