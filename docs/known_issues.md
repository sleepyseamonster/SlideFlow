# Known Issues (Updated 2025-12-03)

## SlideBoard persistence + carousel creation
- SlideBoard now uploads directly to Supabase Storage/`media` with `is_library=true`, but failures surface only via alerts and per-slot “failed” state; there’s no global rollback or retry-all. If auth is missing/expired, uploads fail and slots remain empty.
- Next Step calls the `create-carousel` Edge Function and navigates even if the function returns an error; the UX relies on the alert to stop the user. We should hard-stop navigation on function errors and surface structured messages.
- Pending uploads block Next Step, but reordering is still allowed while slots are pending; metadata ordering could drift if we later rely on slot index for `position`.

## Results image hydration depends on original media
- Results re-signs URLs only when `originalMedia.bucket/path` is present in the fetched carousel. If `fetchCarouselWithSlides` ever returns slides without those fields, images will render blank after reopening. Signed URLs expire after 1 hour; there’s no timed refresh, only the one-time hydration pass.

## Dashboard prefetch is best-effort
- Dashboard tries to prefetch a carousel before navigation; if it fails (network/permission), it still routes to Results and relies on Results to refetch. Users see no explicit error on the dashboard card.

## Media Library bulk delete no-ops
- The top “Delete (X)” bulk action in Media Library does not execute (no confirm prompt, no removal) even when multiple items are selected. Single-item deletes via the per-card trash icon work.
- Attempted fixes: refreshed Supabase session before deletion, awaited `removeImage`, added deleting-state + confirm dialog, and refreshed the library after deletes (`MediaLibrary.tsx`, `ContentLibraryContext.tsx`). Behavior still persists in UI.
- Troubleshooting: cleared Supabase `media` bucket and media rows manually, restarted with a fresh bucket/data set—issue remains. Likely a UI event wiring or state selection issue preventing `handleBulkDelete` from firing.
- Next steps: add console/log instrumentation to `handleBulkDelete` click, verify the button renders when `selectedImages.size > 0`, and ensure `selectedImages` tracks visible selections (especially after search/filter). Consider moving bulk delete logic into a dedicated hook/test to confirm it’s invoked.

## Media Library → SlideBoard multi-import fails
- When importing multiple images from Media Library into SlideBoard, they briefly appear in slots then clear/disappear; only single-image import works reliably.
- No troubleshooting done yet; root cause unknown. Hypotheses: slot placement loop or state reset in `handleImportFromLibrary`, pending-slot handling, or an effect that rehydrates slots and overwrites newly placed images.
- Next steps: instrument `handleImportFromLibrary` in `SlideBoard.tsx`, watch `pendingSlots`, `uploadedInfos`, and `previews` changes during multi-import, and confirm the placement loop and `set*` calls aren’t immediately cleared by a subsequent effect (e.g., hydration). Add a focused test case to simulate multi-image import flow.

## Lint debt (pre-existing, untouched)
- Current `npm run lint -- --quiet` reports ~53 errors across the repo:  
  - **Unused imports/vars**: `src/App.tsx` (`useState`, `useEffect`), `src/pages/MediaLibrary.tsx` (`Filter`, `clearLibrary`, `ext`), `src/pages/Billing.tsx` (`DollarSign`), `src/pages/Profile.tsx` (`err`), `src/pages/LoginPage.tsx`/`SignupPage.tsx` (`err`), `src/pages/CreateCarousel.tsx` (`ext`), `src/pages/LandingPage.tsx` (`ArrowRight`, `useCases`, `features`), `src/pages/SlideBoard.tsx` (`ASPECT`, `captionPrompt`, `ext`, `handlePromptChange`), etc.
  - **`any` usages**: `src/contexts/CarouselContext.tsx`, `src/lib/database.ts`, `src/lib/n8n.ts`, `src/lib/stripe.ts`, `src/lib/instagram.ts`, `supabase/functions/n8n-proxy/index.ts`, `src/pages/CreateCarousel.tsx`, `src/pages/SlideBoard.tsx` (create-carousel invoke), `src/pages/Results.tsx` (location state).
  - **Regex/escape issues**: `src/pages/CreateCarousel.tsx` has an unnecessary escape in the filename sanitizer; similar rule in `src/pages/MediaLibrary.tsx`.
  - These errors predate today’s changes; no fixes applied yet. A cleanup pass is required to get lint green.
