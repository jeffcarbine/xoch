---
name: xoch-revise-spec
description: Revise the foundational specification for an active Xoch job
---

# Xoch - Revise Spec

Revise a job's foundational requirements after the original spec needs to change.

## Purpose

Capture what changed, preserve the previous requirement history, update the job specification, and mark downstream plans/phases as needing review when necessary.

Use `revise-spec` when the definition of done changes: scope, acceptance criteria, constraints, non-goals, documentation targets, or job purpose.

Use `xoch-revise-plan` instead when the requirement is still correct but the implementation path needs to change.

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Revision notes live under:

```text
.xoch/work/jobs/[job-id]/revisions/
```

Legacy migration jobs may still live under `.xoch/context/`. Continue them in place and do not move them automatically.

## Process

### Step 1: Identify Current Job

Read active job pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

Then load:

- `state.md` when present
- `spec.md`
- `plan.md`
- `phases.md`
- recent revision notes
- relevant documentation target files when the spec change affects docs

If no active job exists, ask for the job ID.

### Step 2: Identify The Spec Change

Ask what changed:

- requirement
- acceptance criterion
- scope boundary
- non-goal
- constraint
- documentation target
- risk or assumption
- job purpose

Clarify whether the change supersedes, adds to, or removes existing spec content.

### Step 3: Assess Impact

Identify:

- affected acceptance criteria
- phases already completed that remain valid
- phases that need plan updates
- tests/checks that need to change
- documentation targets that need update
- whether job status should move back from implementation/review/closure toward planning

If the arc association changes, recommend `xoch-revise-arc` as well.

### Step 4: Write Revision Note

Create:

```text
.xoch/work/jobs/[job-id]/revisions/spec-[date].md
```

Use this structure:

```markdown
# Spec Revision - [job-id]

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

For legacy migration jobs, write the revision note in the legacy job folder.

### Step 5: Update Spec

Update `spec.md` carefully:

- preserve the original job intent when still valid
- use explicit AC IDs
- do not renumber existing AC IDs unless the engineer explicitly asks
- mark removed criteria as removed or superseded when history matters
- update current-state, proposed-changes, clarifications, and impacts when needed

### Step 6: Update State

For target-model jobs, update `state.md`:

```yaml
status: spec_revised
spec_status: revised
review_status: null
closure_status: null
last_spec_revision: revisions/spec-[date].md
last_updated: [today]
next_command: xoch-revise-plan
```

If the plan is still valid, set:

```yaml
next_command: xoch-make
```

and record why no plan revision is needed.

For legacy migration jobs, update the legacy tracker or notes in place.

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
Job: [job-id]
Revision: [revision path]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

- Specs define what success means.
- Do not silently change acceptance criteria.
- Preserve old AC IDs when practical.
- Record why the spec changed before editing the spec.
- Do not move active legacy job folders during the migration.
