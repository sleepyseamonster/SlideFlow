# Brand Profile Page Plan

## Why this exists
- We removed brand-related controls from `Generator` to move them into a dedicated Brand Profile page. This doc captures what must be rebuilt so the work is not lost.

## Features to move into Brand Profile
- **Preset management**: create, list, apply, delete brand presets (colors, fonts, default style). Previously “Apply preset” + “Save as Preset”.
- **Style selection**: choose the base style (`minimalist`/`bold`/`elegant` as of now).
- **Brand palette**: primary, secondary, accent1, accent2 color pickers; option to skip custom colors.
- **Typography**: primary and secondary font selectors; option to skip custom fonts.

## Data model + storage notes
- Supabase `brand_profile` table already used by the old “Save as Preset” flow; payload expected by `/all-data`:
  - `brand_profile.defaults.style`
  - `brand_profile.palette` (`primary`, `secondary`, `accent1`, `accent2`)
  - `brand_profile.fonts` (`primary`, `secondary`)
- Presets were cached in `localStorage` (`slideflow_brand_presets`); decide whether to keep local cache or read-only from Supabase.
- When the Brand Profile page is ready, load the user’s saved profile/presets on page load and allow save/update/delete.

## Integration back into Generator
- Generator currently sends a minimal brand profile (`style: "minimalist"`, empty palette/fonts). When Brand Profile is live:
  1) Fetch active brand profile (or selected preset) before generation.
  2) Inject fetched palette/fonts/style into the `/all-data` payload:
     - `brand_profile.palette`
     - `brand_profile.fonts`
     - `brand_profile.defaults.style`
     - `ai_caption.style` should mirror the chosen style.
  3) If no brand profile exists, fall back to the current default payload (empty palette/fonts, `style: "minimalist"`).

## Proposed UX for the Brand Profile page
- Single page reachable from nav (link to be added later).
- Sections:
  - **Header**: explains brand defaults apply to all carousels.
  - **Style** selector cards (Minimalist/Bold/Elegant) with preview text.
  - **Palette** picker grid with skip-toggle.
  - **Fonts** selector grid with skip-toggle and live preview lines.
  - **Presets**: list + select + delete; “Save current settings” form.
- Include a “Use on next carousel” action that sets the active preset/profile in context.

## Work remaining (future tasks)
1. Build `BrandProfilePage` component (routing, layout, guards).
2. Add context/store for brand profile so Generator can consume without duplicating state.
3. Implement Supabase reads/writes for brand profile + presets (reuse existing webhook or direct RPC).
4. Restore the removed controls’ UI inside the new page, wired to the store.
5. Add tests/QA: verify `/all-data` receives selected brand settings; ensure skip toggles produce empty palette/fonts.

## Removal summary (today)
- Stripped brand/preset/style/color/font sections from `Generator` UI and simplified generation payload to default brand style only.
- No data loss in Supabase; only the on-page controls were removed. This doc tracks what to rebuild.
