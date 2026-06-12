---
name: xoch-revise-plan
description: Revise the implementation plan or remaining phases for an active Xoch job
---

# Xoch - Revise Plan

Revise the job plan after requirements, discoveries, risks, or implementation reality change.

`revise-plan` replaces the old `replan` command and uses phase language instead of milestone language.

## Purpose

Preserve completed phase history, update remaining phases, record why the plan changed, and keep the job moving without losing acceptance-criteria traceability.

Use `revise-plan` when the implementation path changes but the spec remains valid.

Use `xoch-revise-spec` first when the definition of done changes.

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
- completed phase snapshots
- recent revision notes

If no active job exists, ask for the job ID.

### Step 2: Confirm Spec Stability

Check whether the change is about implementation or requirements.

Route to `xoch-revise-spec` first if the change modifies:

- acceptance criteria
- scope
- constraints
- documentation targets
- job purpose

Continue with `revise-plan` if the spec remains valid.

### Step 3: Identify The Plan Change

Ask what changed:

- implementation approach
- file ownership
- phase order
- current phase scope
- validation strategy
- dependency or risk
- discovered complexity
- arc/job sequencing

Clarify whether completed phases remain valid.

### Step 4: Preserve Completed Work

Do not rewrite completed phase snapshots except to add a note that a later revision superseded part of the plan.

Classify phases as:

- complete and still valid
- complete but superseded by follow-up
- in progress
- remaining and unchanged
- remaining and revised
- removed or deferred

### Step 5: Write Revision Note

Create:

```text
.xoch/work/jobs/[job-id]/revisions/plan-[date].md
```

Use this structure:

```markdown
# Plan Revision - [job-id]

**Date**: [today]

## Reason

[Why the plan changed]

## Previous Plan

[Brief summary]

## Updated Plan

[Brief summary]

## Phase Changes

- Preserved: [phases]
- Revised: [phases]
- Added: [phases]
- Removed/deferred: [phases]

## Acceptance Coverage

| AC | Covered By Phase(s) |
|---|---|
| AC-001 | Phase 1 |

## Follow-Up

- [next command or decision]
```

For legacy migration jobs, write the revision note in the legacy job folder.

### Step 6: Update Plan And Phases

Update:

```text
plan.md
phases.md
```

Keep:

- completed phase summaries
- completed phase snapshots
- AC traceability
- explicit testing requirements
- completion evidence expectations

If the current phase changes, update `phases.md`:

```markdown
## Current Phase: [N]
```

### Step 7: Update State

For target-model jobs, update `state.md`:

```yaml
status: plan_revised
current_phase: [N]
review_status: null
closure_status: null
last_plan_revision: revisions/plan-[date].md
last_updated: [today]
next_command: xoch-make
```

If the job should go straight to review, set:

```yaml
next_command: xoch-review
```

and record why implementation is already complete.

For legacy migration jobs, update the legacy tracker or notes in place.

### Step 8: Route

Recommend:

- `xoch-make` for the current or next phase
- `xoch-next` if the revised current phase is already implemented and needs checkpointing
- `xoch-review` if all implementation phases are complete
- `xoch-revise-arc` if arc sequencing or membership also changed

## Output

End with:

```text
Plan revised.
Job: [job-id]
Revision: [revision path]
Current phase: [N] - [title]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

- Plans describe how; specs describe what.
- Do not change acceptance criteria in `revise-plan`.
- Preserve completed phase history and snapshots.
- Keep AC traceability after changing phases.
- Do not move active legacy job folders during the migration.
