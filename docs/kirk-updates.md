# SlideFlow — Kirk’s Update Log

Purpose: running, date-stamped notes for changes made locally after cloning the partner’s GitHub repo. Audience is internal engineering (you and partner + AI assistants). Keep it concise but specific enough to reconstruct what changed and why.

Location note: this file is part of the canonical docs set (it was previously parked in a review folder).

## Collaboration & Git hygiene
- Default workflow: create a feature branch (`git checkout -b kirk/<short-topic>`), commit locally, then open a PR into your partner’s main branch. Avoid force-push to main.
- If your partner prefers, you can fork the repo and PR back to their origin; same branching rules apply.
- Keep secrets out of commits; `.env` and `.env.local` stay untracked (already gitignored).

## Baseline (GitHub import)
- Source: https://github.com/zbabiarz/SlideFlow
- Cloned: 2025-11-25
- Commit at clone: `b2c41dd` (default branch)
- Notes: Supabase env vars were missing locally; media library persisted only in component state; no docs folder in repo.

## 2025-11-25
- Added environment files locally (`.env`, `.env.local`) with Supabase URL/anon key; `src/lib/supabase.ts` now guards missing env vars to prevent blank-screen errors.
- Fixed storage path to match RLS (`<userId>/<date>/...`); `Generator` uploads now auto-add uploaded files into the media library after Supabase upload.
- `MediaLibraryContext`: fetches existing storage objects from Supabase (handles both `<userId>/...` and legacy `user_<userId>/...`), signs URLs, dedupes, and removes from storage when deleted in UI.
- `ImportLibraryModal`: importing remote library items now fetches and rehydrates them as `File` objects; added select-all toggle (with slate styling) in the Media Library header.
- Created this log under `docs/kirk-updates.md` for ongoing updates.

## 2025-02-06
- Added Publish page flow: `/publish/:carouselId` route, navigation from Generate Caption “Click” CTA carrying caption/slides, and placeholder `/studio` route for future work.
- Publish UI: preview carousel (enlarged, square corners), caption box prefilled from Generate Caption (shorter height), destinations/timing controls, readiness block simplified to slides only, and SlideFlow Studio CTA card (now in right column footer).
- SlideFlow Studio placeholder page updated name to “SlideFlow Studio”; minor copy/styling alignments to match current palette.

## 2025-02-11
- Publish: restyled the SlideFlow Studio card (square badge, bullet grid, accurate capabilities copy, tighter footer), set Go to Studio/Publish buttons to dark default with bright hover glow, and reduced padding on the action row.
- Publish: refreshed Studio bullets (crop/resize presets, AI background swap/remove, on-brand overlays, export/save PNGs) and footer (“Slides and captions carry over”).
- Generate Caption: tightened Studio card spacing, downsized tagline weight/size, moved helper + Go to Studio CTA to the right, and added a spinner overlay to the disabled Next button while slides are loading.

## 2025-12-18
- Implemented Meta connection (Instagram Business + Facebook Page) via Supabase Auth (Facebook provider), a dedicated `/meta/callback` route, and a new `meta-connect` Supabase Edge Function.
- Added connected-account persistence in Supabase (`connected_account` + `connected_account_secret`) plus RPCs to set a single default destination and disconnect/revoke accounts.
- Profile page now supports multi-destination management: list destinations, set default, refresh, and disconnect; updated docs for setup and schema.

## 2025-12-20
- Meta connect hardened and simplified: canonical flow is server-side OAuth via `meta-oauth-start` + `meta-oauth-callback` (signed state, redirect-base validation, appsecret_proof).
- Callback runs with JWT verification disabled (config + deploy flag) to avoid Meta redirect 401s; frontend invoke sends the Supabase access token.
- Marked `meta-connect`/`/meta/callback` as legacy; docs updated to the new flow.

## How to extend this log
- Add new sections by date (`YYYY-MM-DD`) with bullets for changes, rationale, and any follow-up/TODOs.
- If you change collaboration workflow (branching, PR rules), append to the “Collaboration & Git hygiene” section rather than overwriting.
