# Progress Log

## 2025-02-03
- Wired Dashboard “Create New Carousel” to insert a draft carousel, add it to the local list, set `currentCarousel`, and navigate to SlideBoard immediately.
- SlideBoard now hydrates existing carousels from Supabase (`carousel_slide` + `media`), restoring previews/order without a refresh.
- Uploads on SlideBoard persist to Supabase: insert `media` (`is_library: true`) then `carousel_slide` for the slot; local state and `currentCarousel` stay in sync.
- Reordering slides now updates `carousel_slide.position`; deletions remove slide/media rows.
- Generate reuses the existing carousel id instead of creating a new one; ensures slide rows/positions exist before navigating to Results.
- Added documentation: `docs/carousel-flow.md` (end-to-end flow) and `docs/sop-carousel-persistence.md` (SOP/troubleshooting).

## 2025-02-04
- SlideBoard “Slide” button restyled with provided active/deactivated assets, persistent shadow, hover shift right, resized arrow, larger label, and hint text when inactive; position nudged down for alignment.
- Results page “Review” button now mirrors SlideBoard styling (active/disabled images, shadow, hint on inactive, arrow stays aligned) with placeholder navigation for the future review page.
- Added “Generate” button to the prompt card on Results: disabled until prompt has text; clicking currently copies the prompt text into the caption as a pre-AI placeholder.
- Media Library bulk delete flow updated to refresh session, await deletes, show deleting state; documented persistent bulk-delete failure and multi-import-to-SlideBoard issue in `docs/known_issues.md`.
- Updated static assets with latest `Next Button.png` and `Deactivated Next Button.png`.

## 2025-02-05
- Added Brand Profile CTA on Dashboard and built the Brand Profile page shell with style/palette/font controls; added “Back to Dashboard” header link to match Media Library.
- Renamed Results to Generate Caption: route path now `/generate-caption/:carouselId`, component/file renamed, and legacy `/results/:carouselId` redirects preserved.
- Updated active slide CTA label on SlideBoard and Generate Caption to read “Click”; refreshed the deactivated slide button asset per latest provided image.
- Replaced the app logo asset with the updated retro logo file; refreshed again with the latest provided versions.

## 2025-02-06
- Built the new Publish page and wired navigation from Generate Caption “Click” CTA, passing caption + slides; added `/publish/:carouselId` route and a future `/studio` placeholder.
- Publish page includes preview carousel, caption handoff box, readiness checklist (slides only), destinations/timing controls, and SlideFlow Studio CTA card.
- Preview on Publish is slightly larger with square corners; caption textarea height tightened; SlideFlow Studio card repositioned to right column footer; readiness list trimmed per latest request.

## 2025-02-07
- SlideBoard: reverted to visual-first slots (no Supabase during editing), fixed drag/drop (drop-only moves, shift-on-occupied, blob previews maintained), and enabled Next CTA based on any local image. Added forced upload of pending files on save to avoid “add an image” false alerts.
- Removed Supabase polling/refresh loops on SlideBoard and Dashboard that were causing infinite network requests and flicker; Dashboard no longer eager-fetches slides for every carousel.
- Adjusted SlideBoard CTA/header visuals: accent clipped within card, CTA/hint/arrow float above without clipping; cleaned slot rendering to avoid “Preview unavailable” for local files.
- Dashboard create buttons: both create a draft carousel in Supabase, set currentCarousel, and navigate straight to SlideBoard with the new ID.
