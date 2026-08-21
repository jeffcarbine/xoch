## Context Economy

Treat token budgets as pressure to be selective, not targets to fill.

Before reading a file, check whether this conversation already contains enough current context for the decision at hand. Do not reread files just to reacquire background you already have. Reread only when exact text, fresh state, line numbers, recent edits, or validation evidence matter.

Before any full-file read beyond active Xoch pointer/state files, run the estimator on the candidate files:

```bash
~/.xoch/bin/token-estimator.js --batch [files...]
```

Prefer the smallest useful read:

- use `rg`, `git diff`, `git status`, file outlines, or targeted line ranges before full-file reads
- read snippets around relevant symbols before reading whole files
- if a useful read would exceed budget, ask the engineer whether to narrow, proceed anyway, or rely on existing context

When building understanding of existing, unfamiliar code before working on it, prefer this order: nearby README/doc context first, then its tests (when present and current), then raw source — stop as soon as you understand enough to proceed. This is a preference, not a gate: fall back straight to source when no README exists, or when tests are missing, sparse, or don't cover the area in question. It does not apply when reviewing an actual diff or change — reviewing still requires reading the real change regardless of what tests describe.

Always show the estimator's output in your response before the read proceeds — this is not conditional on budget size or read strategy.

When recording token usage, distinguish files actually read from files only inspected by search, diff, or prior conversation context.
