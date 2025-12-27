# SlideFlow Overview

## Purpose & Positioning
- SlideFlow is a fast, simple, AI-powered tool for turning ideas into Instagram carousels—without heavy graphic design software.
- It focuses on assembling, captioning, scheduling, and publishing carousels quickly, with a lightweight Studio for simple image prep. It is **not** a full graphics tool, advanced image editor, or AI image generator.
- Built for creators, small business owners, coaches/consultants, marketers, and agencies who want production-quality carousels with minimal effort.
- Users authenticate via Supabase, subscribe via Stripe, and work in single-user workspaces (no sharing yet).

## Why It Matters (Problems We Solve)
- Posting carousels by hand is slow and tedious.
- Graphic design tools add friction most users don’t want.
- Staying consistent is hard without brand defaults.
- Writing engaging captions is tiring; AI assistance reduces the load.

## Key Benefits
- Fast carousel creation with drag-and-drop story building.
- No design skills required; saved brand colors/fonts keep visuals consistent.
- AI-powered captions tuned to the user’s images and prompts.
- Simple image cleanup and on-brand overlays via Studio.
- Direct Instagram posting and scheduling for consistency.
- Export individual slides any time for reuse.

## Who It’s For (Personas)
- **Busy Creator:** wants consistent posting without heavy tooling.
- **Small Business Owner:** needs professional marketing content without hiring designers.
- **Coach/Consultant:** shares educational content with quick turnaround.
- **Social Media Manager / Agency:** produces multiple carousels weekly with streamlined workflows.
- **Marketer:** turns ideas/tips into posts in minutes.

## How It Works (User Journey)
1. Capture an idea.
2. Upload supporting images.
3. Arrange the story as a carousel.
4. Apply brand colors/fonts from the saved profile.
5. Write or generate the caption with AI.
6. Publish now or schedule on the calendar.
7. Export slides when needed.

## Boundaries & MVP Scope
- **Does:** assemble/organize slides, generate captions with AI, store brand colors/fonts, perform light image prep in Studio, post/schedule to Instagram, export updated images.
- **Does not:** perform advanced image editing or multi-layer design, inpaint/outpaint, create images from scratch, or offer complex typography/retouching suites.
- **MVP components:**
  - Accounts: Supabase Auth (Google live; others later), one account per user.
  - Billing: Stripe subscriptions (entry tier ~$9/mo) tied to Supabase users.
  - Media intake: uploads + optional AI generation (FAL or similar) stored in the `media` bucket.
  - Brand assets: HEX palettes; fonts limited to presets until expanded.
  - Carousel builder: enforce a slide-count cap (TBD) and handle export renditions.
- **Constraints:** single-user workspaces; HEX-only palettes (no HSL/accessibility tooling yet); final export format and AI usage quotas still pending.

## Stack Snapshot
- **Frontend:** Bolt app; handles UI, uploads to Supabase Storage, and n8n webhook calls.
- **Automation:** n8n workflows for ingestion, carousel assembly, posting, etc.
- **Backend of record:** Supabase Postgres + Storage with strict RLS per `user_id` and bucket policies.
- **Payments:** Stripe + Supabase; quotas derived from the `usage_quota` table.

## Landing Page Messaging (Copy Reference)
- **Headline:** Create Instagram Carousels in Minutes—No Design Skills Needed
- **Sub-headline:** Turn your ideas into scroll-stopping carousels with AI-powered captions and effortless slide organization.
- **Value prop:** Upload images, arrange slides, generate captions, and post directly to Instagram—no design software required.
- **Feature bullets:**
  - Drag-and-drop story builder
  - AI-written, scroll-stopping captions
  - Saved brand colors & fonts for consistency
  - Direct Instagram posting (plus scheduling)
  - No design tools needed
- **Use-case highlights:** creators, businesses, coaches/consultants, marketers/agencies.
- **CTA:** Start creating carousels the easy way.

## Near-Term Roadmap
1. Ship `/ingest` workflow and carousel automation end-to-end (media → slides → derivatives).
2. Add curated font options + AI-assisted layout suggestions.
3. Build `/search` for media discovery with pagination + filters.
4. Explore direct Instagram publishing + richer pricing tiers.
5. Long-term: multi-user teams/workspaces once the single-player experience is stable.
