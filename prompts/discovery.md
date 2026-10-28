---
name: xoch-discovery
description: Resolve important unknowns before specification or implementation
---

# Xoch - Discovery

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-discovery" pending="continue_discovery"}}

For the workflow's `--return`, use the command to resume after discovery: `xoch-open` when discovery came from the open/spec flow, `xoch-revise` when an accepted spec must change, otherwise the job's prior `next_command`. Never `xoch-discovery` itself.

If you already know the discovery workflow from this conversation, continue from context. Otherwise, or when any workflow detail, source-handling rule, note shape, confidence rule, or routing behavior is missing, read and follow:

```text
~/.xoch/prompts/core/discovery-core.md
```

{{xoch-partial:estimator-reminder.md}}

Identify the unknown, the decision it blocks, and what would count as enough confidence to proceed. Use the engineer's knowledge, relevant local files or images, supplied external documentation, targeted web research when appropriate, and model background knowledge with clear source labels.

Do not treat model memory, inference, or outdated external material as verified fact. Do not implement changes during discovery.

When findings are ready for review, end with:

```text
Do you want to [A]ccept the findings, request [M]odifications, or [R]esearch further?
```

After accepted findings are recorded, make the final line the appropriate return step, usually:

```text
{{xoch-partial:next-step.md command="xoch-open"}}
```
