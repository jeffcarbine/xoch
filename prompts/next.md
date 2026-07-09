---
name: xoch-next
description: Review the current phase and advance to the next Xoch phase
---

# Xoch - Next

Use this token-light wrapper for normal `xoch-next` work.

If you already know the standard `xoch-next` workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, snapshot shape, state field, git check behavior, advance behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/next-core.md
```

Do not read the core prompt unless it is needed.

{{xoch-partial:phase-boundary.md}}

For a fresh invocation, inspect only the active job/current phase context, focused phase evidence, and git state needed to review completion. Report the review first. Do not ask a separate catch-up question for manual or external changes; `xoch-make` records follow-up phase evidence.

Before any full-file read beyond active Xoch pointer/state files, run `~/.xoch/bin/tokenEstimator.sh --batch [files...]` and use snippets/search/diffs when that is enough.

Ask the adventure-style advance choice:

```text
Ready to move to the next phase? [Y]es or [N]o?
```

If there are no more phases, replace `next phase` with `review`.

After the engineer answers `[Y]`, if phase changes are not committed and pushed, ask:

```text
Changes haven't been committed and pushed to git yet. Would you like me to [C]ommit and push them for you, or [N]o?
```

When the phase is advanced, put snapshots, updates, notes, validation, and commit/push status first. Make the final line the next Xoch step, such as:

```text
Ready for next step: `xoch-make`
```

After advancing, do not start the next phase. Stop after the final next-step line.
