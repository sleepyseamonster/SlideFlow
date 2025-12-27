# Font System (Registry + Roles)

This project uses a **centralized, approved font registry** so Brand Profile and Studio always show the same font options and typography stays consistent.

## Goals
- One source of truth for approved fonts.
- Role-based selection: users pick **Primary** + **Body** fonts (UI font stays locked).
- Only **license-safe** sources: Google Fonts + system fallbacks.
- Safe rendering: every font has a fallback chain so the app never breaks if a font fails to load.

## Where It Lives
- Registry: `src/lib/fonts.ts`
- Font loading: `src/index.css` (Google Fonts `@import`)

## Roles
- `primary`: headlines + text overlays (Studio Add Text).
- `body`: captions + paragraph-sized text.

## Adding a Font (Checklist)
1) Add a `FontDefinition` entry to `src/lib/fonts.ts`:
   - `id`: kebab-case unique id (used for storage and selection).
   - `name`: human-friendly label shown in UI.
   - `roles`: include `primary`, `body`, or both.
   - `weights`: only the weights we want to support.
   - `cssFamily`: must include a safe fallback chain (use `FONT_FALLBACK_SANS` / `FONT_FALLBACK_SERIF`).
2) Add the family + weights to the Google Fonts `@import` in `src/index.css`.
3) Verify:
   - Brand Profile dropdown previews the font correctly.
   - Studio Add Text dropdown lists it.

## Current Usage
- Brand Profile: Typography section uses the registry for Primary/Body font selection and previews both.
- Studio: Add Text uses the same registry for the text box font dropdown and renders overlays using the registry’s `cssFamily`.

## Non-goals (for now)
- No font uploads.
- No Adobe Fonts.
- No arbitrary font URLs.
- No per-element font weight UI (weights are curated in the registry).

