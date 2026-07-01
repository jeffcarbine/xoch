---
name: xoch-revise-arc
description: Revise an existing Xoch arc
---

# Xoch - Revise Arc

Use this token-light wrapper for normal `xoch-revise-arc` work.

If you already know the standard `xoch-revise-arc` workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, arc revision shape, membership behavior, state field, routing behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/revise-arc-core.md
```

Do not read the core prompt unless it is needed.

For a fresh invocation, identify the arc, clarify what changed, assess affected jobs, and do not update job back-references unless the engineer confirms it.

When the arc revision is complete, put revision details, updated paths, membership changes, caveats, and follow-up first. Make the final line the next Xoch step, such as:

```text
Ready for next step: `xoch-open-job`
```
