# Known Issues (Updated 2025-12-26)

Legend: P1 = high, P2 = medium, P3 = low. Workarounds and next steps noted where known.

## P1 (High)

- **SlideBoard breaks after returning from Generate (reorder no-op + “no carousel”)**  
  - Repro: Create a new carousel, add slides in SlideBoard, Continue to Generate, wait for all uploads to finish, then click “Back to Slideboard.” On SlideBoard, drag/drop does nothing, Continue shows “No slides found / Create a new carousel.”  
  - Console: `blob:* net::ERR_FILE_NOT_FOUND`, Supabase storage `net::ERR_FAILED`, `StorageUnknownError: Failed to fetch` during `persistDraftSlidesToSupabase`.  
  - Impact: users cannot rearrange after returning; navigation forward breaks.  
  - Urgency: **major/urgent**, blocks core workflow.

- **Media Library bulk delete does nothing (UI no-op)**  
  - The top “Delete (X)” bulk action shows no confirm dialog and removes nothing, even with selections; per-card trash still works. Attempted fixes: refreshed Supabase session before deletion, awaited `removeImage`, added deleting-state + confirm dialog, refreshed library after deletes (`MediaLibrary.tsx`, `MediaLibraryContext.tsx`). Cleared bucket/data and retested—still broken.  
  - Next steps: instrument `handleBulkDelete` click, verify the button renders when `selectedImages.size > 0`, ensure `selectedImages` survives filters/search. Consider extracting logic into a dedicated hook/test to confirm invocation.

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

## P2 (Medium)

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

## P3 (Low)

- **Dashboard prefetch is best-effort**  
  - Dashboard routes to Results even if prefetch fails (network/permission); users see no error. Needs visible error handling or retry before routing.

## Resolved / Historical

- **SlideBoard persistence + carousel creation**  
  - Issue: SlideBoard uploaded directly to Supabase with `is_library=true`; failures surfaced per-slot; Next called `create-carousel` even on errors; pending uploads allowed reorder, risking drift.  
  - Resolution: SlideBoard is now local-only; all persistence (`media` + `carousel_slide`) moved to Generate Caption via `slideDrafts`; Next reuses the existing carousel id. Global writes no longer occur from SlideBoard.
