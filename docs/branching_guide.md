# Branching & Experiment Workflow

These steps keep experiments isolated and make it easy to preserve snapshots before trying new ideas.

## Snapshot and Experiment Flow
1. Save a clean snapshot from your current working state:
   - `git checkout -b <name>-snapshot` (e.g., `kirk/storyboard-snapshot`)
   - `git add .`
   - `git commit -m "snapshot: <what you saved>"`
2. Return to your main experiment branch:
   - `git checkout kirk/experiments` (or your current working branch)
3. Start a fresh experiment from the saved snapshot:
   - `git checkout -b <name>/new-experiment <name>-snapshot`
4. Keep hacking on the new experiment branch. When ready, open a PR toward your fork’s main (or the upstream target) to review changes.

## Daily Workflow Tips
- Commit small, logical chunks with clear messages (e.g., `chore: apply relaxed luxury palette`, `feat: styled bold/elegant cards`, `chore: swap logo asset`).
- If a branch drifts, create a new snapshot and branch again rather than force-pushing over shared work.
- When a design feels “approved,” open a PR from the experiment branch to your fork’s main, review, then merge. After that, open a PR from your fork’s main to Zach’s upstream main.
- Keep `docs/progress_log.md` updated at the end of each work session (date-stamped bullets of what changed and why).

## Current Context
- Latest theme and hero changes live on your working branch with the “Relaxed Modern Luxury” palette and updated logo at `public/logo.png`.
- Style picker visually represents Minimalist/Bold/Elegant with distinct color/type treatments.
- Landing hero messaging is focused on Instagram carousels with a subtle sheen on the second line and refined CTAs.
