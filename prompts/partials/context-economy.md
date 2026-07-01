## Context Economy

Treat token budgets as pressure to be selective, not targets to fill.

Before reading a file, check whether this conversation already contains enough current context for the decision at hand. Do not reread files just to reacquire background you already have. Reread only when exact text, fresh state, line numbers, recent edits, or validation evidence matter.

Before any full-file read beyond active Xoch pointer/state files, run the estimator on the candidate files:

```bash
~/.xoch/bin/tokenEstimator.sh --batch [files...]
```

Prefer the smallest useful read:

- use `rg`, `git diff`, `git status`, file outlines, or targeted line ranges before full-file reads
- read snippets around relevant symbols before reading whole files
- if a useful read would exceed budget, ask the engineer whether to narrow, proceed anyway, or rely on existing context

Report the estimate when:

- the estimated read exceeds half the relevant prompt budget
- any single file is large enough to affect the read strategy
- you choose snippets, search, diffs, or prior context instead of reading a full file
- you ask the engineer whether to exceed budget

When recording token usage, distinguish files actually read from files only inspected by search, diff, or prior conversation context.
