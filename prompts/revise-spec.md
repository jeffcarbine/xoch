---
name: xoch-revise-spec
description: Revise the foundational specification for an active Xoch job
---

# Xoch - Revise Spec

{{xoch-partial:workflow-boundary.md}}

Use this token-light wrapper for normal `xoch-revise-spec` work.

If you already know the standard `xoch-revise-spec` workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, spec revision shape, state field, routing behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/revise-spec-core.md
```

Do not read the core prompt unless it is needed.

For a fresh invocation, identify the active job, clarify what requirement changed, assess impact on acceptance criteria, phases, docs, and state, then revise only after the engineer confirms the intended change.

When the spec revision is complete, put revision details, updated paths, impact, caveats, and validation first. Make the final line the next Xoch step, such as:

```text
Ready for next step: `xoch-revise-plan`
```
