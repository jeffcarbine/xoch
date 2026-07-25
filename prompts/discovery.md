---
name: xoch-discovery
description: Resolve important unknowns before specification or implementation
---

# Xoch - Discovery

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-discovery" pending="continue_discovery"}}

Use this token-light wrapper for normal `xoch-discovery` work.

If you already know the standard discovery workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, source-handling rule, note shape, confidence rule, or routing behavior is missing, read and follow:

```text
~/.xoch/prompts/core/discovery-core.md
```

Do not read the core prompt unless it is needed.

Identify the unknown, the decision it blocks, and what would count as enough confidence to proceed. Use the engineer's knowledge, relevant local files or images, supplied external documentation, targeted web research when appropriate, and model background knowledge with clear source labels.

Do not treat model memory, inference, or outdated external material as verified fact. Do not implement changes during discovery.

When findings are ready for review, end with:

```text
Do you want to [A]ccept the findings, request [M]odifications, or [R]esearch further?
```

After accepted findings are recorded, make the final line the appropriate return step, usually:

```text
Ready for next step: `xoch-spec`
```
