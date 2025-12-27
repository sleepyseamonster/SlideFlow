# Publishing Destination SOP (non-negotiables)

## Purpose
Ensure SlideFlow publishes a carousel **only** to the destination explicitly selected on the **Publish page**, and never to any other connected accounts.

## Definitions
- **Connected account**: A single Meta destination represented by one `connected_account` row (IG professional account + its linked Facebook Page).
- **Publish-page selected account**: The one destination chosen in the Publish UI (e.g., `selectedConnectedAccountId`).
- **Platforms**: The destination toggles on the Publish page (`Instagram`, `Facebook`).

## Core rule (must never change)
When the user clicks **Publish**, the app must publish the carousel **only** to the **Publish-page selected account** (and only to the platforms toggled on the Publish page).  
It must **not** publish to:
- Any other connected accounts
- “Default” accounts from Profile (except as an initial UI preselection)
- All accounts for the user

## Implementation requirements
- The Publish request payload must include an explicit `connected_account.id` (destination) + selected platforms.
- Backend must use **only that** `connected_account.id` to load tokens/ids; no fallback to any other account.
- If no destination is selected (missing/invalid `connected_account.id`), publishing must be blocked with a clear UI error.
- Never iterate over the user’s connected accounts for publishing.
- Prevent duplicate publishes by checking `posting_log` (posted) and `carousel.status='published'` before posting. Manual retry is allowed after a failed attempt (no automatic retries) and only if no platform posted.
- Log every platform publish attempt to `posting_log` for auditability and App Review traceability.

## QA / test checklist
- With 2+ connected accounts:
  - Select account A on Publish page → publish → verify only account A posts.
  - Select account B on Publish page → publish → verify only account B posts.
- Toggle behavior:
  - Instagram ON / Facebook OFF → posts only to Instagram for the selected account.
  - Instagram OFF / Facebook ON → posts only to Facebook Page for the selected account.
  - Both ON → posts to both for the selected account.
- Safety regression:
  - Confirm no network requests attempt to publish using any account id other than the selected one (inspect payload/logs).
