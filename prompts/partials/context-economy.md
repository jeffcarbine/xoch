## Context Economy

Treat token budgets as pressure to be selective, not targets to fill.

Before reading a file, check whether this conversation already contains enough current context for the decision at hand. Do not reread files just to reacquire background you already have. Reread only when exact text, fresh state, line numbers, recent edits, or validation evidence matter.

Prefer the smallest useful read:

- use `rg`, `git diff`, `git status`, file outlines, or targeted line ranges before full-file reads
- read snippets around relevant symbols before reading whole files
- estimate broad reads with `~/.xoch/bin/tokenEstimator.sh --batch [files...]`
- if a useful read would exceed budget, ask the engineer whether to narrow, proceed anyway, or rely on existing context

When recording token usage, distinguish files actually read from files only inspected by search, diff, or prior conversation context.
