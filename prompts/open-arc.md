---
name: xoch-open-arc
description: Open an optional Xoch arc for grouping related tasks
---

# Xoch - Open Arc

Open an optional arc: a larger goal that groups related tasks by reference.

## Purpose

Create arc state, capture the larger goal, record known task membership, and make it easy for future tasks to point back to the arc.

Arcs are not required for normal Xoch work. Use them when several tasks share a larger outcome and the engineer wants a small amount of shared tracking.

## Work Model

Arcs live under:

```text
.xoch/work/arcs/[arc-id]/
```

Tasks remain first-class folders under:

```text
.xoch/work/tasks/[task-id]/
```

Arc membership is by task ID reference only. Do not move or nest task folders inside an arc.

## Process

### Step 1: Gather Arc Metadata

Ask for:

- arc ID or short name
- arc title
- larger goal or purpose
- success outcome
- known task IDs, if any
- documentation targets or project area
- risks, constraints, or non-goals

If no ID is provided, generate a short kebab-case ID from the title or goal.

### Step 2: Check Existing Arc State

Inspect:

```text
.xoch/work/arcs/
```

If the arc already exists, summarize its state and ask whether to resume it or use `xoch-revise-arc`.

### Step 3: Create Arc Folder

Create:

```text
.xoch/work/arcs/[arc-id]/
.xoch/work/arcs/[arc-id]/notes/
.xoch/work/arcs/[arc-id]/revisions/
```

### Step 4: Write Arc State

Create:

```text
.xoch/work/arcs/[arc-id]/state.md
```

Use this shape:

```yaml
arc_id: [arc-id]
title: [arc title]
purpose: [larger goal]
status: open
documentation_targets:
  - scope: feature|project|docs|unknown
    path: [path or unknown]
success_outcome: [what done looks like]
risks: []
open_questions: []
started: [today]
last_updated: [today]
next_command: xoch-open
```

### Step 5: Write Task References

Create:

```text
.xoch/work/arcs/[arc-id]/tasks.md
```

Use this structure:

```markdown
# Arc Tasks - [arc-id]

## Active

- `[task-id]` - [task title or unknown]

## Planned

- `[task-id or placeholder]` - [intended task]

## Complete

- None

## Parked

- None
```

If known tasks already exist under `.xoch/work/tasks/`, ask before updating their `state.md` arc field to `[arc-id]`.

### Step 6: Write Notes

Create:

```text
.xoch/work/arcs/[arc-id]/notes.md
```

Capture:

- why the arc exists
- initial decisions
- known constraints
- initial task membership reasoning

### Step 7: Route

If the engineer wants to open a task in the arc:

```text
Next: xoch-open
```

Tell `xoch-open` to set:

```yaml
arc: [arc-id]
```

If the arc was opened only for planning, stop after summarizing the created arc files.

## Output

End with:

```text
Arc opened.
Arc: [arc-id]
Task references: .xoch/work/arcs/[arc-id]/tasks.md
Next: xoch-open
```

## Rules

- Arcs group tasks by reference.
- Do not create task folders inside arc folders.
- Do not rewrite task `state.md` arc fields without engineer confirmation.
- Do not require arcs for standalone tasks.
- Keep arcs lightweight; they are coordination records, not project-management ceremony.
