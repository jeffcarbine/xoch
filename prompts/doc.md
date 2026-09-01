---
name: xoch-doc
description: Create, refresh, repair, or validate Xoch project and feature documentation
---

# Xoch - Doc

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-doc" pending="continue_documentation"}}

Use this token-light wrapper for normal `xoch-doc` work.

`xoch-doc` is a required stop after a passing `xoch-review`, not only an on-demand command.

### Drift Check First

If the engineer's message states a specific documentation goal (create, refresh, repair, packets, or similar), skip this check and go straight to the core process below.

Otherwise — a bare invocation, typically the mandatory post-review gate — check drift before doing anything else:

```bash
~/.xoch/bin/docs-drift.js check --json
```

- No baseline exists yet (`Drift baseline not found`), or drift signals are present: continue to the core process below.
- A baseline exists and shows zero drift signals: skip the core process entirely. When a job is active, record a quick documentation status of "not impacted" — append a one-line note to `notes_dir` via `xoch-actions.js file write --append` (see the file helper rule below), or update `review`/`closure` directly when they already exist. When no job is active, just report there's no drift and stop. This short path does not need to begin the managed workflow — it completes in one step. Route onward per the engineer's stated goal when they gave one; otherwise end with the same PR-vs-close-job choice a full pass ends with (below).

{{xoch-partial:xoch-file-helper-rule.md}}

If you already know the standard `xoch-doc` workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, packet convention, status vocabulary, or routing behavior is missing, read and follow:

```text
~/.xoch/prompts/core/doc-check-core.md
```

That file decides whether a change needs documentation and where; it loads `doc-write-core.md` itself only once writing is actually needed. This wrapper never references the write core directly.

Do not read the core prompt unless it is needed.

{{xoch-partial:estimator-reminder.md}}

For a fresh invocation, identify whether the engineer wants to create, refresh, validate, or repair documentation (or maintain `.xoch/docs/` packets), load only the context needed, and update or confirm docs against current source and job evidence.

When documentation work is complete, put status, targets, and caveats first. Unless the engineer already stated which they want, make the final line an explicit choice rather than asserting one command:

```text
{{xoch-partial:next-choice.md prompt="Ready to wrap up." option_a="[P]ull request" option_b="[C]lose the job without one"}}
```

`[P]` routes to `xoch-pr`; `[C]` routes to `xoch-close-job`. When the engineer's message already states which they want, skip the choice and route directly with `{{xoch-partial:next-step.md command="..."}}` instead.
