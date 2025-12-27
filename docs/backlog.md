# Backlog

Working backlog for SlideFlow. Add new items as `- [ ]` and mark completed ones with `- [x]`. Default owner: Unassigned.

Priority legend: P0 = urgent/blocker, P1 = high, P2 = medium, P3 = nice-to-have. Milestones: M1 Landing polish, M2 Dashboard/cards, M3 SlideBoard UX, M4 Media/Brand, M5 Profile/Billing, M6 Publish page, M7 AI/Integrations.

## At-a-glance priorities (P1 focus)
- Stabilize critical bugs: Media Library bulk delete; Media Library → SlideBoard multi-import; Publish draft-save failures; caption persistence gap.
- Landing polish: hero/scroll offset, subtitle + “How SlideFlow Works” copy, sample carousel assets, pricing clarity, drag-scroll for carousel wheel.
- Dashboard usability: centered action row, inline title rename, slide-count dots, publish wiring, cleanup of card metadata.
- SlideBoard stability: rebuild drag/drop, per-slide upload feedback, lighter slots, double-click to upload, hide helper text while uploading.
- Profile/Billing + brand presets: editable profile, payment/cancel flows, preset save + AI integration.

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
- [ ] [P1][M2] Align the dashboard button row (Calendar, Studio, Media Library, Brand Profile, Create New Carousel) in one centered row and add SlideFlow Studio and Content Calendar buttons with proper navigation.
- [ ] [P2][M2] Redesign the weekly view styling (calendar posting not yet implemented).
- [ ] [P2][M2] Replace the slide number label with Instagram-style dots to indicate slide count/current slide.
- [ ] [P1][M2] Fix inline renaming of carousel titles (double-click to edit and save reliably).
- [ ] [P2][M2] Remove the description field from carousel cards and stop using it in the UI/database.
- [ ] [P2][M2] Wire the dashboard “Publish” button on carousel cards to the posting workflow (currently UI-only).
- [ ] [P3][M2] When Instagram posting is wired up, flip the carousel card draft flag to a “Published” state to mark it as eligible for time-saved stats.
- [ ] [P2][M2] Update the time-saved dashboard ticker to display hours and minutes and add 15 minutes for every carousel created and published; the ticker never decrements.

### SlideBoard (Carousel Editing)
- [ ] [P2][M3] Lighten drop zone and slide slot backgrounds.
- [ ] [P1][M3] Rebuild drag-and-drop interaction: the picked slide visually detaches; other slides stay still until hover; dropping on an occupied slot shifts slides left/right to the nearest open slot with smooth transitions.
- [ ] [P1][M3] Improve upload UX by reducing flicker during slide uploads and showing a per-slide progress bar.
- [ ] [P2][M3] Double-clicking any empty slot or the main drop zone opens the file picker (same as Add Files).
- [ ] [P2][M3] Hide helper text (“Hint: Add an image to continue.”) while a slide is uploading.

### Media Library
- [ ] [P2][M4] Double-clicking an image opens the same full-size modal used on SlideBoard.
- [ ] [P1][M4] Add tabs/filters for media types: images, videos, AI prompts/saved prompts, and saved captions.
- [ ] [P1][M4] Add a small “Save” button next to the media library button on the Generate page’s caption card that saves the current caption into the media library’s caption tab.

### Brand Profile
- [ ] [P2][M4] Refresh styling and design of the Brand Profile page.
- [ ] [P1][M4] Add a preset save feature for Brand Profile (style, color palettes, fonts).
- [ ] [P1][M4] Wire saved Brand Profile presets into the AI generation workflow.

### Profile & Billing
- [ ] [P1][M5] Enable editing user profile details (name, email, settings) and persist updates to Supabase.
- [ ] [P2][M5] Add profile image upload on the profile page.
- [ ] [P3][M5] Fix profile page left-side spacing so long names/emails fit cleanly.
- [ ] [P1][M5] Enable payment method update (Stripe).
- [ ] [P1][M5] Fix cancel plan logic to correctly downgrade to the free plan.

### Publish Page
- [ ] [P2][M6] Add a retro-style top-right “Publish” button with bouncing arrow; keep it inactive until the primary publish action arms it.
- [ ] [P3][M6] Review and adjust the readiness panel on the publish card (final design/need).
- [ ] [P2][M6] Remove the “Step Four, Publish” label from the top-right of the page.
- [ ] [P1][M6] Add destination selector on Publish (choose which connected Meta destination to post to; default preselected).
- [ ] [P1][M6] Implement Meta publishing in code (Supabase Edge Function) using `connected_account` + secrets (no n8n).

### AI & Integrations
- [ ] [P1][M7] Implement OpenAI API support for AI generations.

### UI Polish
- [ ] [P2][M3] Change the font size and color of helper text in the prompt generation textbox and the caption textbox; refresh helper-text styling overall.

### Known Issues / Stabilization (open)
- [ ] [P2][M2] Results image hydration depends on `originalMedia.bucket/path`; reopening fails if those fields are missing. Signed URLs expire after 1 hour and are not refreshed. Add timed refresh and handle missing `originalMedia`.
- [ ] [P3][M2] Dashboard prefetch is best-effort; navigation proceeds silently on prefetch failure. Add visible error handling or retry before routing.
- [ ] [P1][M4] Media Library bulk delete button is a no-op (no confirm/removal) though single-item delete works. Instrument `handleBulkDelete`, verify button visibility when `selectedImages.size > 0`, and ensure selection state survives filters/search.
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
