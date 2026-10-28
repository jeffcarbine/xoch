## Managed Side Workflow

When a job is active and `{{command}}` is not already the active workflow, begin it before the first follow-up question, preserving the job's prior `next_command`:

```bash
xoch workflow begin --job "[job-id]" --name {{command}} --stage in_progress --pending {{pending}} --return "[prior next command]"
```

- If this workflow is already active, resume its recorded stage instead of beginning it again.
- Before a final approval or confirmation choice, update the workflow with the exact pending action and any draft artifact.
- After all required wrap-up writes succeed, run `workflow complete` before the final output or any explicitly chained command.
- With no active job, continue as chat-only support work without workflow state.
