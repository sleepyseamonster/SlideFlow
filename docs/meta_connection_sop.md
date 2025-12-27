# Meta Connection SOP (Canonical Flow)

Authoritative runbook for Meta (Instagram + Facebook) connection in SlideFlow. Use this for setup, deployment, troubleshooting, and handoff.

## Scope & Components
- **Frontend:** Profile → “Connect to Meta” calls `supabase.functions.invoke('meta-oauth-start')` and redirects to Meta.
- **Edge Functions:**
  - `supabase/functions/meta-oauth-start` — builds Meta auth URL, signs state (HMAC with `META_APP_SECRET`), validates return base.
  - `supabase/functions/meta-oauth-callback` — exchanges code → long-lived token, fetches Pages + IG, stores rows, redirects back.
  - `meta-connect` is **legacy** and should not be used.
- **DB:** `connected_account`, `connected_account_secret`, RPCs `set_connected_account_primary`, `revoke_connected_account`.

## Secrets & Environment
Set in Supabase project:
- `META_APP_ID`
  - Meta App → Settings → Basic → App ID
- `META_APP_SECRET`
  - Meta App → Settings → Basic → App Secret
- `SITE_URL` (recommended)
  - Locks return base; must match app origin (e.g., `https://slideflow.so` or `http://localhost:5173`)
- (Hosted functions auto-provide `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; set manually if self-hosting.)

Local app (`.env.local`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Meta App Configuration
- Add products: **Facebook Login**, **Instagram Graph API**.
- Valid OAuth Redirect URIs (must include the function callback):
  - Prod: `https://<project>.supabase.co/functions/v1/meta-oauth-callback`
  - Local (if used): `http://localhost:54321/functions/v1/meta-oauth-callback`
- If you also support Supabase Auth Facebook login, keep the Auth callbacks too:
  - `https://<project>.supabase.co/auth/v1/callback`
  - `http://localhost:54321/auth/v1/callback`

## Deploy Steps (canonical)
From `SlideFlow/`:
```bash
supabase functions deploy meta-oauth-start --project-ref fgfykhiecmqdpkeyeand
supabase functions deploy meta-oauth-callback --no-verify-jwt --project-ref fgfykhiecmqdpkeyeand
```
- `meta-oauth-callback` must run with `verify_jwt = false` (config.toml + deploy flag) because Meta redirects without an Authorization header.
- Ensure Docker is running if you need local bundling; hosted deploy works without it.

## Expected Flow
1) User logged in → clicks **Connect to Meta**.  
2) `meta-oauth-start` returns `authUrl`; state is a signed token (not raw JSON).  
3) Meta consent → redirect to `meta-oauth-callback` with `code` + `state`.  
4) Callback exchanges tokens, fetches Pages + IG, upserts `connected_account` + `connected_account_secret`, sets a primary if none.  
5) User is redirected to `/profile?meta=connected` (or `?meta=error&reason=...`).  
6) Profile shows all connected Instagram accounts and their linked Facebook Pages; users can connect additional accounts anytime from the same section.  
7) On return with `?meta=connected/error`, Profile auto-refreshes destinations and shows a status banner.
8) For multi-account connects, Meta consent should be used with “Edit access” to select the intended Page/IG; the start URL uses `auth_type=rerequest` so previously declined permissions can be re-granted.

## Testing Checklist
- Verify `state` in the redirect URL is opaque (base64-ish), not JSON.
- Network tab: `meta-oauth-callback` should return 302 redirect; no 401s.
- DB: rows appear in `connected_account` and `connected_account_secret`; one primary per user/platform.
- Profile: destinations list shows IG/Page; Set default/Disconnect work via RPCs.
- Both `instagram_business_account` and `connected_instagram_account` from Meta are accepted; either can populate the IG id/username.
- If `me/accounts` omits a Page access token, the callback will attempt to fetch it per Page using the user access token + `appsecret_proof`; failures are logged server-side.
- If a Page access token can’t be fetched, the callback will still proceed using the long-lived **user** access token for Graph calls and persist that token for publishing (stored in `connected_account_secret.page_access_token` for compatibility).

## Troubleshooting
- **401 Missing authorization header**  
  - Cause: callback deployed with JWT verification on.  
  - Fix: redeploy with `--no-verify-jwt` and ensure `config.toml` has `verify_jwt = false`.
- **Unauthorized from meta-oauth-start**  
  - User not logged in or Authorization header missing.  
  - Ensure frontend passes `Authorization: Bearer <access_token>` (current code does).
- **No pages returned (no_pages)**  
  - Meta responded with an empty `me/accounts` list for the user. SlideFlow also attempts a fallback via Business Manager assets (`/me/businesses` → `owned_pages`/`client_pages`); if both are empty, the token does not have visible Page access via the API.  
  - Confirm the connecting user has access to at least one Facebook Page and is in the Meta App’s roles/testers during development.
  - In the Meta consent screen, click “Edit access” and ensure at least one Page is selected (selecting none can yield an empty list).
  - Some errors include permission flags like `..._psl0_bm0` where `psl` = `pages_show_list` and `bm` = `business_management` (0 = not granted, 1 = granted). If either is 0, remove the app under Facebook “Business Integrations” and reconnect, or add the connecting Facebook user as a tester/developer/admin on the Meta App.
- **Wrong/extra IG/Page assets**  
  - Meta consent returned multiple assets. In consent, click “Edit access” and explicitly select the desired Page + IG.  
  - Inspect Network → `meta-oauth-callback` for pages returned and IG fetch errors.
- **No eligible IG Business account**  
  - Ensure IG is Business, linked to a Page, and the connecting user has Page access.
  - SlideFlow will attempt to fetch IG linkage via both `me/accounts` and per-Page lookup (`/{page_id}?fields=instagram_business_account,connected_instagram_account`). If the error includes `igerr>0`, Meta rejected the per-Page lookup (see function logs).
- **Disconnect issues**  
  - Apply migration `20251218000004_fix_revoke_connected_account.sql` or the SQL in `meta_connection_context.md`; RPC should be `revoke_connected_account(account_id uuid)`.

## Operational Notes
- Only deploy from the canonical path: `SlideFlow/supabase/functions`. The root-level `supabase/` copy is legacy; do not deploy from there.
- Keep `config.toml` alongside `meta-oauth-callback` to enforce `verify_jwt = false`.
- When updating scopes or redirect URIs, change **both** Meta App settings and redeploy functions.
- Logs & diagnostics:
  - The callback redirect includes a `reason` query param on failure (ex: `no_pages...`, `no_ig_business_pwt...tokenerr...igerr...`) which is shown in the Profile banner.
  - Supabase Dashboard logging UI varies. If you don’t see a per-function Logs tab:
    - Go to **Logs & Analytics** → **Collections** → **Edge Functions**
    - Filter by `pathname=/functions/v1/meta-oauth-callback` or `function_id` (shown in request/response logs)
    - Note: request/response logs may not include `console.*` payloads in all plans; rely on the redirect `reason` code for user-visible troubleshooting.
