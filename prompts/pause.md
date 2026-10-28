---
name: xoch-pause
description: Pause the active Xoch job
---

# Xoch - Pause

{{xoch-partial:workflow-boundary.md}}

Pause the active job so another job can become current without losing progress: summarize it, preserve its job folder, update its state, and clear its current pointer.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Find Active Job

Use the `xoch job current --json` result from the workflow boundary. If no job is active, say there is nothing to pause and stop.

### Step 2: Load Job State

{{xoch-partial:job-evidence.md}}

Read:

- job state, via `xoch state get --job "[job-id]" --json`
- `spec`, when returned
- phases, via `xoch phase get --job "[job-id]" --json`, when the job has a plan

### Step 3: Summarize

Show the job ID and title, arc (if any), status, current phase, next command, job directory, brief goal, and phase progress.

### Step 4: Confirm Pause

Ask the engineer to confirm. If confirmed, run:

```bash
xoch state set --job "[job-id]" --field status --value paused
xoch state set --job "[job-id]" --field next_command --value xoch-open
xoch pointer clear --job "[job-id]"
```

If a helper refuses, report the refusal; do not edit job state or `current.json` by hand.

For a multi-project job, write paused state through the primary job and sync it first. Then clear only the invoking repository's pointer, unless the engineer explicitly asks to pause the job in every participant repository.

### Step 5: Output

End with:

```text
Job paused.
{{xoch-partial:next-step.md command="xoch-open [job-id]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Do not delete job files.
- Do not archive the job.
- Do not modify phase completion status.
