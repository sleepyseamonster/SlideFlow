# Generate Caption Page SOP

Author: Codex (GPT-5)  
Scope: How the Generate Caption page works, how to operate it end-to-end, and implementation notes so another engineer (e.g., Bolt) can extend it safely.

## 1) Purpose & Data Flow
- Entry: Reached from SlideBoard via `navigate('/generate-caption/:carouselId', { state: { carousel, slideDrafts, aspectRatio } })`.
- Slides source: Either signed URLs from Supabase (`carousel_slide` + `media`) or local drafts (files/paths) passed from SlideBoard. Hydration re-signs URLs on load if needed.
- Persistence: When drafts were passed, SlideBoard stays local-only; Generate Caption persists slides to Supabase (media upload + `carousel_slide`) during initial load (see `persistDraftSlidesToSupabase`).
- State handoff to Publish: `navigate('/publish/:id', { state: { caption, carousel, aspectRatio } })`.

## 2) Key UI Regions (left → right)
- Preview card:
  - Aspect selector (4:5 default, 1:1 optional) — only IG-friendly ratios.
  - Preview frame with arrows and IG-style dots; aspect ratio class toggles between `aspect-[4/5]` and `aspect-square`.
  - Slides order grid (drag to reorder); upload is disabled here.
- Generate card:
  - Prompt textarea (400 char limit).
  - Buttons: Media Library (teal), Save Prompt (placeholder handler), Generate (enabled only when prompt has text), Sparkles icon with hover tooltip about monthly credits.
  - Hint + character counter.
  - Double-click prompt opens large edit modal.
- Caption card:
  - Buttons (aligned with camera icon): Media Library (teal), Save Caption (placeholder handler).
  - Caption textarea (2200 char max + counter). Double-click opens large edit modal.
  - Hint text about importing saved captions.
- SlideFlow Studio card:
  - Title in brand blue; helper copy “Need to crop your images better?”
  - “Go to Studio” CTA has inactive brown state; first click activates (teal), second click navigates to `/studio`.
  - Navigation state includes `{ from: 'generate', carousel, caption }` so Studio can render slides and return here.

## 3) Core Behaviors
- Activation (“Next/Click” in Generate Caption):
  - Enabled when slides are loaded (slidesReady) — caption no longer required.
  - On click, caption is saved via `updateCarousel`, current slides are kept in context, and we navigate to Publish with `aspectRatio` in state.
- Aspect ratio:
  - Stored in local `selectedAspect`; initialized from nav state if provided; default 4:5.
  - Used to set preview container classes and passed to Publish, which mirrors the same ratio/dots/arrows.
- Drag/order:
  - Slides can be reordered in the mini grid; uses drag image ghost; updates `orderedSlides` + `currentCarousel`.
- Modals:
  - Double-click prompt/caption opens a modal with a large textarea; Save writes back to the corresponding state; Escape closes via standard overlay click or close button.
- Limits:
  - Prompt: `maxLength={400}` with live counter.
  - Caption: `maxLength={2200}` with live counter.
- Tooltips:
  - Sparkles icon shows a floating square tooltip that follows the cursor (offset right) warning about monthly credits.

## 4) Implementation Pointers (src/pages/GenerateCaption.tsx)
- Types: `AspectRatio`, `ASPECT_OPTIONS`, `SlideDraft`.
- State essentials: `orderedSlides`, `currentSlide`, `captionPrompt`, `manualCaption`, `selectedAspect`, `textModal`, `sparklesTooltip`, `studioActive`.
- Hydration:
  - `useEffect` hydrates slides from Supabase if missing signed URLs.
  - If nav `slideDrafts` exist, `persistDraftSlidesToSupabase` uploads media and writes `carousel_slide` rows.
- Navigation:
  - Back to SlideBoard preserves carousel in nav state.
  - Forward to Publish passes `caption`, `carousel`, `aspectRatio`.
- Buttons styling:
  - Teal buttons: `bg-[#225561] border-[#225561] text-sand hover:bg-[#2f7f90] hover:border-[#2f7f90]`.
  - Generate active: `bg-pacific text-white border-pacific/70 hover:bg-pacific-deep`.
  - Go to Studio: inactive `bg-surface text-vanilla/70 border border-charcoal/60`; active matches Generate’s teal tone.

## 5) How to Extend
- Save Prompt / Save Caption:
  - Wire `handleSavePrompt` / `handleSaveCaption` to Supabase “captions/prompts” table or Media Library captions tab.
  - Add optimistic UI + toasts; consider debounce on repeated saves.
- Media Library integration:
  - Currently opens `ImportLibraryModal`; extend to filter by caption/prompt tab if available.
  - For Save Caption, optionally auto-tag and push to library with a “Saved captions” filter.
- Studio CTA behavior:
  - If you want single-click nav, remove the `studioActive` toggle and navigate directly once prerequisites (if any) are met.
  - Studio uses the `from` field to render a "Back to Generate" link and passes `{ carousel, caption }` back on return.
- Validation:
  - Keep prompt/caption limits in sync with backend; surface remaining chars near the fields (already shown).
  - If adding profanity/PII checks, hook into `onBlur` or pre-publish validation.
- Accessibility:
  - Ensure tooltip is aria-hidden and that keyboard focus isn’t blocked by the floating tooltip; add `aria-describedby` if converting to a non-follow tooltip.

## 6) QA / Known Edge Cases
- Ensure slidesReady is true before allowing Next: uploading/hydrating should block the CTA.
- If Supabase hydration fails (missing `originalMedia`), slides may render without images; logs to console.
- Tooltip follows mouse; verify no positioning issues on small screens (uses fixed positioning with offsets).
- Studio button state resets on page reload; persist if needed via context or localStorage.

## 7) Quick Ops Checklist
- Can you reorder slides and see dots/arrows update? If not, check `orderedSlides` mutations.
- Does aspect choice persist to Publish? If not, ensure `aspectRatio` is passed in navigation state.
- Do prompt/caption modals save back correctly? If not, confirm `textModal` state writes to `captionPrompt`/`manualCaption`.
- Are char limits enforced (400/2200) with counters visible? If not, verify `maxLength` props and counters.
- Is the Go to Studio CTA showing inactive → active → navigate? If not, inspect `studioActive` toggle logic.

## 8) Next Button / Handoff Flow (Generate → Publish)
- Preconditions to enable “Next/Click”: `slidesReady` true (slides loaded/hydrated); caption is NOT required.
- On click:
  1) Compute `captionToSend = manualCaption.trim()`.
  2) Call `updateCarousel(targetId, { caption: captionToSend })` (best-effort save).
  3) Build `nextCarousel = { ...currentCarousel, slides: orderedSlides, caption: captionToSend }` and set it in context.
  4) `navigate('/publish/:id', { state: { caption: captionToSend, carousel: nextCarousel, aspectRatio: selectedAspect } })`.
- What Publish expects:
  - `carouselId` from params, plus `carousel`, `caption`, `aspectRatio` in nav state.
  - Slides already persisted (from drafts) and ordered; Publish mirrors aspect, dots, and arrows.
- If you add pre-publish validation (e.g., caption required, banned words, credit checks), hook it before step 2 and block navigation with user feedback.
