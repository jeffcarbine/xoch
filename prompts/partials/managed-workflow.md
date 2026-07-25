## Managed Side Workflow

When a target-model job is active and `{{command}}` is not already the active workflow, preserve the job's prior `next_command` and begin this workflow before asking the first follow-up question:

```bash
~/.xoch/bin/xoch-actions.sh workflow begin --job "[job-id]" --name {{command}} --stage in_progress --pending {{pending}} --return "[prior next command]"
```

If this workflow is already active, resume its recorded stage instead of beginning it again. Before a final approval or confirmation choice, update the workflow with the exact pending action and draft artifact when one exists. After all required wrap-up writes succeed, run `workflow complete` before the final output or any explicitly chained command. Without an active target-model job, continue as chat-only support work without workflow state.
