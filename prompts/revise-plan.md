---
name: xoch-revise-plan
description: Revise the implementation plan or remaining phases for an active Xoch job
---

# Xoch - Revise Plan

Use this token-light wrapper for normal `xoch-revise-plan` work.

If you already know the standard `xoch-revise-plan` workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, plan revision shape, phase update behavior, state field, routing behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/revise-plan-core.md
```

Do not read the core prompt unless it is needed.

For a fresh invocation, identify the active job, confirm the spec remains valid, clarify what implementation path changed, and preserve completed phase history before editing remaining plan or phase details.

When the plan revision is complete, put revision details, updated paths, current phase, caveats, and validation first. Make the final line the next Xoch step, such as:

```text
Ready for next step: `xoch-make`
```
