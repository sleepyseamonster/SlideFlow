# Hosting Meta Policy Documents (Privacy / Data Deletion / Terms)

Use this checklist to get permanent URLs you can paste into the Meta App settings (Privacy Policy URL + User data deletion instructions + Terms of Service).

## 1. Generate static HTML
1. Generate HTML pages from the repo docs:
   - Source docs:
     - `docs/privacy_policy.md`
     - `docs/data_deletion.md`
     - `docs/terms_of_service.md`
   - Build the hosted HTML files (no external dependencies):
     ```bash
     node scripts/build-policy-docs.mjs
     ```
   - Output directory:
     - `policy-docs/` (contains `privacy-policy.html`, `data-deletion.html`, `terms-of-service.html`, `index.html`)

## 2. Upload to Supabase Storage
1. Ensure you are logged in via `supabase login`.
2. Ensure the **public** bucket exists:
   - Recommended: apply the migration `supabase/migrations/20251218000002_add_public_docs_bucket.sql` to your Supabase project
     (this creates the `public-docs` bucket and restricts writes to service role).
   - If you prefer the Dashboard SQL editor instead of migrations, run the contents of:
     - `supabase/migrations/20251218000002_add_public_docs_bucket.sql`
3. Upload the generated HTML into a logical path using `supabase storage cp`:
   ```bash
   supabase --experimental storage cp policy-docs/privacy-policy.html ss:///public-docs/privacy/privacy-policy.html --content-type text/html
   supabase --experimental storage cp policy-docs/data-deletion.html ss:///public-docs/privacy/data-deletion.html --content-type text/html
   supabase --experimental storage cp policy-docs/terms-of-service.html ss:///public-docs/privacy/terms-of-service.html --content-type text/html
   ```
4. Confirm the files exist:
   ```bash
   supabase --experimental storage ls ss:///public-docs/privacy
   ```

## 3. Wire the URLs into Meta
- **Privacy Policy URL:** `https://<PROJECT>.supabase.co/storage/v1/object/public/public-docs/privacy/privacy-policy.html`
- **User data deletion:** same base path pointing to `data-deletion.html`
- **Terms of Service:** same base path pointing to `terms-of-service.html`

## 4. Keep docs updated
- When the text changes, re-run the converter and `supabase storage update` the files.  
- Make sure the placeholders (address, email, effective dates) are updated before going live.

> Tip: If you later host your main marketing site, you can serve these pages there instead; just update the Meta URLs accordingly.
