# TODO (Single Source of Truth)

This is the canonical work tracker for SlideFlow.

- Use `- [ ]` for open items and `- [x]` for completed.
- Link to context in `progress_log.md` when needed.
- If something is a user-facing broken behavior, add it to **Known Issues (triage log)** first, then track the fix as a checkbox item.

Priority legend: P0 = urgent/blocker, P1 = high, P2 = medium, P3 = nice-to-have.  
Milestones: M1 Landing polish, M2 Dashboard/cards, M3 SlideBoard UX, M4 Media/Brand, M5 Profile/Billing, M6 Publish page, M7 AI/Integrations.

## At-a-glance priorities (P1 focus)
- Stabilize critical bugs: Media Library → SlideBoard multi-import; Publish draft-save failures; caption persistence gap.
- Landing polish: hero/scroll offset, subtitle + “How SlideFlow Works” copy, sample carousel assets, pricing clarity, drag-scroll for carousel wheel.
- Dashboard usability: publish wiring, cleanup of card metadata, and time-saved ticker accuracy.
- SlideBoard stability: rebuild drag/drop, per-slide upload feedback, lighter slots, hide helper text while uploading.
- Profile/Billing + brand presets: payment/cancel flows and wiring brand presets into AI generation.

## Known Issues (triage log)

Last reviewed: 2025-12-27

Legend: P1 = high, P2 = medium, P3 = low. Workarounds and next steps noted where known.

### P1 (High)

- **SlideBoard breaks after returning from Generate (reorder no-op + “no carousel”)**  
  - Repro: Create a new carousel, add slides in SlideBoard, Continue to Generate, wait for all uploads to finish, then click “Back to Slideboard.” On SlideBoard, drag/drop does nothing, Continue shows “No slides found / Create a new carousel.”  
  - Console: `blob:* net::ERR_FILE_NOT_FOUND`, Supabase storage `net::ERR_FAILED`, `StorageUnknownError: Failed to fetch` during `persistDraftSlidesToSupabase`.  
  - Impact: users cannot rearrange after returning; navigation forward breaks.  
  - Urgency: **major/urgent**, blocks core workflow.

- **Media Library bulk delete fixed (custom confirmation)**  
  - Implemented a custom confirmation modal for bulk delete; deletes now remove selected items and purge the user’s Supabase storage + `media` rows. State refreshes for Media Library + Studio tabs.  
  - Status: resolved; keep an eye on multi-import separately.

- **Media Library → SlideBoard multi-import clears slots**  
  - Importing multiple images briefly shows them, then they disappear; single import is reliable. No instrumentation yet.  
  - Next steps: instrument `handleImportFromLibrary` in `SlideBoard.tsx`, watch `pendingSlots/uploadedInfos/previews` during multi-import, and ensure placement isn’t immediately overwritten by hydration effects. Add a focused test to simulate multi-image import.

- **Publish draft save fails**  
  - Supabase update returns null/“Update failed”; slide-order upsert may miss the user id; modal errors show but no row is written.  
  - Next steps: ensure draft save writes title/caption/status and slide order for the active carousel id with authenticated user, then navigates to Dashboard only on success; surface structured errors otherwise.

- **Publish page blank after draft failure**  
  - After a failed draft save, the Publish page can render white/blank.  
  - Next steps: guard all Supabase calls, keep rendering even on errors, and show surfaced errors instead of throwing.

- **Caption not persisted (missing DB column)**  
  - `carousel` table lacks a `caption` column; Publish/`updateCarousel` only write title/status. Caption edits stay client-side and are lost on reload.  
  - Workaround: copy/paste caption elsewhere before reload.  
  - Next steps: add a caption column (or equivalent) and wire server/client updates.

- **Calendar scheduled time mismatch**  
  - Scheduled time shown on calendar tiles can differ from modal selection (e.g., select 6:00 PM, tile shows 1:00 AM / 5-hour offset). Suspected local→UTC conversion (`toUtcISOString`) combined with display timezone formatting.  
  - Workaround: verify tile time after scheduling; rescheduling works but may show shifted time.  
  - Next steps: enforce a single conversion path (local → UTC) and consistent render path (UTC → local) using the same IANA timezone.

### P2 (Medium)

- **Results image hydration depends on `originalMedia`**  
  - Re-signs URLs only when `originalMedia.bucket/path` is present; missing fields yield blank images after reopening. Signed URLs expire after ~1 hour; no timed refresh, only one-time hydration.

- **Dashboard duplicate action fails**  
  - Clicking “Duplicate” can alert “Could not duplicate this carousel right now. Please try again.” Likely Supabase insert/permissions or missing schema support during deep copy.  
  - Workaround: manually create a new carousel and copy content until fixed.

- **Meta connect shows unexpected IG/Page pairs**  
  - Meta consent can return multiple Pages/IGs and the UI may display assets the user didn’t intend. Users must click “Edit access” in the Meta consent screen and explicitly pick the desired Page + IG; otherwise all returned assets are stored. Debug info is available via the Profile error `reason` code and Edge Function logs (`meta-oauth-callback`).

- **Meta disconnect RPC failures**  
  - `revoke_connected_account` previously threw 400/ambiguous errors (`account_id` name collision) and later cache misses after parameter rename. Apply migration `20251218000004_fix_revoke_connected_account.sql` (restores the `account_id` parameter name and qualifies columns) to fix the RPC; redeploy if the RPC was cached.

- **Lint debt (~53 errors)**  
  - `npm run lint -- --quiet` reports unused imports/vars, `any` usage, and regex escape issues. Examples:  
    - Unused imports/vars: `src/App.tsx` (`useState`, `useEffect`), `src/pages/MediaLibrary.tsx` (`Filter`, `clearLibrary`, `ext`), `src/pages/Billing.tsx` (`DollarSign`), `src/pages/Profile.tsx` (`err`), `src/pages/LoginPage.tsx`/`SignupPage.tsx` (`err`), `src/pages/CreateCarousel.tsx` (`ext`), `src/pages/LandingPage.tsx` (`ArrowRight`, `useCases`, `features`), `src/pages/SlideBoard.tsx` (`ASPECT`, `captionPrompt`, `ext`, `handlePromptChange`), etc.  
    - `any` usage: `src/contexts/CarouselContext.tsx`, `src/lib/database.ts`, `src/lib/n8n.ts`, `src/lib/stripe.ts`, `src/lib/instagram.ts`, `supabase/functions/n8n-proxy/index.ts`, `src/pages/CreateCarousel.tsx`, `src/pages/SlideBoard.tsx` (create-carousel invoke), `src/pages/Results.tsx` (location state).  
    - Regex/escape issues: unnecessary escape in filename sanitizer (`src/pages/CreateCarousel.tsx`, similar in `src/pages/MediaLibrary.tsx`).  
  - These errors predate current changes; needs a cleanup pass.

### P3 (Low)

- **Dashboard prefetch is best-effort**  
  - Dashboard routes to Results even if prefetch fails (network/permission); users see no error. Needs visible error handling or retry before routing.

### Resolved / Historical

- **SlideBoard persistence + carousel creation**  
  - Issue: SlideBoard uploaded directly to Supabase with `is_library=true`; failures surfaced per-slot; Next called `create-carousel` even on errors; pending uploads allowed reorder, risking drift.  
  - Resolution: SlideBoard is now local-only; all persistence (`media` + `carousel_slide`) moved to Generate Caption via `slideDrafts`; Next reuses the existing carousel id. Global writes no longer occur from SlideBoard.

## Open backlog (by area)

### Landing Page & Marketing
- [ ] [P1][M1] Fix scroll offset for the “See How SlideFlow Works” button so it lands at the correct section.
- [ ] [P1][M1] Revise the “How SlideFlow Works” copy (current: “Slide Flow is the fastest way to create, organize, and publish Instagram carousels. Upload, arrange, caption, and publish without graphic design or image editing.”) for clarity and accuracy.
- [ ] [P1][M1] Update the hero subtitle text to “Upload. Arrange. Caption. Publish.”
- [ ] [P1][M1] Reduce white space in the example carousel section to tighten the layout.
- [ ] [P1][M1] Replace sample carousel images with real generated examples.
- [ ] [P1][M1] Enable horizontal drag scrolling for the carousel wheel.
- [ ] [P1][M1] Refine pricing chart wording for clarity.
- [ ] [P2][M1] Update landing page copy for the free trial offer and premium offer to ensure messaging is accurate.

### Dashboard & Carousel Cards
- [x] [P1][M2] Align the dashboard button row (Calendar, Studio, Media Library, Brand Profile, Create New Carousel) in one centered row and add SlideFlow Studio and Content Calendar buttons with proper navigation.
- [ ] [P2][M2] Redesign the weekly view styling (calendar posting not yet implemented).
- [x] [P2][M2] Replace the slide number label with Instagram-style dots to indicate slide count/current slide.
- [x] [P1][M2] Fix inline renaming of carousel titles (double-click to edit and save reliably).
- [x] [P2][M2] Remove the description field from carousel cards and stop using it in the UI/database.
- [ ] [P2][M2] Wire the dashboard “Publish” button on carousel cards to the posting workflow (currently UI-only).
- [x] [P3][M2] When Instagram posting is wired up, flip the carousel card draft flag to a “Published” state to mark it as eligible for time-saved stats.
- [ ] [P2][M2] Update the time-saved dashboard ticker to display hours and minutes and add 15 minutes for every carousel created and published; the ticker never decrements.

### SlideBoard (Carousel Editing)
- [ ] [P2][M3] Lighten drop zone and slide slot backgrounds.
- [ ] [P1][M3] Rebuild drag-and-drop interaction: the picked slide visually detaches; other slides stay still until hover; dropping on an occupied slot shifts slides left/right to the nearest open slot with smooth transitions.
- [ ] [P1][M3] Improve upload UX by reducing flicker during slide uploads and showing a per-slide progress bar.
- [x] [P2][M3] Double-clicking any empty slot or the main drop zone opens the file picker (same as Add Files).
- [ ] [P2][M3] Hide helper text (“Hint: Add an image to continue.”) while a slide is uploading.

### Media Library
- [x] [P2][M4] Double-clicking an image opens the same full-size modal used on SlideBoard.
- [ ] [P1][M4] Add tabs/filters for media types: images, videos, AI prompts/saved prompts, and saved captions.
- [x] [P1][M4] Add a small “Save” button next to the media library button on the Generate page’s caption card that saves the current caption into the media library’s caption tab.

### Brand Profile
- [x] [P2][M4] Refresh styling and design of the Brand Profile page.
- [x] [P1][M4] Add a preset save feature for Brand Profile (style, color palettes, fonts).
- [ ] [P1][M4] Wire saved Brand Profile presets into the AI generation workflow.

### Profile & Billing
- [x] [P1][M5] Enable editing user profile details (name, email, settings) and persist updates to Supabase.
- [ ] [P2][M5] Add profile image upload on the profile page.
- [ ] [P3][M5] Fix profile page left-side spacing so long names/emails fit cleanly.
- [ ] [P1][M5] Enable payment method update (Stripe).
- [ ] [P1][M5] Fix cancel plan logic to correctly downgrade to the free plan.

### Publish Page
- [ ] [P2][M6] Add a retro-style top-right “Publish” button with bouncing arrow; keep it inactive until the primary publish action arms it.
- [ ] [P3][M6] Review and adjust the readiness panel on the publish card (final design/need).
- [x] [P2][M6] Remove the “Step Four, Publish” label from the top-right of the page.
- [x] [P1][M6] Add destination selector on Publish (choose which connected Meta destination to post to; default preselected).
- [x] [P1][M6] Implement Meta publishing in code (Supabase Edge Function) using `connected_account` + secrets (no n8n).

### AI & Integrations
- [ ] [P1][M7] Implement OpenAI API support for AI generations.

### UI Polish
- [ ] [P2][M3] Change the font size and color of helper text in the prompt generation textbox and the caption textbox; refresh helper-text styling overall.

### Stabilization work items (derived from Known Issues)
- [ ] [P2][M2] Results image hydration depends on `originalMedia.bucket/path`; reopening fails if those fields are missing. Signed URLs expire after 1 hour and are not refreshed. Add timed refresh and handle missing `originalMedia`.
- [ ] [P3][M2] Dashboard prefetch is best-effort; navigation proceeds silently on prefetch failure. Add visible error handling or retry before routing.
- [x] [P1][M4] Media Library bulk delete: added custom confirmation modal; deletes remove user-owned storage objects and media rows, refreshes library/studio, and clears selection.
- [ ] [P1][M3] Media Library → SlideBoard multi-import: multiple images briefly appear then clear; only single import works. Instrument `handleImportFromLibrary` in `SlideBoard.tsx`, watch `pendingSlots/uploadedInfos/previews`, and ensure placement loop isn’t overwritten by hydration effects.
- [ ] [P2][M2] Lint debt: ~53 errors (`npm run lint -- --quiet`), including unused imports/vars, `any` usage, and minor regex escape issues. Needs cleanup pass to get lint green.
- [ ] [P1][M6] Publish “Save draft” flow fails to persist: Supabase update returns null/`Update failed`, slide order upsert may not run with correct user id, and modal errors surface but no row is written. Ensure draft save writes title/caption/status and slide order for the active carousel id with authenticated user, then navigates to Dashboard without blank screens.
- [ ] [P1][M6] Publish page sometimes renders blank (white screen) after draft save failure. Guard all Supabase calls, surface errors without throwing, and ensure the page renders even if persistence fails.
- [ ] [P1][M6] Add a `caption` column (or equivalent) to `carousel` and persist caption edits; currently caption is client-only because the table lacks the column.

## Completed (reference)

### Dashboard & Carousel Cards
- [x] [P1][M2] Replace carousel preview cards with an inline carousel that uses left/right arrows (or shows the first image) and displays the saved caption underneath; removed the top-right carousel label.
- [x] [P2][M2] Remove copy and export buttons from carousel cards; replaced copy with a Duplicate action that clones the carousel (draft) and appends “copy” to the title; kept only trash + duplicate visible.
- [x] [P2][M2] Relocate the trash/delete icon on carousel cards while retaining functionality.
- [x] [P2][M2] Add a “Brand Profile” button alongside “Create New Carousel” and “Media Library” that opens the Brand Profile page for presets (style, color palettes, saved fonts).

### Publish Page
- [x] [P2][M6] Match the publish-page preview card dimensions to the generate-page preview card (synced aspect ratios/arrows with Generate).
- [x] [P2][M6] Update the SlideFlow Studio card copy/layout on Publish to reflect current capabilities (crop/resize, AI background swap/remove, on-brand overlays, PNG export) and align CTA styling.

### Profile & Billing
- [x] [P2][M5] Implement Meta connection (Instagram Business + Facebook Page) with multi-destination support, default selection, and disconnect.

### UI Polish
- [x] [P2][M3] Generate/Publish preview polish: added IG aspect selector (4:5 default, 1:1), Instagram-style dots, resized previews, and matching arrow placement; Publish now mirrors Generate aspect choice.
- [x] [P2][M4] Generate/Caption UX polish: added double-click expanded editor modal for prompt/caption, caption 2200-char limit + counter, Sparkles tooltip, Save Prompt/Save Caption + Media Library teal buttons, aligned helper text/copy, and adjustable Studio CTA active/inactive states.
- [x] [P2][M3] Generate page polish: tightened Studio card spacing/copy, right-aligned helper + CTA, and added a disabled-state spinner on Next while slides load; Publish/Studio buttons now use dark default + glowing hover with reduced padding.

### Known Issues (resolved)
- [x] [P1][M3] SlideBoard persistence & carousel creation: uploads previously wrote to Supabase from SlideBoard and navigated even on Edge Function errors. Resolved by making SlideBoard local-only, moving all persistence (`media` + `carousel_slide`) into Generate Caption via `slideDrafts`, and reusing the existing carousel id instead of creating a new one.
