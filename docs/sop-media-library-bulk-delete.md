# SOP: Media Library Bulk Delete Troubleshooting

## Goal
Ensure the “Delete (X)” bulk action removes selected library images from both Supabase storage and the `media` table.

## Current Behavior
- Per-card trash deletes work.
- Bulk “Delete (X)” often does nothing (no confirm dialog, no deletion). See `docs/known_issues.md`.

## Quick Workaround
- Use the per-card trash icon to delete items one by one until bulk is fixed.

## Diagnostic Steps
1. Confirm selections: `selectedImages.size > 0` should render the bulk button. Check in React DevTools.
2. Instrument the click: add a temporary `console.log('bulk delete click', selectedImages.size)` inside `handleBulkDelete` (MediaLibrary.tsx) to verify the handler fires.
3. Session check: ensure `supabase.auth.getSession()` returns a session before delete; errors are surfaced via alerts.
4. State watchers: log `selectedImages`, `filteredImages`, and `deleting` to ensure `handleBulkDelete` isn’t short-circuited.
5. Storage/table effects: confirm Supabase storage remove + `media` row delete calls fire (network tab or console).

## Files touched by the flow
- `src/pages/MediaLibrary.tsx` — `handleBulkDelete`, delete button rendering and state.
- `src/contexts/ContentLibraryContext.tsx` — `removeImage` deletes from storage and `media` table.

## Success Criteria
- Confirm dialog appears.
- Selected items are removed from UI and no longer present in Supabase storage or the `media` table after refresh.
