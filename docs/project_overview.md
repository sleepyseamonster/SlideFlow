# Project Overview (Condensed)

## Mission
SlideFlow lets solo creators assemble Instagram carousel posts by combining uploaded or AI-generated media, stored brand assets, and saved captions. Users authenticate through Supabase, pay via Stripe, and manage private workspaces—no team sharing yet.

## MVP Scope
- **Accounts**: Supabase Auth (Google live; other providers later). One account per user.
- **Billing**: Stripe subscriptions (entry tier $9/mo) tied to Supabase users.
- **Media Intake**: Upload plus AI generation (FAL or similar) with assets stored in the `media` bucket.
- **Brand Assets**: Persist HEX colors/palettes now; fonts limited to presets until later.
- **Carousel Builder**: Core focus—compose ordered slides, decide export renditions, enforce slide-count cap (TBD).

## Stack Snapshot
- **Frontend**: Bolt app by Zach; handles UI, uploads to Supabase Storage, and calls n8n webhooks.
- **Automation Layer**: n8n workflows (hosted) for ingestion, carousel assembly, posting, etc.
- **Backend of Record**: Supabase Postgres + Storage with strict RLS per `user_id` and bucket policies.
- **Payments**: Stripe + Supabase; quotas derived from `usage_quota` table.

## Constraints & Assumptions
- Individual workspaces only; collaboration deferred.
- Brand colors stored as HEX (no HSL/accessibility tooling yet).
- Precise carousel export format, slide limit, and AI usage quotas still pending product call.

## Near-Term Roadmap
1. Ship `/ingest` workflow and carousel automation end-to-end (media → slides → derivatives).
2. Add curated font options + AI-assisted layout suggestions.
3. Build `/search` for media discovery with pagination + filters.
4. Explore direct Instagram publishing + richer pricing tiers.
5. Long-term: multi-user teams/workspaces once single-player experience is stable.
