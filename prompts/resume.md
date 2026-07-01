---
name: xoch-resume
description: Resume paused or archived Xoch work
---

# Xoch - Resume

Resume paused or archived job work.

## Purpose

Find a job, restore it as current, summarize where work left off, and route to the next useful command.

## Process

### Step 1: Check Active Job

Read:

```text
.xoch/work/current.md
```

If another job is active, ask the engineer to pause it first or cancel resume.

If no target-model current pointer exists, check `.xoch/context/current.md` for a legacy migration job.

### Step 2: Find Job

If a job ID was supplied, use it.

Otherwise list candidates from:

```text
.xoch/work/jobs/
.xoch/work/jobs/archive/
.xoch/context/
.xoch/context/archive/
```

Label legacy jobs clearly as legacy.

### Step 3: Load Job Files

For target-model jobs, read:

- `state.md`
- `spec.md`, `plan.md`, or `phases.md` only when `state.md` does not contain enough current-phase context
- recent phase snapshots when needed

For legacy jobs, read the equivalent legacy context files.

{{xoch-partial:state-phase-index.md}}

### Step 4: Restore Archived Job If Needed

If the job is archived, ask before moving or restoring it.

For target-model jobs, restore to:

```text
.xoch/work/jobs/[job-id]/
```

For legacy jobs, preserve the legacy context model unless the engineer explicitly asks to migrate it.

### Step 5: Write Current Pointer

Create `.xoch/work/current.md`:

```markdown
# Current Job

**Job ID**: [job-id]
**Title**: [job title]
**Arc**: [arc-id or standalone]
**Status**: resumed
**Current Phase**: [phase number or none]
**Next Command**: [next command]
**Job Directory**: .xoch/work/jobs/[job-id]/
**Resumed**: [today]
```

For legacy jobs, update `.xoch/context/current.md` instead.

Update target job `state.md`:

```yaml
status: resumed
last_updated: [today]
```

### Step 6: Present Summary

Show:

- job goal
- current phase
- completed phases
- remaining phases
- risks/unresolved questions from state
- recommended next command

Common routes:

- `xoch-make` to continue implementation
- `xoch-next` to review/advance the current phase
- `xoch-revise-plan` if the phase plan is stale
- `xoch-review` if implementation is complete

End with:

```text
Job resumed.
Job: [job-id]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Do not migrate legacy job folders automatically.
- Do not mark phases complete while resuming.
- Preserve all job history.
