# Team Ops & Working Agreements

## Branching & Experiments
1. Save a clean snapshot from your current state:  
   `git checkout -b <name>-snapshot` → `git add .` → `git commit -m "snapshot: <what you saved>"`
2. Return to your main experiment branch (e.g., `git checkout kirk/experiments`).
3. Start a fresh experiment from the snapshot:  
   `git checkout -b <name>/new-experiment <name>-snapshot`
4. Build on the new experiment branch; open a PR toward your fork’s main (or upstream target) when ready.

### Daily workflow tips
- Commit small, logical chunks with clear messages.
- If a branch drifts, create a new snapshot and branch again rather than force-pushing.
- When a design feels “approved,” PR from the experiment branch to your fork’s main, merge, then PR from your fork’s main to upstream.
- Keep `docs/progress_log.md` updated at the end of each work session (date-stamped bullets of what changed and why).
- Keep `docs/todo.md` updated when priorities/issues change.

## Progress Log Discipline
- After every session, append a dated entry to `docs/progress_log.md` noting what changed, current status shifts, and next suggested steps.

## Status Response Pattern
- When asked for updates or next steps, reply using:  
  `Progress:` one-line summary of recent changes.  
  `Status:` concise current state/blockers.  
  `Next:` recommended immediate actions (comma-separated).

## Documentation Practices
- Preserve historical context; prefer additive edits or clearly summarized rewrites over silent overwrites.
- Keep originals when they add value; if consolidating, ensure all facts migrate to the canonical doc.

## Initiative
- If ambiguities arise (new tasks, missing info), ask clarifying questions and propose next actions rather than waiting for prompts.

## Current Context
- Latest theme and hero changes live on the working branches with the “Relaxed Modern Luxury” palette and updated logo at `public/logo.png`.
- Style picker visually represents Minimalist/Bold/Elegant with distinct color/type treatments.
- Landing hero messaging focuses on Instagram carousels with a subtle sheen on the second line and refined CTAs.
