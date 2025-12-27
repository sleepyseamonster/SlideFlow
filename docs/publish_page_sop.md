# Publish Page SOP (current state)

## Purpose
The Publish page is the last step before shipping a carousel. It receives the carousel (slides + caption) from Generate Caption, lets the user choose destinations and timing, shows a preview, and provides final actions (Publish/Go to calendar, Save draft).

## Non-negotiable publishing rule
Publishing must target **only** the destination account selected on the **Publish page** (and only the platform toggles selected there). Profile defaults are irrelevant beyond initial UI preselection. See `SlideFlow/docs/publishing_destination_sop.md`.

## Data inputs
- Navigation state: `carousel` (with `slides` + `originalMedia`), `caption`, `aspectRatio` passed from Generate Caption.
- Context: `currentCarousel` from `CarouselContext`; `user` from `AuthContext`.
- Local state:
  - `orderedSlides`: hydrated slides for preview.
  - `caption`: editable caption (prefilled from nav or carousel).
  - Destinations: `shareToInstagram`, `shareToFacebook` (at least one must remain selected).
  - AI disclosure: `isAiGenerated` toggle for content disclosure.
  - Timing: `scheduleMode` = `now | later`.
  - Next-button arming: `nextArmed` (armed by primary CTA when in “now” mode).
  - Draft modal: `showDraftModal`, `draftTitle`, `draftSaving`, `draftError`.
  - Platform guard message: `platformError`.
  - Weekly calendar: derived week (Sun–Sat) with today highlighted; past days disabled.

## UI behavior
- Preview: mirrors Generate (aspect, dots, arrows), rounded corners.
- Caption card: dark background, center placeholder when empty (“no caption”), height 10.5rem; counter bottom-right.
- Destinations: two buttons (Instagram/Facebook). Active state uses bright pacific blue. At least one must stay selected; attempting to deselect the last platform shows inline helper.
- AI-generated content toggle: switch to disclose AI-created or AI-edited content; when enabled, a disclosure line is appended to the caption and the flag is logged with the publish attempt.
- Timing:
  - Publish now / Schedule buttons share sizing with destinations; active is pacific blue.
  - If Schedule is selected, a mini 7-day calendar appears; past days are fully disabled; today highlighted; future days neutral.
  - When Schedule is active, the floating Next button is disabled; the primary CTA becomes a blue “Go to Calendar” link-button (navigates to `/calendar` when wired).
  - When Publish now is active, the primary CTA is the green “Ready?” button.
- Hint text (top-right): default “Hint: Click Publish to continue.” When Schedule is active: “Hint: To publish now, select Publish Now, then click Publish.”
- Next button (retro card top-right): enabled only when slides exist, a connected account is present, the CTA is armed, and timing is “now”. Arming happens via the primary CTA when ready.
- SlideFlow Studio CTA: navigates to `/studio` with `{ from: 'publish', carousel, caption }` so Studio can render slides and return here.

## Actions
- Primary CTA:
  - “Ready?” (green) when Publish now: enables when slides exist (caption not required). On click, arms the floating Next button and sets carousel `status` to `ready` in context; Supabase write updates `title/status` only.
  - “Go to Calendar” (blue) when Schedule: shows only in schedule mode and will navigate to `/calendar` when wired; Ready button is hidden in this mode.
- Publish button (retro top-right):
  - When enabled and clicked, calls `publish-carousel` with the Publish-page selected `connected_account.id`, selected platforms, ordered slides, and caption. On success, sets carousel `status='published'` and navigates back to the Dashboard.
  - If AI disclosure is enabled, `publish-carousel` appends an “AI-generated content.” line to the caption and logs `ai_generated` in `posting_log.meta_response`.

## AI disclosure pipeline (future-proofing)
This is a product-level compliance feature. Meta does not expose a documented boolean flag for organic Graph publishing at this time, so our pipeline treats the toggle as a disclosure + audit signal that we can evolve later.

Planned flow (no extra API params today):
1) UI toggle on Publish sets `is_ai_generated` on the publish payload.
2) Edge Function records the flag in `posting_log.meta_response` for auditing.
3) If enabled, append a short disclosure line to the caption before publish (current behavior).
4) If Meta introduces an official AI flag later, map the same toggle to that parameter.
5) If we add provenance metadata (C2PA/IPTC), the same toggle controls metadata injection before image upload.

Notes:
- The disclosure line is the only “flagging” mechanism we control today for organic posts.
- We should not send undocumented Graph parameters.
- Save draft:
  - Opens modal “Name your carousel” (required title).
  - On save: attempts slide-order upsert to `carousel_slide` (best-effort) and updates the `carousel` row with `title` and `status='draft'` scoped to the signed-in user, then navigates to `/dashboard` on success. Errors stay in the modal.
- Platform toggles: each toggle is allowed only if the other remains on (enforces at least one destination).

## Supabase interactions
- Slide persistence (best-effort): upsert `carousel_slide` with `user_id`, `carousel_id`, `position`, `media_id` derived from each slide’s `originalMedia.id`. Past-day-disabled calendar is purely UI; no slot write yet.
- Carousel update: `carousel` table update by `id` + `user_id` with `title` and `status` (draft or ready). Caption is currently **not** persisted because the DB schema lacks a `caption` column; caption stays client-side in context.
- `updateCarousel` in context writes `title/status` to Supabase and syncs local caption/status locally.
- Publish flow: `supabase/functions/publish-carousel` validates the user + selected `connected_account.id`, then publishes to Meta using that destination only.
  - The publish function prevents duplicates by checking `posting_log` + `carousel.status` and allows a manual retry after a failed attempt (only if no platform posted).
  - Each platform publish attempt is logged to `posting_log` with the attempt id, status, and Meta response/error.

## Known gaps / issues (2025-02-13)
- Save draft may still fail (“Update failed”) if the Supabase update or slide upsert is rejected (e.g., missing `originalMedia.id`, auth mismatch, RLS). Error is shown in the modal and navigation does not proceed. Backlog item added to harden this flow.
- Slide-order upsert is best-effort; failures don’t block the carousel update.
- Calendar selection currently UI-only; no scheduled slot is persisted from Publish.
- Caption edits are not written to the `carousel` table (no `caption` column); caption stays local.

## Quick troubleshooting
- If Save draft fails, inspect the modal message; check that `currentCarousel.id` is valid, user is authenticated, and slides carry `originalMedia.id` for upsert. Verify Supabase RLS allows the current user on `carousel` and `carousel_slide`.
- If the floating Next button stays disabled, ensure timing is set to Publish now and the primary CTA was clicked to arm it.
- If publish returns `publish_lock_failed` with a missing column error, confirm the column exists in the production DB and reload the PostgREST schema (`select pg_notify('pgrst','reload schema');`).
- If publish succeeds but the status update fails with `carousel_status_check`, update the constraint to allow `published` and retry the publish UI update.
- If publish fails with a 500 after schema changes, check Edge Function logs for the exact DB error and verify `posting_log` schema matches (`meta_response`, nullable `media_id`).
