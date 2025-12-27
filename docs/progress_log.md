# Progress Log

## 2025-12-28
- Dashboard UI polish: tightened connected-accounts + plan cards (smaller typography, wider account card, full-card plan click target), added AI Credits badge with coin icon, and reordered metrics to include a Scheduled counter (now slot 2) with even spacing.
- Metrics reflow: Carousels now leads the stats row, Scheduled shows monthly scheduled count, and “This Month” uses the calendar-check icon; plan card moved into the command row and removed duplicate plan stat.
- Brand Profile: added hover delete icon on saved profiles matching dashboard delete styling, and wired Supabase deletions plus local removal/storage cleanup.
- Account Settings: removed the Profile tab, restyled nav buttons into compact vertical tool buttons, and added a full email-change flow (inline edit/save/cancel with Supabase update + status messaging); cleaned the email helper text.
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

## 2025-02-08
- SlideBoard UX: made SlideBoard fully local-only; removed all Supabase writes while arranging slides and shifted persistence responsibility to Generate Caption via `slideDrafts` (file/existing variants).
- Drag & drop redesign on SlideBoard:
  - Uses a fixed-size ghost (96x96) similar to the mini board.
  - Reorders only on drop: if target slot is empty, the slide moves; if occupied, the two slots swap; no other slides shift.
  - Drag-over dropEffect now reflects intent (`move` for internal drags, `copy` for file drops).
- Upload UX on SlideBoard:
  - Dropzone click now supports multi-file selection (bulk-fills next empty slots).
  - Per-slot double-click uses a separate single-file input, ensuring only one image can be picked for that specific slot.
  - All upload paths (Add files, dropzone, per-slot, Media Library) converge into the same slot arrays with a hard cap of 10 slides.
- Generate Caption:
  - Tightened Next-button logic so it only activates when slides are fully loaded (no loading state in the preview) **and** the caption textarea has content.
  - Preview card now shows a card-only spinner with “Loading...” while slides are uploading or hydrating; the rest of the page remains interactive.
- Carousel persistence SOP/docs:
  - Updated `docs/sop-carousel-persistence.md` to reflect the new local-only SlideBoard and the Generate Caption–based persistence flow.
  - Updated `docs/slideboard_usage.md` to describe the current upload, reordering, and Next-button behavior.
  - Added `docs/slideboard_ux_spec.md` as a detailed UX + behavior reference for the SlideBoard, including data model, drag rules, and edge cases.
  - Synced `docs/backlog.md` with current work (marked inline dashboard preview + SlideBoard persistence issue as done) and added a “Dev quick-start & invariants” section to the SlideBoard UX spec for future engineers/Bolt.

## 2025-02-09
- Generate Caption: added IG aspect selector (4:5 default, 1:1), Instagram-style dots, resized preview, lighter arrows; aspect choice passes to Publish for matching preview sizing/arrows/dots.
- Publish: preview card now mirrors Generate (aspect ratio sync, dots, arrow styling); readiness label reflects chosen aspect ratio.
- Prompt/Captions UX: double-click opens a large editor modal; added Save Prompt/Save Caption + teal Media Library buttons (aligned across cards); caption textarea now 2200-char limited with counter; helper text prefixed with “Hint”; placeholder colors adjusted.
- Studio CTA: title tinted to brand blue; helper copy updated; Go to Studio button gains inactive brown state and active teal state (click to activate, then navigate).
- Tooling: added Sparkles hover tooltip about monthly credits; aligned caption card header buttons with the camera icon.
- Copy: SlideFlow Studio card helper updated to “Need to crop your images better?” on Generate Caption.
- Docs: Added `docs/generate_caption_sop.md` (full SOP for Generate Caption, including aspect/preview behavior, buttons, modals, limits, tooltips, and a Next-button handoff flow to Publish).

## 2025-02-10
- Publish page polish: repositioned badges/icons, aligned header hint text (conditional when Schedule selected), brightened active states for Instagram/Facebook/Publish now/Schedule buttons, and added the mini weekly calendar under Schedule with disabled past days.
- Destinations guard: at least one platform must stay selected; inline helper surfaces when both are off.
- Actions: primary CTA label flips to “Go to calendar” when scheduling; Next button disables while Schedule is selected.
- Save Draft flow: added name-your-carousel modal (title required), best-effort slide-order upsert, Supabase update for title/caption/status draft flag, and navigation to Dashboard on success. Still failing with Supabase update/slide persistence (tracked in backlog/known issues).
- Docs: Added `docs/publish_page_sop.md` describing Publish page data flow, UI behaviors, scheduling calendar, CTA states, and draft save flow (with current caveats). Logged bug in backlog known issues.

## 2025-02-11
- Publish page: rebuilt the SlideFlow Studio card (square icon badge, bullet grid of features, toned copy, concise footer), refreshed Go to Studio CTA with dark default + glowing hover, tweaked Publish CTA to match that styling, and tightened padding around the action row.
- Publish page copy: updated Studio bullets to reflect actual capabilities (crop/resize, AI background swap/remove, on-brand text overlays, save/export PNGs); footer now reads “Slides and captions carry over.”
- Generate page: trimmed and resized the Studio tagline, tightened spacing, moved the helper + Go to Studio CTA to the right, and added a spinner overlay to the disabled Next button while slides load.

## 2025-02-12
- Calendar page: built persistent scheduling against Supabase (`calendar_event` table + RPCs), added drag/drop + click-to-schedule, timezone-aware storage/display, 15-minute slot picker, collision toasts, and status updates (“Scheduled”) on Dashboard cards.
- Calendar UI tweaks: tightened padding/gaps, widened calendar column, moved event time beside thumbnail, restyled header to “Back to Dashboard”; added toast overlay for errors.
- Dashboard cards: “Scheduled” pill now uses bright pacific blue; removed Export; Copy renamed to Duplicate; duplicate now performs a deep Supabase clone as draft with “copy” appended; trash retained.
- Known issues logged: calendar time mismatch (display vs. modal) and dashboard duplicate alert failure; also noted Supabase duplication error and time-slot ordering fix for 15-minute selector.

## 2025-02-19
- Rebuilt Meta connect to use a server-side OAuth flow via Edge Functions: `meta-oauth-start` (returns Meta auth URL with CORS allowing `x-client-info`) and `meta-oauth-callback` (exchanges code → long-lived token, fetches Pages + IG accounts, upserts `connected_account` + `connected_account_secret`, sets default destination, redirects to `/profile?meta=connected`).
- Frontend now calls `meta-oauth-start` directly from Profile, removed the `/meta/callback` React page/state to avoid stalled redirects; Meta app redirect URI is `https://fgfykhiecmqdpkeyeand.supabase.co/functions/v1/meta-oauth-callback`.
- Added Supabase secrets for Meta (`META_APP_ID`, `META_APP_SECRET`) and per-function config `supabase/functions/meta-oauth-callback/config.toml` to disable JWT verification; pending confirmation that deploy picks up the config to clear the 401 “Missing authorization header” on callback.

## 2025-12-20
- Meta OAuth hardening: signed/time-limited state (HMAC with `META_APP_SECRET`), redirect-base validation (`SITE_URL` or request origin), and appsecret_proof on Graph calls.
- Callback 401 fix: `meta-oauth-callback` runs with `verify_jwt = false` (config + deploy flag) since Meta redirects without Authorization headers.
- Frontend invoke now sends the Supabase access token to `meta-oauth-start`; errors are clearer on missing auth/redirect base.
- Docs aligned to server-side OAuth; `meta-connect` marked legacy (superseded by `meta-oauth-start/meta-oauth-callback`).
- Deployment verified: `meta-oauth-start` and `meta-oauth-callback` deployed to fgfykhiecmqdpkeyeand with JWT off; Meta connect flow confirmed working end-to-end.
- Added `meta_connection_sop.md` (canonical runbook), updated doc index and context accordingly.
- Profile UI: “Connect to Meta” now supports connecting additional Instagram accounts/Facebook Pages even when already connected; destinations card includes add/refresh actions and clarifies multiple connections. After Meta redirect (`?meta=connected/error`), the Profile auto-refreshes destinations/user and surfaces a banner.
- Meta callback now accepts both `instagram_business_account` and `connected_instagram_account` when building IG/Page candidates (prevents missing accounts that only expose `connected_instagram_account`).
- Meta callback now fetches missing Page access tokens (when not returned in `me/accounts`) using the user token + appsecret_proof, and logs debug info on no-candidate errors; should reduce false “no_ig_business” cases.
- Meta callback now falls back to Business Manager assets (`/me/businesses` → `owned_pages`/`client_pages`) when `me/accounts` returns no Pages, reducing false `no_pages` failures for users who only have Business access.
- Meta callback now fetches IG linkage per Page (`/{page_id}?fields=instagram_business_account,connected_instagram_account`) when the initial Page list omits IG fields; improves multi-account connects where `me/accounts` returns Pages but not IG links.
- Meta callback now falls back to using the long-lived **user** token when a Page access token cannot be fetched (prevents multi-account connects from being blocked by missing Page tokens).
- Meta multi-account connect stabilized end-to-end: connect additional Pages/IGs via “Connect another”, return banner shows success, and the destinations list updates with all connections.

## 2025-02-13
- Dashboard actions/buttons restyled: unified dark buttons with pacific hover, Studio CTA enlarged with upward hover; Ready status pill now green for `ready` carousels; inline Publish button added to cards (UI-only) and trash icon moved to top-right hover area. Publish Ready on Publish page now sets carousel status `ready` and hides Ready when “Schedule” is selected (shows Go to Calendar instead).
- Publish CTA: green “Ready?” (sets status ready, arms Next) vs. blue “Go to Calendar” when scheduling; check icon simplified; caption persistence documented as client-only due to missing DB column.
- Brand Profile: removed secondary font selector, cleaned preset copy to remove Supabase wiring notes, simplified preset save card; preview text updated (headline/body) with selected font applied; Supabase/wiring copy scrubbed.
- Profile page: widened layout, reduced gaps, set email field read-only to silence warnings, disabled Connect Instagram button (no-op for now), updated Premium upsell copy to generic benefits.
- Calendar page: fixed duplicate-key warnings on weekday headers.
- Docs: updated `publish_page_sop.md` for new Ready/Go-to-Calendar behavior and caption persistence gap; updated `backlog.md` (trash relocation done; new items for wiring dashboard publish button, caption column, Instagram connect), `known_issues.md` (caption not persisted), and this progress log.

## 2025-12-18
- Profile page: revised the integration section to “Connect to Meta” with clearer requirements (Instagram Business + linked Facebook Page), plus a help tooltip.
- Meta connection implemented end-to-end (no n8n) — legacy flow, superseded by the Feb 2025 server-side OAuth:
  - Added `connected_account` (user-visible) + `connected_account_secret` (service-role only tokens) tables with RLS.
  - Added RPCs to set a single default destination and to disconnect (revoking + deleting secrets).
  - Added `meta-connect` Supabase Edge Function to exchange tokens, discover eligible assets, and persist connections.
  - Added `/meta/callback` route to complete OAuth and finalize connection via the Edge Function.
- Multi-destination UX: users can view all connected destinations, set a default, refresh the list, and disconnect accounts from Profile.
- Business-only enforcement: the connect pipeline filters out non-BUSINESS Instagram accounts.
- Docs: added `docs/meta_connection_setup.md`, updated `docs/supabase_schema.md`, `docs/n8n_workflows.md` (legacy note), `docs/README.md`, and `docs/backlog.md`.

## 2025-12-19 (legacy flow: superseded by server-side OAuth)
- Meta connect hardening (legacy `meta-connect` + `/meta/callback` path):
  - Edge Function no longer requests `account_type` (avoids Meta `(#100) nonexisting field`), keeps IG candidates even if detail fetch fails, and auto-prunes any previously connected IGs not in the latest selection.
  - MetaCallback now guards against dev/StrictMode double-run to stop repeated `meta-connect` calls.
  - Added debug payload to `meta-connect` responses (`pagesWithTokens`, `rawCandidateCount`, `igFetchErrors`) for faster troubleshooting.
- Disconnect RPC fix: added migration to drop/recreate `revoke_connected_account` with a safe parameter and wrapper to preserve the original signature; documented the exact SQL in `docs/meta_connection_context.md`.
- Docs: created `docs/meta_connection_context.md` (full context, troubleshooting, deploy steps, RPC fix); logged Meta connect/disconnect issues in `docs/known_issues.md`.

## 2025-12-20
- Publish page: added “Posting account” selector UI with a custom themed picker, refresh controls, and clear selected-destination display tied to the Publish-page selection.
- Publish flow: wired the retro Publish button to call a new Edge Function and show a dev-only “Carousel posted” modal; added publishing state + inline error handling for missing destination/platforms.
- Edge Functions: added `publish-carousel` stub to validate the selected `connected_account.id` + carousel ownership and return success without calling Meta.
- Docs: added `docs/publishing_destination_sop.md`, updated `docs/publish_page_sop.md`, and extended `docs/meta_connection_setup.md` with the stub publish flow.
- Publish flow: replaced the stub with real Meta Graph publishing for Instagram carousel + Facebook multi-photo posts using the selected `connected_account.id` only; UI modal now reflects real publish completion.
- Docs: updated `docs/meta_connection_setup.md` and `docs/publish_page_sop.md` to reflect live publishing.
- Fix: corrected the Meta Graph URL builder regex in `publish-carousel` so the function bundles successfully.
- Publish UX: on successful publish, sets status to `published`, returns to Dashboard, and hides Duplicate/Publish actions for published cards.
- Publish safety: added server-side publish lock in `publish-carousel` to prevent duplicate attempts and mark failed attempts explicitly.
- Publish safety hardening: added publish attempt metadata columns + `posting_log` audit table, logged each platform attempt, and enforced no-retry behavior in UI and docs.
- Publish safety fix: relaxed legacy `posting_log.media_id` NOT NULL constraint to allow new publish log rows without legacy media_id data.

## 2025-12-20 (continued)
- Publish flow: removed `posting_status` lock dependency and reverted to a simpler duplicate guard (check `carousel.status='published'` + `posting_log` posted entry) to avoid blocking publish; manual retry allowed after failed attempts.
- Publish UI: improved error parsing to handle streamed error bodies, surfaced detailed errors, and simplified publish gating to only block already-published carousels.
- Dashboard: publish button gating now depends on `status` only; schedule pill relies on `scheduled_at` instead of `posting_status`.
- Edge Function: added explicit publish-history check via `posting_log`, returns details on lock/history errors, and marks published status only after successful posting (or partial success).
- Docs: updated publishing SOPs/invariants and schema notes to match the simplified duplicate-guard flow and `posting_log` usage.
- Publish UI: added an AI-generated content disclosure toggle and now sends `is_ai_generated` with publish requests.
- Edge Function: accepts `is_ai_generated`, appends a disclosure line to the caption when enabled, and logs the flag with each platform attempt.
- Docs: updated Publish page SOP to cover the AI disclosure toggle behavior, logging, and the future-proof disclosure pipeline plan.
- Publish UI: retro Publish button now requires at least one connected account before it can activate.
- Publish UI: “Ready?” button now also requires at least one connected account.
- Profile: removed redundant “Add another account” button in the Meta Connected header.
- Branding: replaced the default favicon with the 48x SlideFlow icon.

## 2025-12-21
- Added a dedicated Account Settings page and moved the profile details card out of Profile.
- Profile sidebar now links to the new Account Settings route; Account Settings page includes the profile summary + nav layout.
- Removed the plan promo card from Profile so plan details live only in Billing & Plans.
- Simplified Profile into three read-only cards and moved Meta connection management into Account Settings.
- Prevented published carousels from being scheduled in the dashboard week view and the calendar page.
- Rebuilt the SlideFlow Studio page layout with a three-column workspace (tools, canvas, properties), slide filmstrip, and export panel, wired to navigation state for returning to Generate/Publish.
- Docs: added `slide_flow_studio_sop.md`, updated Studio references in Generate/Publish SOPs, annotated the Studio UX spec with current implementation status, and aligned `project_overview.md` with the Studio positioning.
- Studio header: removed breadcrumb/title copy and moved the back link to the top-left with the standard Dashboard back-link styling; updated Studio SOP/spec to reflect the minimal header.
- Studio brand tool: added a Brand Profile shortcut button in the right-hand panel.
- Studio brand tool: added a saved-profile dropdown (UI-only) and removed the helper copy line.
- Studio brand tool: wired the palette to the selected profile and added readouts for saved font and style (UI-only).
- Studio brand tool: replaced the native select with a custom themed dropdown to match the Studio palette.
- Studio background removal tool: removed the actions/export block so only the removal CTA remains.
- Studio page dots: indicator hidden temporarily while we refine the canvas experience.
- Studio preview: reduced the canvas max width and removed the shared Actions/Export block across every tool to keep the layout focused.

## 2025-12-22
- Studio Preview: empty preview is now clickable to open the OS file picker; selected images load into the Studio workspace as local slides (no persistence yet).
- Studio Preview header: removed Fit/100%/Fill controls and added “Add files” (picker) + “Media Library” buttons aligned to the right.
- Crop & Resize: added drag-to-reframe behavior inside the aspect-ratio frame with a rule-of-thirds grid overlay (preview-only UI until Apply).
- Background Remove: wired the “Remove Background” CTA to a server-side Supabase Edge Function (`remove-background`) using fal.ai Bria RMBG (`fal-ai/bria/background/remove`); updates the active slide preview with the returned transparent PNG.
- Studio UX: added loading/disabled state + toast error handling for background removal; filmstrip thumbnails reflect the previewed edited image.
- Docs: updated `docs/slide_flow_studio_sop.md` and `docs/slide_flow_studio_ux_specification.md` to reflect the current Studio interactions and wiring.

## 2025-12-23
- Background Replace: added a new Supabase Edge Function (`replace-background`) wired to fal.ai Bria Background Replace (`fal-ai/bria/background/replace`) using `FAL_KEY`.
- Studio Background Replace tool: added UI to provide the required “second background” input via either a reference image upload or a background prompt (exclusive), plus a preview action that updates the active slide preview (no persistence yet).
- Docs: updated Studio SOP/spec to reflect Background Replace wiring and preview-only behavior.
- AI Upscale: added a Supabase Edge Function (`upscale-image`) wired to fal.ai upscalers and updated the Studio tool to use a one-click, auto-polling flow that returns the final upscaled image when ready.
- AI Upscale: uses SeedVR2 Upscale; model-selection plumbing remains but Flux Vision Upscaler is removed from the UI and Edge Function config for now.
- AI Upscale: improved in-app feedback while processing (status + elapsed timer), added a Cancel action, and added an “Open upscaled image” link; forced preview/thumbnail images to re-mount when the source URL changes so updates are immediately visible.
- Add Text: implemented multiple draggable text boxes (per slide, session-only) with selection list, add/duplicate/delete controls, plus per-box font picker, size, alignment, and color palette + custom color; includes “Apply brand style” to apply the selected Brand Profile’s font/colors to the active text box.
- Add Text: adjusted z-order so higher items in the Text boxes list render in front, removed the unused “Apply brand style” CTA, and removed the Actions block for Add Text (Preview/Apply/Cancel) to keep the panel focused.
- Branding: replaced `public/logo.png` with the updated SlideFlow logo from `assets/Logo.png`.
- Crop & Resize: removed the unused Actions block (Preview/Apply/Cancel) and removed the Straighten/Rotate buttons from the right panel.
- Studio right panel: condensed all tool controls (smaller typography, buttons, inputs, and tighter spacing) via a scoped `sf-studio-toolpanel` style so the rest of the app remains unchanged.
- Fonts: added a centralized font registry (`src/lib/fonts.ts`) and expanded the approved font list (Google Fonts). Brand Profile now supports selecting a primary + body font from the registry, and Studio Add Text uses the same registry for its font dropdown.
- Fonts: expanded the registry with additional Google Fonts and updated Brand Profile to use a custom font dropdown so each option previews in its actual font.
- Brand Profile: changed the custom font dropdown to an absolute-positioned overlay so opening it doesn’t push the card content downward.
- Brand Profile: fixed dropdown z-order by rendering the menu in a portal with a high z-index so it always overlays other cards (e.g., Presets).
- Brand Profile: simplified the page header (title is now “Brand Profile” and removed the subtitle line).
- Docs: added `docs/font_system.md`, updated `docs/README.md`, and updated `docs/brand_profile_plan.md` / `docs/slide_flow_studio_sop.md` to reflect the centralized font registry and role-based selection.

## 2025-12-24
- Studio header actions: wired Undo/Redo with a bounded history stack (20 steps) across crop/zoom/aspect, AI preview edits, and text overlays; Reset now clears the active slide’s preview edits.

## 2025-12-25
- Media Library: added Images/Captions/Prompts tabs with matching card sizing, hover actions (export/delete), and modal editing for text entries; enabled double-click rename + display name persistence; export icon now downloads; checkboxes show on hover; storage card tightened and moved into the toolbar.
- Media Library modal: consistent modal in Generate and Studio; Studio Media Library button now opens the modal on the Images tab.
- Generate/SlideBoard UX: “Next” buttons now read “Continue” with lighter text; carousel counters now use Instagram-style dots.
- Prompt limits: prompt text inputs across Generate + Media Library increased to 1000 characters.
- Dashboard metrics row: introduced Published + This Month (published this month) metrics, connected account card, and plan card linking; reworked sizing/padding/hover states and icon styling for a tighter single-row layout.
- Landing page pricing: full redesign aligned to AI credit pricing; Creator is the highlighted plan; Studio is premium; credit pack line removed; section copy refreshed.
- Studio tools: split into Tools vs AI Tools groups; AI badge treatment refined; background remove/upscale copy cleaned; AI credit copy now consistent (“This tool uses AI credits.”).
- Background Replace: improved UI with prompt/image modes, brand profile injection, and drag/drop from filmstrip thumbnails as a reference image.
- Generate Background: new tool + Flux edge function (`generate-background`) with high guidance scale, background-only guard prompt, aspect-ratio sizing, brand style/palette injection, and ability to generate a background even with no slides loaded (auto-creates a draft slide).
- Studio exports: implemented PNG rendering of the current preview (aspect-sized to 1080px wide, includes crop/zoom + text overlays) and wired the Export button.
- Studio save: added a Save button that renders the current preview to PNG, uploads it to Supabase storage (`media` bucket), and inserts a new `media` row as a library asset.
- Docs: added `docs/ai_credit_pricing.md` as the working draft for credits, packs, and AI cost modeling.
- Studio sidebar: added a session-level Brand Profile control above tools and wired brand defaults for new text (color + font match).
- Studio tools: added Image Overlay with upload, size slider, and 3×3 placement grid; overlay renders in preview and export/save.
- Studio header: appended “Studio” with the sparkle icon next to the logo only on `/studio`.
- Studio Preview header: aligned Add files/Media Library to the right and removed the preview helper line to keep the bar height fixed.
- AI Upscale: removed the model dropdown (fixed SeedVR2 label) and added credit usage notices.
- Full Image Edit: replaced Preview/Apply with a single Generate button wired to a placeholder `nano-banana-edit` Edge Function; added Clear and credit notices.

## 2025-12-26
- Studio Add Text: replaced the native OS color picker with a custom in-panel HSV picker (square + hue slider), added a collapsed “Pick/Hide” toggle, and added a hex input that syncs with the picker and palette swatches.
- Studio Add Text: fixed picker UX (stay open while editing, click-and-drag reticle behavior, click-to-set selection) and reorganized the hue slider above the swatch + hex row.
- Studio typography: replaced the native font `<select>` in Add Text with a custom dropdown to avoid oversized OS menus; font list previews each font.
- Studio layout: made the center column (Studio Preview header + canvas + Slides card) sticky with a top offset to keep it visible while scrolling.
- Studio sidebar labels: renamed “Creator Tools” → “AI Tools” and “Studio Tools” → “Creator Tools”.
- Studio sidebar icons: updated the Generate Image / AI Image Edit / Vectorize icons to sparkle and reordered AI Image Edit above Vectorize; AI tool icons now use regular text color except the Studio AI tools which remain blue.
- Background Remove/Replace: added AI credit notices below the primary CTAs.
- Add Text: removed the Duplicate control to reduce clutter.
- Docs: updated `docs/what_is_slideflow_studio.md` to mention simple image overlays.
- Security: enforced RLS on `public.brand_profile` (select/modify own rows only) and ensured Brand Profile + Studio queries are scoped to `user_id`.
- Studio Slides filmstrip: added a custom drag ghost + “lift” styling for tactile slide pickup, matching the mini slide board feel.
- Studio Creator tools: Generate Image / AI Image Edit / Vectorize now append a new slide instead of overwriting existing images.
- Studio AI Image Edit: added `supabase/functions/nano-banana-edit` wired to `fal-ai/nano-banana-pro/edit` (uses server-side `FAL_KEY`).
- SlideBoard: rehydrate saved slides on return from Generate to avoid stale blob URLs and prevent broken thumbnails during reordering.
- Brand Profile: persist selected preset on account via `is_default` and reuse it across sessions (Studio falls back to the default preset when present).
- Billing: “View plans & pricing” button now routes directly to `/plans` from the billing summary.
- Account Settings: added a top-of-page “Back to Dashboard” link for quick return to the main hub.
- Billing cleanup: removed unused plan-selection helpers and state to clear lint noise.

## 2025-12-27
- Investigated the recurring `brand_profile.is_default` column errors on the Brand Profile and SlideFlow Studio pages, traced the 400 response to the missing migration, and documented the detection strategy that will make the fetch/save logic schema-aware.
- Prepared to reinforce the known issues log with the migration info and capture the migration commands in the docs as part of the fix.
