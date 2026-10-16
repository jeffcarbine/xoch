## Pending Workflow Boundary

Before starting this command, run `xoch job current --json`. This reads the canonical `.xoch/work/current.json` pointer.

If `workflow` is `null`, continue normally. If a workflow is active, read and follow the full resume/finish/abandon protocol before doing anything else:

```text
~/.xoch/prompts/core/workflow-boundary-core.md
```
