---
name: xoch-trace
description: Investigate root cause for defects or unclear symptoms
---

# Xoch - Trace

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-trace" pending="continue_trace"}}

Use this token-light wrapper for normal `xoch-trace` work.

If you already know the standard `xoch-trace` workflow from this conversation, continue from that context and do not read the core prompt.

If any required workflow detail, trace note shape, routing behavior, artifact path, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/trace-core.md
```

Do not read the core prompt unless it is needed.

{{xoch-partial:estimator-reminder.md}}

For a fresh invocation, capture the symptom, frame the investigation, inspect only relevant evidence, and avoid code changes unless the engineer explicitly turns the trace into patch or make work.

When the trace is complete, put evidence, hypotheses, confidence, risks, and recommendations first. Make the final line the next Xoch step, such as:

```text
Ready for next step: `xoch-patch`
```
