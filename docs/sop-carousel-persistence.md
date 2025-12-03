# SOP: Carousel Persistence & Troubleshooting

Use this checklist to keep carousels consistent between Dashboard, SlideBoard, and Results.

## When creating a new carousel (Dashboard)
1. Insert `carousel` (`status: draft`, `aspect: square`, title “Untitled Carousel”).
2. Add to local carousel list (`addCarousel`) so it shows without refresh.
3. Set `currentCarousel`; navigate to SlideBoard with `state: { carousel }`.

## On SlideBoard load
1. If `carouselId` exists and local slides are empty, fetch from Supabase:
   - `carousel` row
   - `carousel_slide` ordered by `position`
   - `media` (and derivatives, optional), sign URLs for previews
2. Populate `previews`, `uploadedInfos`, `slideEntries`, and `currentCarousel.slides`.

## Uploading images on SlideBoard
1. Upload file to storage (user-namespaced path).
2. Insert `media` row (`is_library: true`).
3. Insert `carousel_slide` row `{ carousel_id, media_id, position }`.
4. Update local state and `currentCarousel`.

## Reordering slides
1. Update local order (previews/uploadedInfos/slideEntries).
2. Persist positions: update `position` for each `carousel_slide` with a `slideId`.

## Removing a slide
1. Clear local slot.
2. Delete `carousel_slide` for that slot (if present).
3. Delete `media` row (if path/bucket known).

## Generate (SlideBoard → Results)
1. Do **not** create a new carousel if `carouselId` exists.
2. Ensure every occupied slot has a `carousel_slide` row; insert missing ones.
3. Persist positions.
4. Navigate to Results with `state: { carouselId, carousel }`.

## Re-opening a carousel
1. From Dashboard card click, fetch carousel + slides, set `currentCarousel`, then navigate.
2. SlideBoard hydration restores slides without refresh.

## Troubleshooting
- Missing carousel on Dashboard until refresh: ensure `addCarousel` is called after insert, or run `refreshCarousels` on return.
- Blank SlideBoard after reopening: check hydration fetch; ensure `carouselId` is passed in nav state and `fetchCarouselWithSlides` returns signed URLs.
- Reorder not sticking: verify `carousel_slide.position` updates succeed and RLS allows updates (user_id = auth.uid()).
- Missing images on Results: confirm media rows exist and signed URLs succeed; fall back to `getPublicUrl` if signing fails (private bucket requires signing).
