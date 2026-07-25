---
name: xoch-plan
description: Create an implementation approach and phases for a Xoch job
---

# Xoch - Plan

{{xoch-partial:workflow-boundary.md}}

Use this token-light wrapper for normal `xoch-plan` work.

If you are unfamiliar with Xoch's job model, read:

```text
~/.xoch/prompts/core/foundation-core.md
```

If any required plan workflow detail, artifact shape, state field, phase-index behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/plan-core.md
```

Do not read core prompts unless they are needed.

Identify the active job, read `state.md` and `spec.md`, then use prior context and targeted reads to create the implementation approach. Before full-file reads beyond pointer/state files, run `~/.xoch/bin/token-estimator.sh --batch [files...]` and show the output in your response.

Confirm the spec is accepted and still suitable for one job. If the spec recommends an arc and the job is standalone, ask whether to open an arc before planning.

Draft the plan and phases in chat first, including likely files, validation, risks, acceptance coverage, and the compact state phase index. End with:

```text
Do you want to [A]ccept the plan, or do you have any [M]odifications?
```

Write `plan.md`, `phases.md`, and phase-index state only after `[A]`. Then make the final line:

```text
Ready for next step: `xoch-make`
```
