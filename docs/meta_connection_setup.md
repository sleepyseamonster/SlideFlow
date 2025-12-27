# Meta Connection (Instagram + Facebook) Setup Guide

This guide covers everything needed to make SlideFlow’s **Connect to Meta** button work end‑to‑end:

- Users launch Meta OAuth via an Edge Function.
- SlideFlow exchanges the short‑lived token for a **long‑lived user token**, discovers eligible assets, and stores:
  - Instagram professional account id + username
  - Facebook Page id + name
  - A secure token (service-role only) for publishing

---

## What SlideFlow Implements (in this repo)

### Frontend flow
- Clicking **Connect to Meta** calls `supabase.functions.invoke('meta-oauth-start')`.
- The Edge Function returns a Meta OAuth URL.
- Meta redirects to the Edge Function callback:
  - `supabase/functions/meta-oauth-callback`
- The callback exchanges code → long‑lived token, fetches Pages + Instagram accounts, and stores:
  - `connected_account`
  - `connected_account_secret`
- User is redirected back to `/profile?meta=connected` (or `meta=error` on failure).

### Supabase pieces
- Migration: `supabase/migrations/20251218000000_add_connected_accounts.sql`
  - `connected_account`: user-visible identifiers (RLS user-scoped)
  - `connected_account_secret`: tokens (service-role only)
- Migration: `supabase/migrations/20251218000001_connected_account_rpcs.sql`
  - Enforces one active “default” destination per user
  - Adds RPCs to switch default + disconnect cleanly
- Edge Functions:
  - `supabase/functions/meta-oauth-start` (generates OAuth URL + signed state)
  - `supabase/functions/meta-oauth-callback` (exchanges tokens, fetches assets, stores rows)
  - `supabase/functions/meta-connect` (legacy path via Supabase Auth provider token; not used in the current flow)
  - `supabase/functions/publish-carousel` (dev stub publish endpoint; does **not** send content to Meta)

---

## Part A — Meta setup (done in Meta / Facebook)

### 1) Create (or choose) a Meta App
1. Go to Meta for Developers: https://developers.facebook.com/
2. **My Apps → Create App**
3. Choose an app type that supports business integrations (often **Business**).
4. Record:
   - **App ID**
   - **App Secret** (keep private)

### 2) Add required Products
In your app:
1. **Add Product → Facebook Login**
2. **Add Product → Instagram Graph API**

### 3) Configure Meta OAuth redirect URI (critical)
SlideFlow uses a server-side OAuth callback (Edge Function). You must add the function URL as a valid redirect.

1. In Meta App → **Facebook Login → Settings**
2. Add this to **Valid OAuth Redirect URIs**:
   - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/meta-oauth-callback`

If you use local Supabase (optional), also add:
- `http://localhost:54321/functions/v1/meta-oauth-callback`

If you also use **Supabase Auth Facebook login**, keep the Auth callback too:
- `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
- `http://localhost:54321/auth/v1/callback`

### 4) Ensure your test user/assets are eligible
Meta’s Instagram publishing has strict requirements:

- Instagram account must be **Business** (SlideFlow blocks Creator accounts)
- It must be linked to a **Facebook Page**
- The Page/IG must be in a Meta environment your user has access to (Business Manager / Page role)

Checklist:
1. In Instagram mobile app:
   - Settings → Account → Switch to a Professional account → **Business**
2. Link to a Facebook Page:
   - Instagram Settings → Account Center / Professional tools (varies by UI)
   - Ensure the IG professional account is connected to a Page

### 5) Add test roles (so you can use the app before review)
Before App Review approvals, only people in roles can grant advanced permissions.

1. Meta App → **Roles**
2. Add your account as:
   - Admin / Developer / Tester
3. If needed, add a **Facebook Test User** and assign to the app.

### 6) Permissions you will request (and likely need review for production)
SlideFlow requests these scopes:
- `instagram_basic`
- `instagram_content_publish`
- `pages_manage_posts`
- `pages_show_list`
- `pages_read_engagement`
- `pages_read_user_content`
- `business_management`

For production (real users outside your roles), you should expect an **App Review** process for at least:
- `instagram_content_publish`
- potentially others depending on your use of Pages/Business assets

---

## Part B — Supabase setup (Auth + DB + Edge Functions)

### 1) (Optional) Configure Facebook provider in Supabase Auth
This is only required if you let users **sign in with Facebook**. The Meta connect flow does not depend on Supabase Auth.

In Supabase Dashboard:
1. **Authentication → Providers → Facebook**
2. Enable it and set:
   - Facebook **App ID**
   - Facebook **App Secret**

### 2) Add your site URLs / redirect URLs in Supabase (Auth only)
This is only needed for Supabase Auth redirects (email links, OAuth). Meta connect does not use these URLs.

In Supabase Dashboard:
1. **Authentication → URL Configuration**
2. Ensure your app URL is configured (examples):
   - Local: `http://localhost:5173`
   - Prod: `https://yourdomain.com`
3. Add redirect URLs you use for Auth (examples):
   - `http://localhost:5173/dashboard`
   - `https://yourdomain.com/dashboard`

### 3) Apply the database migration
You need to apply:
- `supabase/migrations/20251218000000_add_connected_accounts.sql`
- `supabase/migrations/20251218000001_connected_account_rpcs.sql`
- `supabase/migrations/20251218000003_fix_revoke_connected_account.sql`
- `supabase/migrations/20251218000004_fix_revoke_connected_account.sql` (restores the `account_id` argument name + fixes ambiguity)

How you do this depends on how you manage migrations (Supabase CLI vs Dashboard SQL editor).

**Option A: Supabase CLI**
1. Install/login to Supabase CLI (if you use it)
2. Run migrations against your project

**Option B: Dashboard SQL editor**
1. Open **SQL Editor**
2. Paste the migration contents and run

Afterward you should see:
- `public.connected_account`
- `public.connected_account_secret`
- RPCs:
  - `set_connected_account_primary(account_id uuid)`
  - `revoke_connected_account(account_id uuid)`

### 4) Deploy the Edge Functions
Deploy:
- `supabase/functions/meta-oauth-start`
- `supabase/functions/meta-oauth-callback`
- `supabase/functions/publish-carousel` (dev stub)

With Supabase CLI (typical):
- `supabase functions deploy meta-oauth-start --project-ref <YOUR_SUPABASE_PROJECT_REF>`
- `supabase functions deploy meta-oauth-callback --no-verify-jwt --project-ref <YOUR_SUPABASE_PROJECT_REF>`
- `supabase functions deploy publish-carousel --project-ref <YOUR_SUPABASE_PROJECT_REF>`

`meta-oauth-callback` must have JWT verification disabled because Meta redirects to it without an Authorization header (this is the common cause of a 401 “Missing authorization header”).

### 5) Set Edge Function secrets
The functions need Meta credentials to sign state and exchange tokens.

Set these secrets for your Supabase project:
- `META_APP_ID`
- `META_APP_SECRET`
- `SITE_URL` (recommended; used to lock the return redirect base)

If you use the CLI:
- `supabase secrets set META_APP_ID=... META_APP_SECRET=...`

Also confirm your function environment contains:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

(Supabase provides these automatically in hosted Edge Functions; if not, set them as secrets.)

---

## Part C — Local app configuration

### 1) Ensure Vite has Supabase env vars
Your local `.env` / `.env.local` should include:
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`

### 2) Run the app
From the repo:
- `cd "/Users/worldbuilder/Desktop/Slide Flow Dev/SlideFlow" && npm run dev`

### 3) Test the connection
1. Log in to SlideFlow
2. Go to **Profile**
3. Click **Connect to Meta**
4. Approve permissions in the Meta consent screen
   - Click **Edit access** and explicitly select the Page and Instagram account you want to connect.
   - To connect multiple destinations, repeat “Connect another” and select a different Page/IG.
5. You should land back on `/profile?meta=connected`

Expected outcomes:
- A row is created/updated in `public.connected_account`
- A token row is stored in `public.connected_account_secret` (service role only)
- If multiple Pages/IG accounts are eligible, they will all appear under **Posting destinations** on the Profile page; select **Set as default** for the one you want to publish to by default.
- To remove a destination, use **Disconnect** on that row; to switch the default destination later, click **Set as default** on a different row.

---

## Part D — Publish flow (live)

Publishing now calls the `publish-carousel` Edge Function, which:
- Validates the user and the **Publish-page selected** `connected_account.id`
- Validates platforms + slide payload
- Uses the stored Page access token to publish via Meta Graph API

The publishing implementation must **only** use the selected `connected_account.id` and never iterate over other connected accounts.

---

## Troubleshooting

### “No eligible Instagram Business account found”
This means Meta did not return any Page that exposes a connected Instagram Business account for the authorized user.

Fix:
- Confirm Instagram account is **Business**
- Confirm it is connected to a Facebook Page
- Confirm the connecting user has permission on that Page
- In Meta consent, click “Edit access” and ensure the intended Page is selected.
- If the error includes counts like `tokenerr>0` or `igerr>0`, Meta is blocking a Page token or IG linkage lookup for the returned Pages; reconnect with `auth_type=rerequest` (SlideFlow does this automatically) and ensure the user is a tester/dev on the Meta App if still in development mode.

### “No pages returned” (`no_pages...`)
Meta returned an empty Pages list for the token. SlideFlow attempts both `me/accounts` and Business Manager assets (`/me/businesses` → `owned_pages`/`client_pages`). If both are empty, the user token does not have API-visible Page access in that context.

Fix:
- Ensure the connecting Facebook user has Page access and is added to the Meta App’s Roles (tester/dev/admin) while the app is in development.
- In Meta consent, click “Edit access” and select at least one Page (selecting none can yield an empty list).

### “Missing authorization header” (401)
This happens when `meta-oauth-callback` is deployed with JWT verification enabled. Meta redirects to the callback without an Authorization header.

Fix:
- Deploy with `verify_jwt = false` (or `supabase functions deploy meta-oauth-callback --no-verify-jwt`)
- Confirm you’re deploying the `meta-oauth-callback` function that includes `supabase/functions/meta-oauth-callback/config.toml`

### “Unauthorized” from `meta-oauth-start`
The OAuth start endpoint requires an authenticated Supabase session.

Fix:
- Ensure the user is logged in before clicking **Connect to Meta**
- Verify the client is sending `Authorization: Bearer <access_token>` to `meta-oauth-start`

### App works for you but not real users
That’s typically App Review / permissions:
- Add them as testers/devs in Meta OR
- Submit for review and go Live
