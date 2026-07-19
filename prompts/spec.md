---
name: xoch-spec
description: Capture Xoch job requirements and acceptance criteria
---

# Xoch - Spec

Use this token-light wrapper for normal `xoch-spec` work.

If you are unfamiliar with Xoch's job model, read:

```text
~/.xoch/prompts/core/foundation-core.md
```

If any required spec workflow detail, artifact shape, state field, arc-fit behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/spec-core.md
```

Do not read core prompts unless they are needed.

Identify the active job from `.xoch/work/current.md` or legacy `.xoch/context/current.md`. A job ID, title, branch name, file name, or project context is not enough to draft a spec.

Before drafting, require engineer-provided source requirements: a problem statement, desired outcome, issue text, pasted notes, explicit acceptance criteria, or direct answers to clarification questions. If the engineer invoked `xoch-spec` without providing requirements, stop and ask them to provide the spec source. Do not invent requirements from the job name.

Once source requirements exist, clarify scope, acceptance criteria, constraints, docs, risks, and current-state impact.

If a material requirement or decision remains unknown and the engineer cannot provide enough information, do not fill the gap with inference. Explain what the unknown blocks and recommend `xoch-discovery`. Ask:

```text
This spec has an unresolved unknown. Start discovery? [Y]es / [N]o
```

If `[Y]`, leave the spec in progress and route to `xoch-discovery`. If `[N]`, continue only when the engineer explicitly accepts a documented assumption, narrows the spec, or defers the affected requirement.

Before writing, decide whether this is one focused job or should become an arc with multiple jobs. If it is arc-sized, recommend `xoch-open-arc` and ask whether to continue, narrow, or open the arc.

Draft the spec in chat first. End with:

```text
Do you want to [A]ccept the spec, or do you have any [M]odifications?
```

Write `spec.md` only after `[A]`. Then update state and make the final line:

```text
Ready for next step: `xoch-plan`
```
