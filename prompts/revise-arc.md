---
name: xoch-revise-arc
description: Revise an existing Xoch arc
---

# Xoch - Revise Arc

Revise an arc's purpose, status, notes, risks, documentation targets, or task membership.

## Purpose

Update an arc when the larger goal changes while preserving why the arc changed. This command is the arc-level sibling of `xoch-revise-spec` and `xoch-revise-plan`.

## Work Model

Arc files live under:

```text
.xoch/work/arcs/[arc-id]/
```

Typical files:

```text
state.md
tasks.md
notes.md
revisions/
```

Arc membership is represented by task ID references. Task folders remain under `.xoch/work/tasks/`.

## Process

### Step 1: Identify Arc

If the engineer provides an arc ID, use it. Otherwise list arcs under:

```text
.xoch/work/arcs/
```

Then load:

- `state.md`
- `tasks.md`
- `notes.md`
- recent files under `revisions/`
- task `state.md` files for member tasks only when membership changes

### Step 2: Identify The Revision

Ask what changed:

- purpose or success outcome
- scope or non-goals
- task membership
- task status grouping: active, planned, complete, parked
- documentation targets
- risk, constraint, or open question
- arc status

Clarify whether existing tasks should point back to this arc in their task `state.md`.

### Step 3: Assess Impact

Summarize:

- current arc state
- proposed change
- affected task IDs
- whether task `state.md` files need updates
- whether any task specs or plans should be revised

If task requirements changed, route affected tasks to `xoch-revise-spec`.
If task implementation order changed, route affected tasks to `xoch-revise-plan`.

### Step 4: Write Revision Note

Create:

```text
.xoch/work/arcs/[arc-id]/revisions/arc-[date].md
```

Use this structure:

```markdown
# Arc Revision - [arc-id]

**Date**: [today]

## Reason

[Why the arc changed]

## Previous State

[Brief summary]

## Updated State

[Brief summary]

## Task Membership Changes

- Added: [task IDs]
- Removed: [task IDs]
- Reclassified: [task IDs]

## Follow-Up

- [task] -> [xoch-revise-spec | xoch-revise-plan | none]
```

### Step 5: Update Arc Files

Update only the files needed:

- `state.md` for title, purpose, status, documentation targets, success outcome, risks, open questions, or `last_updated`
- `tasks.md` for task membership references
- `notes.md` for rationale or context

If the engineer confirmed task back-reference updates, update affected task `state.md` files:

```yaml
arc: [arc-id or standalone]
```

Do not move task folders.

### Step 6: Route

Recommend the next command:

- `xoch-open` to create a new task in the arc
- `xoch-revise-spec` for changed task requirements
- `xoch-revise-plan` for changed task sequencing or phases
- `xoch-make` to continue active task implementation

## Output

End with:

```text
Arc revised.
Arc: [arc-id]
Revision: .xoch/work/arcs/[arc-id]/revisions/arc-[date].md
Next: [recommended command]
```

## Rules

- Arc changes must preserve a revision note.
- Task membership is by task ID reference.
- Do not nest, move, archive, or delete task folders from arc commands.
- Do not update task `state.md` arc fields without engineer confirmation.
- Keep arc revisions focused on the shared goal; task-level scope changes belong in `revise-spec` or `revise-plan`.
