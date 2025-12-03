# n8n Webhooks Catalog (Condensed)
_Base URL: https://sleepyseamonster.app.n8n.cloud/webhook/_

## Core Media
- **POST /ingest** — Notify backend that Supabase now holds a file; validates auth + dedupes; returns `{ media_id, deduped, media }`.
- **POST /derivatives** — Request derivative generation; body `{ media_id, types[] }`; returns derivative ids + paths.
- **POST /captions** — Persist user-entered caption `{ media_id, text, language, source:'user' }`; response `{ caption_id }`.
- **POST /captions/ai** — Ask AI to craft caption for `{ media_id, language, style }`; returns `{ caption_id, text }`.
- **POST /transcripts/queue** — Kick off speech-to-text job `{ media_id, provider }`; response includes `{ transcript_id, status }`.

## Discovery
- **GET /search** — Query media with filters (orientation, date range, tags, ids) + cursor pagination; e.g. `/search?orientation=vertical&from=2025-09-01&tags=promo&limit=24&cursor=`.

## Posting
- **POST /post/<platform>** — Submit carousel/media to Instagram (or other) with `{ media_ids[], required_derivative_types[], caption_id, account_id }`; responds `{ posting_log_id, status }`.

## Brand + Carousel
- **POST /brand_profile** — Create/update palette, fonts, defaults per user.
- **POST /carousel** — Create carousel container (`title`, `aspect`).
- **POST /carousel_slide** — Attach media to carousel positions.

## Quota & Logs
- **GET /usage_quota** — Return `total_bytes` + `total_files` from `usage_quota` table.
- **GET /posting_log** — List posting attempts + statuses for audit.
