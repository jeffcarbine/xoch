---
name: xoch-revise-arc
description: Revise an existing Xoch arc
---

# Xoch - Revise Arc

Revise an arc's purpose, status, notes, risks, documentation targets, or job membership.

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
jobs.md
notes.md
revisions/
```

Arc membership is represented by job ID references. Job folders remain under `.xoch/work/jobs/`.

## Process

### Step 1: Identify Arc

If the engineer provides an arc ID, use it. Otherwise list arcs under:

```text
.xoch/work/arcs/
```

Then load:

- `state.md`
- `jobs.md`
- `notes.md`
- recent files under `revisions/`
- job `state.md` files for member jobs only when membership changes

### Step 2: Identify The Revision

Ask what changed:

- purpose or success outcome
- scope or non-goals
- job membership
- job status grouping: active, planned, complete, parked
- documentation targets
- risk, constraint, or unresolved question
- arc status

Clarify whether existing jobs should point back to this arc in their job `state.md`.

### Step 3: Assess Impact

Summarize:

- current arc state
- proposed change
- affected job IDs
- whether job `state.md` files need updates
- whether any job specs or plans should be revised

If job requirements changed, route affected jobs to `xoch-revise-spec`.
If job implementation order changed, route affected jobs to `xoch-revise-plan`.

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

## Job Membership Changes

- Added: [job IDs]
- Removed: [job IDs]
- Reclassified: [job IDs]

## Follow-Up

- [job] -> [xoch-revise-spec | xoch-revise-plan | none]
```

### Step 5: Update Arc Files

Update only the files needed:

- `state.md` for title, purpose, status, documentation targets, success outcome, risks, unresolved questions, or `last_updated`
- `jobs.md` for job membership references
- `notes.md` for rationale or context

If the engineer confirmed job back-reference updates, update affected job `state.md` files:

```yaml
arc: [arc-id or standalone]
```

Do not move job folders.

### Step 6: Route

Recommend the next command:

- `xoch-start-job` to create a new job in the arc
- `xoch-revise-spec` for changed job requirements
- `xoch-revise-plan` for changed job sequencing or phases
- `xoch-make` to continue active job implementation

## Output

End with:

```text
Arc revised.
Arc: [arc-id]
Revision: .xoch/work/arcs/[arc-id]/revisions/arc-[date].md
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

- Arc changes must preserve a revision note.
- Job membership is by job ID reference.
- Do not nest, move, archive, or delete job folders from arc commands.
- Do not update job `state.md` arc fields without engineer confirmation.
- Keep arc revisions focused on the shared goal; job-level scope changes belong in `revise-spec` or `revise-plan`.
