---
name: xoch-revise-spec
description: Revise the foundational specification for an open Xoch task
---

# Xoch - Revise Spec

Revise a task's foundational requirements after the original spec needs to change.

## Purpose

Capture what changed, preserve the previous requirement history, update the task specification, and mark downstream plans/phases as needing review when necessary.

Use `revise-spec` when the definition of done changes: scope, acceptance criteria, constraints, non-goals, documentation targets, or task purpose.

Use `xoch-revise-plan` instead when the requirement is still correct but the implementation path needs to change.

## Work Model

Target-model task files live under:

```text
.xoch/work/tasks/[task-id]/
```

Revision notes live under:

```text
.xoch/work/tasks/[task-id]/revisions/
```

Legacy migration tasks may still live under `.xoch/context/`. Continue them in place and do not move them automatically.

## Process

### Step 1: Identify Current Task

Read active task pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration tasks

Then load:

- `state.md` when present
- `spec.md`
- `plan.md`
- `phases.md`
- recent revision notes
- relevant documentation target files when the spec change affects docs

If no active task exists, ask for the task ID.

### Step 2: Identify The Spec Change

Ask what changed:

- requirement
- acceptance criterion
- scope boundary
- non-goal
- constraint
- documentation target
- risk or assumption
- task purpose

Clarify whether the change supersedes, adds to, or removes existing spec content.

### Step 3: Assess Impact

Identify:

- affected acceptance criteria
- phases already completed that remain valid
- phases that need plan updates
- tests/checks that need to change
- documentation targets that need update
- whether task status should move back from implementation/review/close toward planning

If the arc association changes, recommend `xoch-revise-arc` as well.

### Step 4: Write Revision Note

Create:

```text
.xoch/work/tasks/[task-id]/revisions/spec-[date].md
```

Use this structure:

```markdown
# Spec Revision - [task-id]

**Date**: [today]

## Reason

[Why the spec changed]

## Previous Requirement

[Relevant previous text or summary]

## Updated Requirement

[New text or summary]

## Acceptance Criteria Changes

- Added: [AC IDs]
- Changed: [AC IDs]
- Removed: [AC IDs]

## Impact

- Plan impact: [none | revise-plan required]
- Phase impact: [summary]
- Documentation impact: [summary]
```

For legacy migration tasks, write the revision note in the legacy task folder.

### Step 5: Update Spec

Update `spec.md` carefully:

- preserve the original task intent when still valid
- use explicit AC IDs
- do not renumber existing AC IDs unless the engineer explicitly asks
- mark removed criteria as removed or superseded when history matters
- update current-state, proposed-changes, clarifications, and impacts when needed

### Step 6: Update State

For target-model tasks, update `state.md`:

```yaml
status: spec_revised
spec_status: revised
review_status: null
close_status: null
last_spec_revision: revisions/spec-[date].md
last_updated: [today]
next_command: xoch-revise-plan
```

If the plan is still valid, set:

```yaml
next_command: xoch-make
```

and record why no plan revision is needed.

For legacy migration tasks, update the legacy tracker or notes in place.

### Step 7: Route

Recommend:

- `xoch-revise-plan` when phases or implementation strategy need updates
- `xoch-make` when the current plan remains valid
- `xoch-review` when the change only affects final verification
- `xoch-doc` when docs need immediate refresh

## Output

End with:

```text
Spec revised.
Task: [task-id]
Revision: [revision path]
Next: [recommended command]
```

## Rules

- Specs define what success means.
- Do not silently change acceptance criteria.
- Preserve old AC IDs when practical.
- Record why the spec changed before editing the spec.
- Do not move active legacy task folders during the migration.
