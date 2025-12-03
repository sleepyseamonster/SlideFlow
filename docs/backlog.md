# Backlog

Working backlog for SlideFlow. Add new items as `- [ ]` entries and mark completed ones with `- [x]`.

Priority legend: P0 = urgent fix/blocker, P1 = high, P2 = medium, P3 = nice-to-have. Milestones: M1 Landing polish, M2 Dashboard/cards, M3 Slideboard UX, M4 Media/Brand, M5 Profile/Billing, M6 Publish page, M7 AI/Integrations. Default owner: Unassigned.

### High-priority breakdown (P1 items)
- Known issues to stabilize first: SlideBoard upload/persistence errors; Media Library bulk delete no-op; Media Library → SlideBoard multi-import clears slots.
- Landing copy/hero fixes [M1]: align scroll offset; tighten whitespace; swap hero subtitle; revise “How SlideFlow Works” copy; swap sample carousel images; refine pricing wording; enable drag-scroll for carousel wheel.
- Dashboard card UX [M2]: inline carousel preview + caption; fix inline title rename; add centered button row w/ Studio + Calendar; replace slide number label with dots; clean up description/copy/export/trash placement.
- Slideboard stability [M3]: rebuild drag-and-drop; reduce upload flicker w/ per-slide progress; lighten slots/drop zone; double-click to upload; hide helper text while uploading.
- Media Library capture [M4]: tabs/filters by type; double-click to open modal; save caption button on Generate page.
- Brand Profile presets [M4]: refresh styling; add preset save; wire presets into AI generation.
- Profile & billing [M5]: editable profile (name/email/settings) to Supabase; profile image upload; spacing fix for long names/emails; payment method update; cancel plan downgrade.
- Publish page polish [M6]: match preview card dimensions; retro “Publish” button (armed after primary); readiness panel review; update Studio card text; remove “Step Four” label.
- AI integration [M7]: Implement OpenAI API support.

## Landing Page & Marketing
- [ ] [P1][M1][Owner: Unassigned] Fix scroll offset for the “See How SlideFlow Works” button so it lands at the correct section.
- [ ] [P1][M1][Owner: Unassigned] Revise the “How SlideFlow Works” copy (current: “Slide Flow is the fastest way to create, organize, and publish Instagram carousels. Upload, arrange, caption, and publish without graphic design or image editing.”) for clarity and accuracy.
- [ ] [P1][M1][Owner: Unassigned] Update the hero subtitle text to “Upload. Arrange. Caption. Publish.”
- [ ] [P1][M1][Owner: Unassigned] Reduce white space in the example carousel section to tighten the layout.
- [ ] [P1][M1][Owner: Unassigned] Replace sample carousel images with real generated examples.
- [ ] [P1][M1][Owner: Unassigned] Enable horizontal drag scrolling for the carousel wheel.
- [ ] [P1][M1][Owner: Unassigned] Refine pricing chart wording for clarity.
- [ ] [P2][M1][Owner: Unassigned] Update landing page copy for the free trial offer and premium offer to ensure messaging is accurate.

## Dashboard & Carousel Cards
- [ ] [P1][M2][Owner: Unassigned] Align the dashboard button row (Calendar, Studio, Media Library, Brand Profile, Create New Carousel) in one centered row and add SlideFlow Studio and Content Calendar buttons with proper navigation.
- [ ] [P2][M2][Owner: Unassigned] Redesign the weekly view styling (calendar posting not yet implemented).
- [ ] [P1][M2][Owner: Unassigned] Replace carousel preview cards with an inline carousel that uses left/right arrows (or shows the first image) and displays the saved caption underneath; remove the existing top-right carousel label.
- [ ] [P2][M2][Owner: Unassigned] Replace the slide number label with Instagram-style dots to indicate slide count/current slide.
- [ ] [P1][M2][Owner: Unassigned] Fix inline renaming of carousel titles (double-click to edit and save reliably).
- [ ] [P2][M2][Owner: Unassigned] Remove the description field from carousel cards and stop using it in the UI/database.
- [ ] [P2][M2][Owner: Unassigned] Remove copy and export buttons from carousel cards.
- [ ] [P2][M2][Owner: Unassigned] Relocate the trash/delete icon on carousel cards while retaining functionality.
- [ ] [P3][M2][Owner: Unassigned] When Instagram posting is wired up, flip the carousel card draft flag to a “Published” state to mark it as eligible for time-saved stats.
- [ ] [P2][M2][Owner: Unassigned] Update the time-saved dashboard ticker to display hours and minutes and add 15 minutes for every carousel created and published; the ticker never decrements.
- [x] [P2][M2][Owner: Unassigned] Add a “Brand Profile” button alongside “Create New Carousel” and “Media Library” that opens the Brand Profile page for presets (style, color palettes, saved fonts).

## Slideboard (Carousel Editing)
- [ ] [P2][M3][Owner: Unassigned] Lighten drop zone and slide slot backgrounds.
- [ ] [P1][M3][Owner: Unassigned] Rebuild drag-and-drop interaction: the picked slide visually detaches; other slides stay still until hover; dropping on an occupied slot shifts slides left/right to the nearest open slot with smooth transitions.
- [ ] [P1][M3][Owner: Unassigned] Improve upload UX by reducing flicker during slide uploads and showing a per-slide progress bar.
- [ ] [P2][M3][Owner: Unassigned] Double-clicking any empty slot or the main drop zone opens the file picker (same as Add Files).
- [ ] [P2][M3][Owner: Unassigned] Hide helper text (“Hint: Add an image to continue.”) while a slide is uploading.

## Media Library
- [ ] [P2][M4][Owner: Unassigned] Double-clicking an image opens the same full-size modal used on SlideBoard.
- [ ] [P1][M4][Owner: Unassigned] Add tabs/filters for media types: images, videos, AI prompts/saved prompts, and saved captions.
- [ ] [P1][M4][Owner: Unassigned] Add a small “Save” button next to the media library button on the Generate page’s caption card that saves the current caption into the media library’s caption tab.

## Brand Profile
- [ ] [P2][M4][Owner: Unassigned] Refresh styling and design of the Brand Profile page.
- [ ] [P1][M4][Owner: Unassigned] Add a preset save feature for Brand Profile (style, color palettes, fonts).
- [ ] [P1][M4][Owner: Unassigned] Wire saved Brand Profile presets into the AI generation workflow.

## Profile & Billing
- [ ] [P1][M5][Owner: Unassigned] Enable editing user profile details (name, email, settings) and persist updates to Supabase.
- [ ] [P2][M5][Owner: Unassigned] Add profile image upload on the profile page.
- [ ] [P3][M5][Owner: Unassigned] Fix profile page left-side spacing so long names/emails fit cleanly.
- [ ] [P1][M5][Owner: Unassigned] Enable payment method update (Stripe).
- [ ] [P1][M5][Owner: Unassigned] Fix cancel plan logic to correctly downgrade to the free plan.

## Publish Page
- [ ] [P2][M6][Owner: Unassigned] Match the publish-page preview card dimensions to the generate-page preview card.
- [ ] [P2][M6][Owner: Unassigned] Add a retro-style top-right “Publish” button with bouncing arrow; keep it inactive until the primary publish action arms it.
- [ ] [P3][M6][Owner: Unassigned] Review and adjust the readiness panel on the publish card (final design/need).
- [ ] [P2][M6][Owner: Unassigned] Update text on the SlideFlow Studio card to “Editing background removal text overlays, AI-generated images, and advanced exports. Your slides and captions will carry over.”
- [ ] [P2][M6][Owner: Unassigned] Remove the “Step Four, Publish” label from the top-right of the page.

## AI & Integrations
- [ ] [P1][M7][Owner: Unassigned] Implement OpenAI API support for AI generations.

## UI Polish
- [ ] [P2][M3][Owner: Unassigned] Change the font size and color of helper text in the prompt generation textbox and the caption textbox; refresh helper-text styling overall.

## Known Issues (stabilization)
- [ ] [P1][M3][Owner: Unassigned] SlideBoard persistence & carousel creation: uploads go to Supabase Storage/`media` with `is_library=true` but failures only surface per-slot; missing auth leaves slots empty. “Next Step” still calls `create-carousel` and navigates even on Edge Function errors; block navigation on errors and surface structured messages. Pending uploads block “Next Step” but reordering is allowed, so metadata ordering can drift if slot index is used later.
- [ ] [P2][M2][Owner: Unassigned] Results image hydration depends on `originalMedia.bucket/path`; reopening fails if those fields are missing. Signed URLs expire after 1 hour and are not refreshed. Add timed refresh and handle missing `originalMedia`.
- [ ] [P3][M2][Owner: Unassigned] Dashboard prefetch is best-effort; navigation proceeds silently on prefetch failure. Add visible error handling or retry before routing.
- [ ] [P1][M4][Owner: Unassigned] Media Library bulk delete button is a no-op (no confirm/removal) though single-item delete works. Instrument `handleBulkDelete`, verify button visibility when `selectedImages.size > 0`, and ensure selection state survives filters/search.
- [ ] [P1][M3][Owner: Unassigned] Media Library → SlideBoard multi-import: multiple images briefly appear then clear; only single import works. Instrument `handleImportFromLibrary` in `SlideBoard.tsx`, watch `pendingSlots/uploadedInfos/previews`, and ensure placement loop isn’t overwritten by hydration effects.
- [ ] [P2][M2][Owner: Unassigned] Lint debt: ~53 errors (`npm run lint -- --quiet`). Includes unused imports/vars, `any` usage, minor regex escape issues. Requires cleanup pass to get lint green.
