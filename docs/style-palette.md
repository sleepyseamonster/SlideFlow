# SlideFlow Visual Reference — Relaxed Modern Luxury

Use this as a quick style card for the current theme. Palette values map directly to Tailwind tokens in `tailwind.config.js` and utility helpers in `src/index.css`.

## Palette
- Sand Dune `#EDE0C9` (`sand`, `sand-light`): Primary background, light cards, neutral surfaces.
- Tropical Teal `#3BB0B2` (`tropical`, `tropical-dark`): Primary CTAs, active states, key highlights.
- Stormy Teal `#31666A` (`stormy`): Secondary accents, nav/header fills, strong cards.
- Charcoal `#4E4E4C` (`charcoal`): Body text, icons, lines.
- Charcoal Brown `#454440` (`charcoalBrown`): Headlines, dark sections, footers.

## Core Styling
- Mood: Relaxed modern luxury; boutique feel; soft warmth with confident teal accents.
- Corners: Rounded by default. Key radii: `rounded-2xl`/`rounded-3xl` on cards, inputs, and buttons.
- Shadows: Soft drop (`shadow-soft` token) for depth without harsh contrast.
- Typography: Headings in Charcoal Brown; body in Charcoal; base font Inter/system sans.
- Surfaces: Sand as primary canvas; use `sand-light` for subtle contrast; Stormy for anchored sections.

## Component Tokens (from `src/index.css`)
- Cards: `.sf-card` → sand-light base, thin border, rounded-3xl, soft shadow.
- Panels/Glass: `.sf-panel` → translucent white, rounded-3xl, soft shadow.
- Buttons: `.sf-btn-primary` → Tropical background, sand text; `.sf-btn-secondary` → light neutral surface with charcoal text.
- Inputs: `.sf-input` → light neutral fill, rounded-2xl, charcoal text with tropical focus ring.
- Labels: `.sf-label` → Charcoal Brown, small weight.
- Pills: `.sf-pill` → light neutral chip for metadata/status.

## Usage Guidelines
- Backgrounds: Use Sand as the page base; mix Sand-Light for content blocks; reserve Stormy for headers or focal strips.
- CTAs: Tropical for primary actions; keep text sand/white. Use Stormy for secondary focal buttons or dark anchors.
- Text: Headings in Charcoal Brown; body and helper in Charcoal. Lower opacity Charcoal for muted copy.
- Borders: Low-opacity Charcoal for separators; avoid heavy strokes.
- Density: Favor spacious padding, generous line height, and rounded corners to keep the boutique tone.

## Quick Examples
- Page shell: `bg-sand text-charcoal`.
- Nav/header: `bg-stormy text-sand shadow-soft`.
- Primary button: `sf-btn-primary`; secondary: `sf-btn-secondary`.
- Card: `sf-card p-6` with headings in Charcoal Brown and body in Charcoal.
