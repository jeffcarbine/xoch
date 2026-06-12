---
name: xoch-close-arc
description: Close an Xoch arc after its related tasks are complete or intentionally parked
---

# Xoch - Close Arc

Close an optional arc when its related tasks are complete, intentionally parked, or moved out of the arc.

## Purpose

Summarize the larger goal, record final task membership state, capture unfinished work decisions, and mark the arc closed without changing or deleting task folders.

## Work Model

Arc files live under:

```text
.xoch/work/arcs/[arc-id]/
```

Task folders stay under:

```text
.xoch/work/tasks/[task-id]/
```

Closing an arc does not close, archive, delete, or move any task.

## Process

### Step 1: Identify Arc

If the engineer provides an arc ID, use it. Otherwise list arcs under:

```text
.xoch/work/arcs/
```

Load:

- `state.md`
- `tasks.md`
- `notes.md`
- recent revision notes
- task `state.md` files for referenced task IDs when available

### Step 2: Summarize Task Membership

Group referenced tasks as:

- complete
- active
- planned
- parked
- missing or unknown

Do not assume unknown task status is complete.

### Step 3: Resolve Unfinished Tasks

If active, planned, parked, missing, or unknown tasks remain, ask whether to:

1. Leave them referenced as parked follow-up
2. Move the task references to another arc
3. Remove them from the arc reference list
4. Keep the arc open

If moving references to another arc, use or recommend `xoch-revise-arc` for both arcs. Do not move task folders.

### Step 4: Check Documentation

If the arc affected shared docs, feature READMEs, or `.xoch/docs/`, ask whether docs are current, should be refreshed with `xoch-doc`, or should be explicitly waived.

### Step 5: Write Closure Notes

Create:

```text
.xoch/work/arcs/[arc-id]/close.md
```

Use this structure:

```markdown
# Close Arc - [arc-id]

**Date**: [today]
**Status**: Closed

## Summary

[What the arc accomplished]

## Task Membership At Close

### Complete

- `[task-id]` - [summary]

### Parked Or Follow-Up

- `[task-id]` - [decision]

## Documentation

[current, refreshed, not impacted, or waived]

## Waivers

- [waiver or "None"]

## Follow-Up

- [remaining task or "None"]
```

### Step 6: Mark Arc Closed

Update:

```text
.xoch/work/arcs/[arc-id]/state.md
```

Set:

```yaml
status: closed
closed: [today]
last_updated: [today]
next_command: null
```

Keep `tasks.md` as a final reference record unless the engineer asked to revise it before closing.

## Output

End with:

```text
Arc closed.
Arc: [arc-id]
Tasks changed: none moved or deleted
Follow-up: [summary]
```

## Rules

- Closing an arc does not close tasks.
- Closing an arc does not archive, delete, or move task folders.
- Unfinished task references require an explicit keep, move-reference, remove-reference, or keep-open decision.
- Documentation gaps require refresh, waiver, or explicit "not impacted".
