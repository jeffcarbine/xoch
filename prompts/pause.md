---
name: xoch-pause
description: Pause the active Xoch job
---

# Xoch - Pause

Pause the active job so another job can become current without losing progress.

## Purpose

Summarize the active job, preserve its job folder, update job state, and clear `.xoch/work/current.md`.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Find Active Job

Read:

```text
.xoch/work/current.md
```

If absent, check `.xoch/context/current.md` for a legacy migration job.

If no active job exists, say there is nothing to pause and stop.

### Step 2: Load Job State

For target-model jobs, read:

- `.xoch/work/jobs/[job-id]/state.md`
- `.xoch/work/jobs/[job-id]/spec.md` when present
- `.xoch/work/jobs/[job-id]/phases.md` when present

For legacy jobs, read the corresponding `.xoch/context/[job-id]/` files without moving them.

### Step 3: Summarize

Show:

- job ID and title
- optional arc
- status
- current phase
- next command
- job directory
- brief goal
- phase progress

### Step 4: Confirm Pause

Ask the engineer to confirm.

If confirmed:

1. Prefer deterministic helpers:

   ```bash
   ~/.xoch/bin/xoch-actions.sh state set --job "[job-id]" --field status --value paused
   ~/.xoch/bin/xoch-actions.sh state set --job "[job-id]" --field next_command --value xoch-resume
   ~/.xoch/bin/xoch-actions.sh pointer clear --job "[job-id]"
   ```

2. If helpers are unavailable, update `state.md` and remove `.xoch/work/current.md` only if it points to this job. For legacy jobs, remove `.xoch/context/current.md` only if it points to this job.

For a multi-project job, write paused state through the primary job and sync it first. Then clear only the pointer in the repository where `xoch-pause` was invoked unless the engineer explicitly asks to pause the job in every participant repository.

### Step 5: Output

End with:

```text
Job paused.
{{xoch-partial:next-step.md command="xoch-resume [job-id]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Do not delete job files.
- Do not archive the job.
- Do not modify phase completion status.
- Preserve legacy job location when pausing a migration-era job.
- Multi-project shared state is canonical in the primary; active pointers remain local.
