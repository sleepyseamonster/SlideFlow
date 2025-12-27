# SlideFlow Studio — UX Specification

## Purpose
SlideFlow Studio is a **lightweight, AI‑assisted creative workspace** for making small but powerful edits to images used in carousels. It is not a full design tool. It exists to remove friction, not add options.

Users should feel:
- Calm within seconds
- Confident clicking anything
- In control of AI (not the other way around)

---

## Core Design Philosophy (Non‑Negotiables)

### What this is
- A **focused creative workspace**
- A **safe sandbox** for experimentation
- A **bridge** between raw images and final carousel slides

### What this is NOT
- Not Photoshop
- Not Figma
- Not a generative art playground

### Principles
- Fewer controls, smarter defaults
- Progressive disclosure
- Everything reversible
- No destructive actions without confirmation
- Beginner‑safe by default

---

## Page Layout Overview

**Overall structure**: Three‑column layout (Canva‑inspired, but calmer)

1. Left Sidebar — Tools
2. Center Canvas — Image Workspace
3. Right Panel — Properties & AI Controls

The layout must feel stable and predictable at all times.

---

## Left Sidebar — Tools

### Purpose
This is the *“What can I do?”* area. Nothing here should feel advanced or intimidating.

### Tool Groups (Top → Bottom)

#### 1. Essentials
- Crop / Resize
- Aspect Ratio (1:1, 4:5)

#### 2. AI Quick Actions
- Background Remove
- Background Replace
- AI Upscale (one‑click upscaler)

#### 3. Text & Branding
- Add Text
- Image Overlay
- Brand Profile (session defaults)

#### 4. Advanced AI
- Full Image Edit (Nano Banana)

Session control:
- A Brand Profile selector sits above the tool list so it reads as a session-wide setting, not a per-tool action.

---

### Tool Behavior
- Icon + label (no icons alone)
- Hover reveals a one‑line explanation
- Active tool is visually locked
- Only one tool active at a time

---

## Center Canvas — Image Workspace

### Purpose
This is the emotional core of the page.

The canvas should feel:
- Quiet
- Focused
- Gallery‑like

### Behavior
- Large image preview centered but limited to a narrower max width so the page stays composed
- Neutral background (no grids by default)
- Zoom controls: crop-only zoom slider shown under the preview when cropping (other tools reuse the last crop framing for the session)
- Subtle drop shadow around image

### Interaction Rules
- Click image to select
- Drag handles appear only when relevant
- No permanent overlays

---

## Right Panel — Properties & AI Controls

### Purpose
This panel answers: *“What happens if I do this?”*

It must feel safe and explanatory.

---

### Panel Structure

#### Section 1 — Tool Context
Shows:
- Tool name
- Short explanation
- What will change

Example:
> **Background Removal**  
> Removes the background behind the main subject. You can undo this at any time.

---

#### Section 2 — Controls (Minimal)
Only show controls relevant to the selected tool.

Examples:
- Crop: aspect selector + reset
- Text: font size, alignment, color
- Brand colors: palette picker

No advanced sliders unless absolutely required.

---

#### Section 3 — AI Prompt (When Applicable)
Only visible for Nano Banana edits.

- Natural‑language prompt field
- Placeholder example
- Character‑limited

Example placeholder:
> “Make the background a soft neutral gradient and brighten the subject slightly.”

---

#### Section 4 — Actions (Tool‑Specific Only)

No generic “Actions” block is rendered. Each tool surfaces only the controls it needs (e.g., Remove Background, Upscale, Generate).

---

## AI Interaction Design

### Background Removal
- One click
- Immediate preview
- Auto‑save disabled until user confirms

### Background Replace
- Preset styles first
- Optional text prompt
- Preview before apply

### Full Image Edit (Nano Banana)

This must feel **special but safe**.

#### UX Requirements
- Explicit labeling: “Advanced AI Edit”
- Warning copy: *“This may significantly change the image”*
- Preview before commit

#### Flow
1. User writes prompt
2. System generates preview
3. User compares before / after
4. User confirms or discards

No silent overwrites.

---

## Brand Profile Integration

### Behavior
- Brand colors auto‑suggested
- Default text styles applied automatically
- User can override per image

### UX Rule
Brand should feel *assistive*, not restrictive.

---

## State Awareness & Navigation

### Breadcrumb Context (Optional)
A breadcrumb can be shown to orient the user within the workflow:

`Carousel → Studio → Publish`

- The current step (**Studio**) is visually emphasized
- Other steps are muted and non-interactive

In the current build, the header is intentionally minimal and uses a single Back link instead of a breadcrumb.

---

## Undo, History & Versioning

### Undo / Redo
- Undo and Redo controls must be persistently visible
- Hover tooltip explains the action (e.g. “Undo last change”)

### Versioning
- Every applied change creates a new version
- The original image is always preserved
- Users can revert to any previous version

Versioning should be implicit and reassuring, not a complex UI.

---

## Save & Export Model

### Save Options
- Save to Media Library
- Save as Slide Variant

### Export Options
- PNG (default)
- Transparent background (if applicable)

### Safety
- No auto‑overwrite
- Version history visible

---

## Beginner‑First Safeguards

### First‑Time Guidance
- Subtle, inline helper text appears only on first interaction
- Guidance disappears automatically after the user completes an action
- No modals, no forced walkthroughs

Examples:
- “Select a tool on the left to begin.”
- “You can undo any change at any time.”

### Error Handling
- Errors must be explained in plain language
- The system must always state what happened and what did not change

Example:
> “The AI edit couldn’t be completed. Your original image is unchanged.”

---

### Accessibility & Inclusivity
- High‑contrast defaults
- Click targets sized for easy interaction
- No critical information conveyed by color alone

---

- First‑time tool tooltips
- Clear undo history
- No hidden gestures
- No keyboard‑only shortcuts required

---

## Copy Tone Guidelines

- Calm
- Reassuring
- Short sentences
- No jargon

### Examples

Bad:
> “Apply advanced generative transformation.”

Good:
> “Use AI to edit the image in natural language.”

---

## What Makes SlideFlow Studio Feel Unique

- Fewer tools, better defaults
- AI framed as *assistance*, not magic
- Clear separation between simple edits and advanced AI
- Tight integration with the carousel workflow

---

## Explicit Non‑Goals

- Layer timelines
- Complex typography controls
- Vector tools
- Manual masking

If a feature adds cognitive load, it does not belong here.

---

## Performance & Responsiveness

- All non‑AI actions should feel instantaneous
- AI actions must clearly communicate progress
- The UI must never freeze or block navigation

Perceived speed is more important than raw speed.

---

## Visual & Interaction Polish

- Consistent spacing rhythm throughout the UI
- Subtle transitions (100–150ms) for panel changes
- No abrupt layout shifts
- One restrained moment of delight (e.g. subtle glow on AI completion)

---

## Studio UX Invariants (Must Always Hold)

These rules are **non‑negotiable**. Any future feature or UI change must preserve them.

1. **Every action is safe**  
   Users must always be able to undo or revert. No silent commits.

2. **One primary focus at a time**  
   Only one image, one tool, one intent should be active.

3. **No unexplained states**  
   If something takes time, the UI must explain why.

4. **Progress over perfection**  
   The UI should gently push users forward, not invite endless tweaking.

5. **AI confirms intent, never surprises**  
   AI actions must explain what will change before they run.

6. **Beginner clarity beats power features**  
   If a feature adds cognitive load, it must be hidden, deferred, or removed.

---

## Success Criteria

The page is successful if:
- A beginner can confidently apply one edit in under 30 seconds
- A power user can make meaningful edits without frustration
- The UI never feels crowded or overwhelming

---

## Implementation Status (Current Build)

The current Studio page matches the layout and tone of this spec, with some editing actions wired as preview-only.

What is live now:
- Three-column layout (tools, canvas, properties) with stable spacing.
- Minimal header with a Back link (breadcrumb hidden).
- Tool groups with one active tool at a time.
- Center canvas framing and a slide filmstrip (thumbnails when slides exist).
- Studio Preview header includes “Add files” (local file picker) + “Media Library” CTAs.
- Navigation state support to return to Generate or Publish with caption/carousel context.
- Crop preview supports drag-to-reframe with a rule-of-thirds overlay when Crop is active (preview-only UI).
- Background Remove calls a server-side Edge Function to generate a transparent PNG preview (no persistence yet).
- Background Replace supports preview via fal.ai: either upload a reference background image or provide a background prompt (preview-only; no persistence yet).
- AI Upscale runs via Edge Function with a fixed model label, progress state, and cancel.
- Image Overlay tool: upload overlay, size slider, 3×3 placement, preview-only.
- Add Text overlays with per-slide control set and draggable placement.
- Undo/Redo controls are visible and wired to local history.
- Save/Export renders the current preview to PNG; Save writes to the media library.

What is still UI-only:
- Crop/resize persistence (generating/saving a new media version) and apply/commit flow.
- Background replace and smart enhance actions.
- AI edit finalization and async status handling.
- Persistence of preview edits back into carousel slides/versions.

---

## Final Note

SlideFlow Studio should feel like:

> “I didn’t think I knew how to edit images — but this makes sense.”

If anything breaks that feeling, it should be removed.
