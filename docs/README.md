# Docs Index (SlideFlow)

Use this index to navigate the docs set. Canonical trackers: `todo.md`, `progress_log.md` (with `backlog.md` / `known_issues.md` kept as pointers).

## Product Overview
- `project_overview.md` — mission, positioning, personas, benefits, boundaries, landing copy.
- `what_is_slideflow_studio.md` — Studio purpose, capabilities, workflow, and boundaries.
- `style-palette.md` — current visual reference (Relaxed Modern Luxury palette).
- `landing-page-sop.md` — landing page CTAs, hero expectations, and consistency checklist.
- `landing_conversion_guide.md` — conversion-first landing page blueprint (sections + copy rules).

## Feature Specs & UX
- `slideboard.md` — SlideBoard UX/behavior, data model, upload paths, and handoff contract.
- `generate_caption_sop.md` — Generate Caption page SOP, behaviors, and extension notes.
- `slide_flow_studio_sop.md` — Studio page SOP, entry points, and current UI behaviors.
- `ai_credit_pricing.md` — AI credits model, pack pricing draft, and cost accounting notes.
- `publish_page_sop.md` — Publish page SOP, data flow, CTA states, scheduling UI.
- `publishing_destination_sop.md` — publish destination rules (one account only) + validation checklist.
- `publishing_safety_invariants.md` — non-negotiable publishing safety rules (no retries, server lock, audit log).
- `brand_profile_plan.md` — plan to restore brand presets/palette/font controls.
- `font_system.md` — centralized font registry + roles (Brand Profile + Studio).
- `slide_flow_calendar_overview.md` — calendar scheduling layout and interactions.

## Platform & Data
- `carousel-flow.md` — end-to-end carousel creation/persistence (current contract + archived edge-function plan).
- `supabase_schema.md` — core tables, policies, triggers, and constraints.
- `meta_connection_setup.md` — Meta (Instagram + Facebook) connection setup, Supabase Auth config, and Edge Function deployment.
- `meta_connection_context.md` — deep context, troubleshooting, deploy notes, and RPC fixes.
- `meta_connection_sop.md` — canonical Meta connect runbook (env, deploy, testing, troubleshooting).
- `n8n_workflows.md` — legacy n8n workflow notes + webhook catalog.
- `sop-media-library-bulk-delete.md` — troubleshooting for Media Library bulk delete.

## Ops & Process
- `team_ops.md` — branching workflow, documentation practices, status template, and current context.
- `kirk-updates.md` — date-stamped engineering change log.

## Trackers
- `todo.md` — single source of truth: backlog + known issues + completed work.
- `backlog.md` — pointer to `todo.md` (kept for compatibility).
- `known_issues.md` — pointer to `todo.md` (kept for compatibility).
- `progress_log.md` — session-by-session progress notes.

## Policy / Meta Review
- `privacy_policy.md` — Meta Privacy Policy source text (used by `scripts/build-policy-docs.mjs`).
- `terms_of_service.md` — Terms of Service source text (used by `scripts/build-policy-docs.mjs`).
- `data_deletion.md` — Data Deletion Instructions source text (used by `scripts/build-policy-docs.mjs`).
- `meta_policy_hosting.md` — how to generate/upload hosted policy URLs.
- `meta_policy_urls.md` — current hosted URLs (dev).
- `policy/instagram-feed-guidelines.pdf` — Meta-facing guidelines reference.
- Generated output: `policy-docs/` (static HTML generated from the three source markdown files above).

## Retired/Merged (for reference)
- `what_is_slideflow.md` → merged into `project_overview.md`.
- `slideboard_usage.md` + `slideboard_ux_spec.md` → merged into `slideboard.md`.
- `sop-carousel-persistence.md` + `build_plan_create_carousel.md` → merged into `carousel-flow.md` (archived plan).
- `webhooks.md` → merged into `n8n_workflows.md`.
- `ai_rules.md` + `branching_guide.md` → merged into `team_ops.md`.
- `slideflow_backlog_codex_prompt.md` → backlog items already ingested into `todo.md`.
