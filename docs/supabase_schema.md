# Supabase Schema & Policies (Condensed)

## Lookup Foundation
- Extensions: `citext`, `pgcrypto`.
- Enums: `visibility` (`private|unlisted|public`).
- Lookup tables: `derivative_type` (code/kind/targets), `caption_source`, `transcript_status`.
- Seed data ensures common derivative codes plus caption/transcript statuses exist.
- Storage bucket: `media` (private).

## Core Tables (key columns only)
- **media**: `id`, `user_id`, `bucket`, `path`, `filename`, `display_name`, generated `ext` + `orientation`, `mime_type`, `size_bytes`, `checksum_sha256`, optional width/height/duration/fps/codecs, `media_type` enum, `visibility`, timestamps; unique `(user_id, checksum_sha256)`.
- **media_derivative**: `media_id`, `type_code`, derivative path metadata, optional `transform`; unique `(media_id, type_code)`.
- **media_caption**: `media_id`, `text`, `language`, `source_code`, timestamps; unique `(media_id, language, source_code)`.
- **media_transcript**: `media_id`, `transcript_path`, `language`, `provider`, `status` enum, timestamps.
- **media_library_caption**: `id`, `user_id`, `text`, timestamps (saved caption snippets).
- **media_library_prompt**: `id`, `user_id`, `text`, timestamps (saved prompt snippets).
- **tag** + **media_tag**: user-scoped tags via `citext` name; join table keyed on `(media_id, tag_id)`.
- **usage_quota**: running totals per user (`total_bytes`, `total_files`).
- **posting_log**: outbound publishing attempts w/ `platform`, `status`, `meta_response` JSON, `error_message`, `attempt_id`, timestamps.
- **connected_account**: user-linked publishing destinations (`platform`, `ig_user_id`, `ig_username`, `page_id`, `page_name`, `is_primary`, timestamps); unique `(user_id, platform, ig_user_id)`.
- **connected_account_secret**: token storage for connected accounts (`page_access_token` (token used for Graph publishing; may be a Page token or long-lived user token), optional `user_access_token`, expiry); service-role only.
- **brand_profile**: `name`, `palette`, `fonts`, `logo_path`, `defaults` JSON.
- **carousel**: `title`, `aspect (square|4x5|9x16)`, `status (draft|ready|published)`, `scheduled_at`, `posting_status (draft|scheduled|posted|failed)` (used for scheduling only), `publish_attempt_id`, `publish_started_at`, `publish_completed_at`, `publish_error`, optional `caption_id`.
- **carousel_slide**: `position`, `media_id`, `type_code`, `overlay`, `text` JSON per slide.

## Storage Rules & Constraints
- `bucket` fixed to `media`; triggers enforce immutability on `bucket`, `path`, `filename` once set.
- `path` constraint (and storage policies) allow either `<uuid>/…` or `user_<uuid>/…` prefixes, with `filename = last(path)`.
- Storage RLS ensures `storage.objects` bucket paths start with either `<uuid>` or `user_<uuid>` matching `auth.uid()`.

## RLS Overview
- Every table enforces `user_id = auth.uid()` for `select/insert/update/delete` (service role bypass only inside n8n).
- `media_tag` enforces matching ownership on both `media` and `tag` rows.
- Derivative/caption/transcript tables reference `media.user_id` and cascade deletes.
- `connected_account` is user-scoped (authenticated users can list/modify their own).
- `connected_account_secret` is service-role only (tokens are not readable from the client).

## Functions & Triggers
- `set_updated_at()` keeps `updated_at` fresh on update for most tables.
- Media quota triggers (`media_quota_after_insert/update/delete`) adjust `usage_quota` counters automatically.
- Immutability helpers block changes to storage identity fields without explicit intent.
- RPC helpers:
  - `set_connected_account_primary(account_id uuid)` — set the user’s default destination.
  - `revoke_connected_account(account_id uuid)` — disconnect a destination and delete its secrets.

## Operational Notes
- All inserts must supply accurate `size_bytes` and `media_type` (`image|video`).
- Use `checksum_sha256` for dedupe; temporary surrogate (`path`) acceptable only until Bolt provides hash.
- Service-role inserts should respect constraints before writing derivative/caption data to avoid cascading failures.
- Publish flow currently uses `posting_log` + `carousel.status` to prevent duplicates; `publish_*` columns are reserved for future audit use and may be null.
