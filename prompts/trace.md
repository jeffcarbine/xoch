---
name: xoch-trace
description: Investigate root cause for defects or unclear symptoms
---

# Xoch - Trace

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-trace" pending="continue_trace"}}

If you already know the `xoch-trace` workflow from this conversation, continue from context. Otherwise, or when any workflow detail, trace note shape, routing behavior, artifact path, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/trace-core.md
```

{{xoch-partial:estimator-reminder.md}}

For a fresh invocation, capture the symptom, frame the investigation, inspect only relevant evidence, and avoid code changes unless the engineer explicitly turns the trace into an `xoch-patch` or a job.

When the trace is complete, put evidence, hypotheses, confidence, risks, and recommendations first. Make the final line the next Xoch step, such as:

```text
Ready for next step: `xoch-patch`
```
