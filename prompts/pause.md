---
name: xoch-pause
description: Pause the active Xoch task
---

# Xoch - Pause

Pause the active task so another task can become current without losing progress.

## Purpose

Summarize the active task, preserve its task folder, update task state, and clear `.xoch/work/current.md`.

## Process

### Step 1: Find Active Task

Read:

```text
.xoch/work/current.md
```

If absent, check `.xoch/context/current.md` for a legacy migration task.

If no active task exists, say there is nothing to pause and stop.

### Step 2: Load Task State

For target-model tasks, read:

- `.xoch/work/tasks/[task-id]/state.md`
- `.xoch/work/tasks/[task-id]/spec.md` when present
- `.xoch/work/tasks/[task-id]/phases.md` when present

For legacy tasks, read the corresponding `.xoch/context/[task-id]/` files without moving them.

### Step 3: Summarize

Show:

- task ID and title
- optional arc
- status
- current phase
- next command
- task directory
- brief goal
- phase progress

### Step 4: Confirm Pause

Ask the engineer to confirm.

If confirmed:

1. Update `state.md`:

   ```yaml
   status: paused
   next_command: xoch-resume
   last_updated: [today]
   ```

2. Remove `.xoch/work/current.md` only if it points to this task.

3. For legacy tasks, remove `.xoch/context/current.md` only if it points to this task.

### Step 5: Output

End with:

```text
Task paused.
Resume with: xoch-resume [task-id]
```

## Rules

- Do not delete task files.
- Do not archive the task.
- Do not modify phase completion status.
- Preserve legacy task location when pausing a migration-era task.
