---
name: xoch-resume
description: Resume paused or archived Xoch work
---

# Xoch - Resume

Resume paused or archived task work.

## Purpose

Find a task, restore it as current, summarize where work left off, and route to the next useful command.

## Process

### Step 1: Check Active Task

Read:

```text
.xoch/work/current.md
```

If another task is active, ask the engineer to pause it first or cancel resume.

If no target-model current pointer exists, check `.xoch/context/current.md` for a legacy migration task.

### Step 2: Find Task

If a task ID was supplied, use it.

Otherwise list candidates from:

```text
.xoch/work/tasks/
.xoch/work/tasks/archive/
.xoch/context/
.xoch/context/archive/
```

Label legacy tasks clearly as legacy.

### Step 3: Load Task Files

For target-model tasks, read:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md`
- recent phase snapshots when needed

For legacy tasks, read the equivalent legacy context files.

### Step 4: Restore Archived Task If Needed

If the task is archived, ask before moving or restoring it.

For target-model tasks, restore to:

```text
.xoch/work/tasks/[task-id]/
```

For legacy tasks, preserve the legacy context model unless the engineer explicitly asks to migrate it.

### Step 5: Write Current Pointer

Create `.xoch/work/current.md`:

```markdown
# Current Task

**Task ID**: [task-id]
**Title**: [task title]
**Arc**: [arc-id or standalone]
**Status**: resumed
**Current Phase**: [phase number or none]
**Next Command**: [next command]
**Task Directory**: .xoch/work/tasks/[task-id]/
**Resumed**: [today]
```

For legacy tasks, update `.xoch/context/current.md` instead.

Update target task `state.md`:

```yaml
status: resumed
last_updated: [today]
```

### Step 6: Present Summary

Show:

- task goal
- current phase
- completed phases
- remaining phases
- risks/open questions from state
- recommended next command

Common routes:

- `xoch-make` to continue implementation
- `xoch-next` to review/advance the current phase
- `xoch-revise-plan` if the phase plan is stale
- `xoch-review` if implementation is complete

## Rules

- Do not migrate legacy task folders automatically.
- Do not mark phases complete while resuming.
- Preserve all task history.
