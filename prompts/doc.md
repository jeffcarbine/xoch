---
name: xoch-doc
description: Create, refresh, repair, or validate Xoch project and feature documentation
---

# Xoch - Doc

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-doc" pending="continue_documentation"}}

`xoch-doc` is a required stop after `xoch-do`'s `final_review` passes, as well as an on-demand command.

## Drift Check First

If the engineer states a specific documentation goal (create, refresh, repair, or similar), skip this check and go to the core process.

Otherwise (a bare invocation, typically the post-review gate), check drift first:

```bash
xoch docs-drift check --json
```

- No baseline yet (`Drift baseline not found`), or drift signals present: continue to the core process. A pass that ends with settled documentation writes a fresh baseline.
- A baseline with zero drift signals, and the active job's spec records a version bump: continue to the core process so the bump is applied.
- A baseline with zero drift signals, and no Version Impact (or `none`): skip the core process. This short path completes in one step and does not begin the managed workflow.
  - With an active job, record `xoch state set --job "[job-id]" --field documentation_status --value "not impacted"` (`xoch job close` requires it) and append a one-line note to `notes_dir` with `xoch file write --append`. Then route as in Output.
  - With no active job, report that there is no drift and stop.

{{xoch-partial:xoch-file-helper-rule.md}}

## Core Process

If you already know the `xoch-doc` workflow from this conversation, continue from context. Otherwise, or when any workflow detail, version-impact handling, status vocabulary, or routing behavior is missing, read and follow:

```text
~/.xoch/prompts/core/doc-check-core.md
```

It decides whether a change needs documentation and where, and loads the write core itself when writing is needed.

{{xoch-partial:estimator-reminder.md}}

For a fresh invocation, identify whether the engineer wants to create, refresh, validate, or repair documentation, load only the context needed, and update or confirm docs against current source and job evidence.

## Output

When documentation work is complete, put status, targets, and caveats first. Unless the engineer already stated which they want, make the final line name both valid next commands:

```text
{{xoch-partial:next-step-choice.md command_a="xoch-pr" command_b="xoch-close"}}
```

This is a routing line, not an in-session action; either command needs its own fresh invocation. When the engineer already stated which they want, or `doc-check-core.md` routes elsewhere (`xoch-do` or `xoch-map`), end with `{{xoch-partial:next-step.md command="..."}}` instead.
