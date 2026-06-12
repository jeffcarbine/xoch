---
name: xoch-open
description: Open or resume a Xoch task
---

# Xoch - Open

Open or resume a focused unit of work.

This is the normal entry point for Xoch task work.

## Purpose

Create or resume task state, capture basic metadata, record optional arc association, identify documentation targets when known, and route to `xoch-spec`.

Target flow:

```text
open -> spec -> plan -> make -> next -> review -> close
```

## Work Model

New task work lives under:

```text
.xoch/work/tasks/[task-id]/
```

The active task pointer is:

```text
.xoch/work/current.md
```

Arcs live under:

```text
.xoch/work/arcs/[arc-id]/
```

Arcs reference task IDs; task folders are not nested inside arc folders.

Legacy migration tasks may still live under `.xoch/context/`. If a legacy current task exists and the engineer wants to continue it, do not move it automatically.

## Process

### Step 1: Detect Active Work

Read active pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration tasks

If active work exists:

- summarize task ID, title, status, current phase, and next command when available
- ask whether to resume it or open a different task

If the engineer opens a different task while one is active, recommend `xoch-pause` first.

### Step 2: Gather Metadata

Ask only for missing values:

- task ID or issue ID
- task title
- short description
- standalone task or arc association
- documentation target, if known
- whether strict documentation target enforcement is required

Documentation targets may be:

- a feature README
- root README/project docs
- `.xoch/docs/` packets
- `project-wide`
- `unknown` for exploratory work

### Step 3: Generate Or Clean Task ID

Use:

```bash
bin/generateTaskId.sh --id "[provided-id]"
```

If no ID is provided:

```bash
bin/generateTaskId.sh
```

### Step 4: Create Task Folder

Create:

```text
.xoch/work/tasks/[task-id]/
.xoch/work/tasks/[task-id]/notes/
.xoch/work/tasks/[task-id]/phases/
.xoch/work/tasks/[task-id]/revisions/
```

Do not create arc folders unless the task belongs to an arc or the engineer asks to open an arc.

### Step 5: Write State

Create:

```text
.xoch/work/tasks/[task-id]/state.md
```

Use this shape:

```yaml
task_id: [task-id]
title: [task title]
description: [short description]
status: open
arc: [arc-id or standalone]
current_phase: null
documentation_targets:
  - scope: feature|project|docs|unknown
    path: [path or unknown]
decisions: []
risks: []
open_questions: []
review_status: null
close_status: null
next_command: xoch-spec
started: [today]
last_updated: [today]
```

### Step 6: Write Current Pointer

Create `.xoch/work/current.md`:

```markdown
# Current Task

**Task ID**: [task-id]
**Title**: [task title]
**Arc**: [arc-id or standalone]
**Status**: open
**Current Phase**: none
**Next Command**: xoch-spec
**Task Directory**: .xoch/work/tasks/[task-id]/
**Started**: [today]
```

### Step 7: Route

End with:

```text
Task opened.
Next: xoch-spec
```

## Rules

- Tasks are first-class units of work.
- Arcs group task IDs by reference.
- Missing documentation targets are allowed for exploratory work but must be explicit in `state.md`.
- Do not auto-migrate active legacy `.xoch/context/` tasks.
