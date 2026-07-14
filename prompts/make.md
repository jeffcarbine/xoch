---
name: xoch-make
description: Implement or guide implementation for the current Xoch phase
---

# Xoch - Make

Use this token-light wrapper for normal `xoch-make` work.

If you already know the standard `xoch-make` workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, artifact shape, state field, action choice behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/make-core.md
```

Do not read the core prompt unless it is needed.

{{xoch-partial:phase-boundary.md}}

For a fresh invocation, inspect only the active job/current phase context needed to brief the engineer. Give a compact overview of the phase, likely files, acceptance criteria, validation, and risks, then end with the adventure-style implementation choice:

Before any full-file read beyond active Xoch pointer/state files, run `~/.xoch/bin/token-estimator.sh --batch [files...]` and use snippets/search/diffs when that is enough.

```text
How would you like to proceed? [E]ngineer builds, [A]gent builds, or [C]ollaborate?
```

Do not implement until the engineer chooses, unless they already made the choice in the same message.

After the initial `[E]`, `[A]`, or `[C]` choice, treat any follow-up edits, validation, manual checks, skipped checks, or engineer decisions in the same phase conversation as phase evidence. Record those details before routing to `xoch-next`.

After current phase work is complete, do not start, inspect, or implement the next phase. Stop after routing to `xoch-next`.

When phase work is complete, put details first and make the final line:

```text
Ready for next step: `xoch-next`
```
