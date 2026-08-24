---
name: xoch-next
description: Review the current phase and advance to the next Xoch phase
---

# Xoch - Next

{{xoch-partial:workflow-boundary.md}}

Use this token-light wrapper for normal `xoch-next` work.

If you already know the standard `xoch-next` workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, snapshot shape, state field, git check behavior, advance behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/next-core.md
```

Do not read the core prompt unless it is needed.

{{xoch-partial:phase-boundary.md}}

For a fresh invocation, inspect only the active job/current phase context, focused phase evidence, and git state needed to review completion. Report the review first. Do not ask a separate catch-up question for manual or external changes; `xoch-make` records follow-up phase evidence.

{{xoch-partial:estimator-reminder.md}}

Ask the adventure-style advance choice:

```text
Ready to move to the next phase? [Y]es or [N]o?
```

If there are no more phases, replace `next phase` with `review`.

After the engineer answers `[Y]`, if phase changes are not committed and pushed, ask:

```text
Git changes detected. What would you like me to do? [C]ommit and push the changes, [G]enerate a commit message for you, or [N]othing?
```

`[G]` drafts and prints a commit message only — it never runs `git commit`, `git add`, or `git push`.

When the phase is advanced, put snapshots, updates, notes, validation, and commit/push status first. Make the final line the next Xoch step, such as:

```text
Ready for next step: `xoch-make`
```

After advancing, do not start the next phase. Stop after the final next-step line.
