# SlideFlow Studio Page SOP

Scope: How the Studio page works today, how it is reached, and the current UI behaviors so future changes stay aligned with the UX spec.

## 1) Purpose & Current Status
- Studio is the lightweight editing workspace inside SlideFlow.
- The current implementation is UI-first, with selective wiring for preview edits plus header-level save/export (edits are still preview-only unless saved/exported).

## 2) Entry Points & Navigation State
Studio can be reached from three places:

1) Dashboard
- Route: `/studio`
- No navigation state passed.
- Studio shows empty-state messaging and a Media Library link until slides exist.

2) Generate Caption
- Route: `/studio`
- Navigation state: `{ from: 'generate', carousel, caption }`
- The Go to Studio CTA still uses the two-step activation pattern (inactive -> active -> navigate).

3) Publish
- Route: `/studio`
- Navigation state: `{ from: 'publish', carousel, caption }`

Return behavior:
- The Studio header back button uses `from` to return to `/generate-caption/:id` or `/publish/:id`.
- The back link passes `{ carousel, caption }` to preserve context.

## 3) Layout Overview (Three Columns)
Header
- Minimal header with a single Back link on the left and action buttons on the right.
- No breadcrumb or page title copy in the Studio header.

1) Left column: Tool groups
- Session-level Brand Profile control sits at the top (sets palette defaults for the session).
- Tools list sits below, with one active tool at a time.
- Tools are now split into two groups:
  - Tools: Crop & Resize, Add Text, Image Overlay.
  - AI Tools: Background Remove, Background Replace, Generate Background, AI Upscale, Full Image Edit.
- Each tool has label, short description, and icon; AI tools use the blue sparkle styling.

2) Center column: Canvas + filmstrip
- Framed canvas with gallery-style presentation.
- Canvas width is capped (~360px) to keep the preview contained next to the tool columns.
- Studio Preview header uses right-aligned “Add files” and “Media Library” CTAs (Media Library now opens the modal on the Images tab).
- Crop tool includes a zoom slider under the preview (0–100 → 1x–3x) and is only shown when Crop & Resize is active.
- Filmstrip shows slide thumbnails and a status dot (Original / Edited / AI Enhanced / Draft).
- Empty filmstrip shows a "Open Media Library" link.
- Page indicator dots at the bottom are currently hidden (state left to re-enable later).

3) Right column: Tool controls
- Context header shows the active tool name and description.
- Tool-specific controls render conditionally.
- No generic Actions block; each tool renders only its own controls.

## 4) Tool Panel States (UI-Only)
Essentials
- Crop & Resize:
  - Aspect ratio presets drive the preview frame.
  - Drag-to-reframe is enabled in the canvas (rule-of-thirds grid overlay) as preview-only UI.
  - Zoom is controlled via the crop-only slider under the preview (0–100 → 1x–3x).
  - No right-panel Actions block (Preview/Apply/Cancel) is shown for Crop & Resize in the current build.

- Background Remove:
  - “Remove Background” calls a server-side Edge Function and swaps the preview to a transparent PNG result (preview-only; not persisted).
  - Credit notice appears below the CTA.
  - Requires `FAL_KEY` to be set for the deployed `remove-background` function.
- Background Replace:
  - Two modes (exclusive): reference image or background prompt.
  - Reference image can be uploaded or drag-dropped from the filmstrip thumbnails.
  - Optional brand profile injection for palette + style prompt; credit notice below.
- AI Upscale: fixed model label + one-click upscale button (auto-polls until the final image is ready) + credit notice.
- Generate Background:
  - Text prompt + style presets (Minimal/Bold/Elegant) with optional Brand Profile injection.
  - Prompt is always guarded to force background-only outputs (no subjects or scenes).
  - Uses the current aspect ratio for `image_size`.
  - Can generate without any slides loaded (creates a new draft slide from the output).
  - Credit notice shown under the CTA.

Text & Brand
- Add Text:
  - Adds multiple draggable text boxes on top of the preview image (per slide, session-only).
  - Controls: per-box text content, font (from the centralized registry), size slider, alignment buttons, and color picker + palette swatches.
  - Manage boxes: add, select from a list, delete (no duplicate control).
  - Z-order: items higher in the “Text boxes” list render in front of later items.
- Brand Profile: saved-profile dropdown + palette swatches + saved font + saved style + Brand Profile shortcut.
- Image Overlay:
  - Upload a logo/image per slide and preview it on top of the canvas.
  - Size slider (percent width) + 3×3 placement grid (9 anchors).
  - Overlay renders in preview and is included in Save/Export.

Advanced AI
- Full Image Edit: prompt textarea and safety notice.
- "Generate" triggers a placeholder Edge Function call (`nano-banana-edit`) and swaps the preview (credit notice below).

## 4.1) Background Replace (fal.ai)
- Supports two modes (exclusive):
  - Reference image: choose a second image to use as the new background.
  - Prompt: provide a text description for the new background.
- Preview-only: Studio swaps the active slide preview to the returned image; no persistence to Supabase media/storage yet.
- Requires `FAL_KEY` for the deployed `replace-background` Edge Function.
- Filmstrip drag/drop: any slide thumbnail can be dropped into the Background Replace reference drop zone.

## 4.2) AI Upscale (fal.ai)
- “AI Upscale” runs via Supabase Edge Function `upscale-image`.
- Model: SeedVR2 Upscale (`fal-ai/seedvr/upscale/image`)
- Preview-only: replaces the active slide preview image for the session; no persistence yet.
- UX: one click starts processing; the UI shows an elapsed timer/status while waiting and a Cancel button to stop the run.
- After completion, Studio shows an “Open upscaled image” link for quick verification.
- Requires `FAL_KEY` for the deployed `upscale-image` Edge Function.
- Credit notice shown under the Upscale CTA.

## 4.3) Generate Background (fal.ai Flux)
- Runs via Supabase Edge Function `generate-background` wired to `fal-ai/flux/dev`.
- Uses `image_size` derived from the current aspect ratio (1:1, 4:5, 9:16).
- Guidance scale set high (10) to keep the model tightly aligned to prompts.
- Prompt composition always injects a background-only guard plus optional style + palette data.

## 5) Save & Export (Header Actions)
- Export downloads a rendered PNG of the current preview (crop/zoom/text/overlay).
- Save renders the PNG and uploads to Supabase storage (`media` bucket), then inserts a new `media` row flagged as a library asset.

## 6) Empty State Behavior
- When no slides are available, the canvas shows a calm placeholder.
- The filmstrip displays a call-to-action linking to the Media Library.

## 7) Implementation Notes
- File: `src/pages/SlideFlowStudio.tsx`
- State is mostly local only: active slide index, active tool, aspect, text, sliders, prompt, overlay, crop position per slide+aspect, and preview-only edited images.
- Background removal is executed via Supabase Edge Function `supabase/functions/remove-background` and returns a preview image; no write-back to Supabase storage/media tables yet.
- Undo/Redo is implemented with a bounded local history stack (20 steps).

## 8) Extension Checklist (when wiring functionality)
- Decide which actions are synchronous (code) vs async (n8n) per the Studio architecture rule.
- Wire edits to create new media versions and preserve originals.
- Connect Save/Export back into carousel slide updates (optional).
- Add async status badges for AI edits in the filmstrip.
- Implement persistent version history beyond local undo/redo.
