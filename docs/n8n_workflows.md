# n8n Workflow Notes (Condensed)

## /all-data Carousel Workflow
1. **Webhook Intake**: Receives Bolt payload containing `uploaded_files[]`, `carousel{title,aspect}`, etc.
2. **Auth Chain**:
   - HTTP node exchanges Bolt token for Supabase `access_token`.
   - Store `authorization` + `user_id`; verify via `/auth/v1/user`.
   - Filter node halts if auth fails.
3. **ID Generation**: UUID node emits `carouselId`; `Pass All Data` carries everything downstream.
4. **Carousel Insert (Working)**:
   - `Map Carousel Fields (Keep Only Set)` → `id`, `user_id`, `title` (fallback to description/"Untitled Carousel"), `aspect` (1080x1350 → `4x5`, else `square`), `status = 'draft'`.
   - REST POST to `/rest/v1/carousel` with service-role key, `Prefer: return=representation`.
5. **Response Contract**: Workflow returns `{"carouselId":"<uuid>", ... }`. Bolt confirmed camelCase key works; 406 errors occur only if Supabase lacks the row yet.

## Media Insert Mapping (Designed, needs validation)
For each entry in `uploaded_files` (after split):
- `user_id` ← `Pass All Data.user_id`.
- `bucket` ← `$json.bucket`.
- `path` ← `$json.path` (e.g., `media/user_<uuid>/YYYY-MM-DD/file.ext`).
- `filename` ← `path.split('/').pop()` to satisfy constraint.
- `mime_type`, `size_bytes` pass through.
- `media_type` ← MIME prefix (`image` vs `video`).
- `visibility` ← `private`.
- `checksum_sha256` ← temporary surrogate `path` until actual hash arrives.
Targets `/rest/v1/media` POST with `Prefer: return=representation`; must capture each returned `media.id` for downstream slide creation.

## Downstream Targets (Pending)
- `carousel_slide` inserts referencing returned `media.id`, slide `position`, and optional overlays/text.
- `media_caption`, `brand_profile` upserts, derivative jobs, and posting logs follow once media writes are stable.

## /ingest Workflow Blueprint
- **Purpose**: Called by Bolt immediately after each upload.
- **Flow**: Webhook (POST `/ingest`) → validation function (auth + payload shape) → Postgres SELECT dedupe by `checksum_sha256` → IF branch; insert into `media` when not deduped → shape response `{ media_id, deduped, media }` → Webhook Response.
- **Testing**: Use Edit Fields node to emit canonical payloads (image + video variants) mirroring Bolt uploads.
- **Error Contracts**: 401 (auth), 422 (validation), 409 (checksum conflict), 500 (unexpected).

## Operational Tips
- Ensure service-role inserts finish before Bolt queries Supabase; otherwise expect empty 406 responses.
- Keep unique checksum enforcement in mind when multi-item uploads fire; one bad row previously blocked the batch.
- Path + filename constraints are already satisfied by the mapper shown above—do not alter without updating policies.
