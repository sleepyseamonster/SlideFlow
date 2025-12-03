# SlideBoard Usage Guide

## What this page is for
- Add up to 10 images for a carousel.
- Arrange order, replace slots, and preview/remove images before generation. All uploads go to Supabase Storage (`media` bucket, `is_library=true`) and link to the current carousel.

## Upload options
- **Add files (top-right buttons)**: click to select multiple PNG/JPG files (max 10).
- **Media Library**: click to import existing assets from your library.
- **Dropzone**: drag one or many files onto the drop area beneath the header. Files fill the next open slots automatically.
- **Direct to slots**: drag files directly onto any numbered slot to place or replace that slot.

## Managing slots
- **Reorder**: drag a populated slot onto another populated or empty slot to move it. Reordering is disabled while uploads are pending so slot state stays consistent.
- **Replace**: drop a file onto a populated slot to swap it.
- **Remove**: click the “X” on a slot to clear it (removes the associated `carousel_slide` + `media` rows if present).
- **Preview**: double-click a populated slot to open a larger preview.

## Constraints & tips
- Formats: PNG or JPG.
- Limit: 10 images maximum across all upload methods.
- Dropzone + slot drops both honor the 10-image limit; if all slots are filled, remove one before adding more.
- Use the top buttons for reliable multi-select; use direct slot drops when you need specific placement quickly.
- Signed URLs for stored media refresh automatically when you load an existing carousel, keeping previews from expiring. Avoid reordering while uploads are in-flight; wait for the upload spinner to clear before dragging.
