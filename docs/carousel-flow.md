# Carousel Creation & Persistence Flow

This document describes how a carousel is created, hydrated, and persisted across Dashboard → SlideBoard → Results.

## Overview
- **Dashboard “Create New Carousel”**: Inserts a draft `carousel` row (no slides), adds it to local state, sets it as `currentCarousel`, and navigates to SlideBoard with the new id.
- **SlideBoard hydration**: If a `carouselId` exists (from nav state or context) and local slides are empty, fetch `carousel_slide` + `media`, sign URLs, and populate previews/slots.
- **Uploads on SlideBoard**: Each file upload writes to Supabase storage, inserts a `media` row (`is_library: true`), then inserts a `carousel_slide` row with position and `media_id`. Local state and `currentCarousel` are updated immediately.
- **Reorder**: Dragging updates local order and persists positions to `carousel_slide`.
- **Generate**: Reuses the existing `carouselId`; ensures slide rows exist and positions are persisted, then navigates to Results without creating a new carousel.
- **Re-open from Dashboard**: Selecting a carousel fetches slides from Supabase so the storyboard is restored without a page refresh.

## Data Model (relevant tables)
- `carousel`: `id (uuid)`, `user_id`, `title`, `aspect (square|4x5|9x16)`, `status (draft|ready|posted)`, `caption_id`, timestamps.
- `carousel_slide`: `id (uuid)`, `user_id`, `carousel_id`, `position (int)`, `media_id`, `type_code (nullable)`, `overlay (jsonb, nullable)`, `text (jsonb, nullable)`, timestamps.
- `media`: `id (uuid)`, `user_id`, `bucket`, `path`, `filename`, `mime_type`, `size_bytes`, `media_type (image|video)`, `visibility`, `is_library`, plus optional metadata (width/height, codecs, etc.).

## Lifecycle Details
1) **Create (Dashboard)**
   - Insert `carousel` with `status: draft`, `aspect: square`, title “Untitled Carousel”.
   - Add to local carousel list; set `currentCarousel`; navigate to SlideBoard with `state: { carousel }`.

2) **Hydrate (SlideBoard load)**
   - If `carouselId` exists and local slides are empty, call `fetchCarouselWithSlides` (Supabase):
     - Fetch `carousel`.
     - Fetch `carousel_slide` ordered by `position`.
     - For each slide, fetch `media` (and optionally `media_derivative`), sign URL, map to preview.
   - Populate:
     - `previews` (signed URLs)
     - `uploadedInfos` (media metadata)
     - `slideEntries` (slideId/mediaId pairs)
     - `currentCarousel.slides`

3) **Upload (SlideBoard)**
   - Store file in storage (`media` bucket, user-namespaced path).
   - Insert `media` row with `is_library: true`.
   - Insert `carousel_slide` with `{ user_id, carousel_id, position: slotIndex+1, media_id }`.
   - Update local previews, uploadedInfos, slideEntries, and `currentCarousel.slides`.
   - Failed uploads mark the slot as failed; retry uses the same path.

4) **Reorder (SlideBoard)**
   - Local reorder updates `previews`, `uploadedInfos`, `slideEntries`.
   - Persist by updating `position` on each `carousel_slide` row for slots with a `slideId`.

5) **Remove (SlideBoard)**
   - Clears local slot; deletes `carousel_slide` row for that slot (if present); deletes `media` row (if path/bucket present).

6) **Generate (SlideBoard → Results)**
   - Do **not** create a new carousel if `carouselId` exists.
   - Ensure every occupied slot has a `carousel_slide` row (insert missing ones) and persist positions.
   - Navigate to Results with `state: { carouselId, carousel }`.

7) **Re-open (Dashboard → Results/SlideBoard)**
   - Dashboard card click fetches the carousel, sets `currentCarousel`, and navigates to Results (or SlideBoard). Hydration restores slides and previews without refresh.

## RLS/Permissions (assumptions)
- Standard `user_id = auth.uid()` policies on `carousel`, `carousel_slide`, `media`.
- Nulls allowed for `type_code`, `overlay`, `text`; `media` width/height nullable.

## Future Work
- Persist captions: tie Results caption to `media_caption` and/or `carousel.caption_id`.
- Add batch endpoints or Supabase function for ordered updates (optional).
- Add optimistic cache invalidation (refresh carousels after create/upload). 
