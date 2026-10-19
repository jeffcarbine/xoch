---
name: xoch-revise-plan-core
description: Full reference workflow for xoch-revise's plan step
---

# Xoch - Revise Plan Core

The plan step of `xoch-revise`, for implementation-path changes against a valid spec. It runs alone in plan-only mode, or right after `revise-spec-core.md` when both change. Preserve completed phase history, update remaining phases, record why the plan changed, and keep AC traceability. Revision notes live under the job's `revisions/` directory.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Current Job

{{xoch-partial:job-evidence.md}}

Then load:

- job state, `spec`, and `plan`
- phases via `xoch phase get --job "[job-id]" --json`, or only the affected phases (`--phase N`) when state already has a useful phase index
- completed phase snapshots (`current_phase_snapshot`, or list `snapshots_dir`)
- recent files under `revisions_dir`

### Step 2: Confirm Spec Stability

If this step was entered straight from the spec step in the same invocation, the spec was just revised and accepted -- skip this check.

Otherwise, if the change modifies acceptance criteria, scope, constraints, documentation targets, or job purpose, switch to the spec step (`revise-spec-core.md`) in this same invocation, then return here. Continue if the spec remains valid.

### Step 3: Identify The Plan Change

Ask what changed: implementation approach, file ownership, phase order, current phase scope, validation strategy, dependency or risk, discovered complexity, or arc/job sequencing.

For multi-project jobs, also identify project ownership changes and any repository added to or removed from the implementation path. Do not edit `projects.json` implicitly; confirm scope changes with the engineer.

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

### Step 5: Present Draft Revision

Before writing anything, present the drafted revision in chat: the reason, previous and updated plan summaries, phase classifications from Step 4, and the updated acceptance coverage.

Then ask:

{{xoch-partial:accept-or-modify.md artifact="plan revision"}}

On `[M]`, ask what to modify, revise the draft, and ask again. Do not write the revision note, `plan.md`, the phases document, or state before `[A]`.

### Step 6: Write Revision Note

Write the revision note:

```bash
xoch file write --job "[job-id]" --path "revisions/plan-[date].md" <<'XOCHEOF'
[revision note content]
XOCHEOF
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

### Step 7: Update Plan And Phases

Update `plan.md` with `xoch file write`. Update the phases document by reading it with `xoch phase get --job "[job-id]" --json`, revising that JSON, and writing it back whole:

```bash
xoch phase write --job "[job-id]" <<'XOCHEOF'
[revised phases JSON]
XOCHEOF
```

Keep, in the revised document:

- every completed phase, with its `status` and `start_ref` unchanged, in its original position
- completed phase snapshots
- AC traceability
- explicit testing requirements
- completion evidence expectations

Set the document's `current_phase` to the phase work should resume at. `phase write` refuses a document whose `current_phase` is not a listed phase.

### Step 8: Update State

`phase write` already refreshed the phase fields in job state (`phase_count`, `phase_index`, and every `current_phase*` field) from the revised document. Update the remaining fields:

```bash
xoch state update --job "[job-id]" <<'XOCHEOF'
{"status": "plan_revised", "review_status": null, "closure_status": null, "last_plan_revision": "revisions/plan-[date].md", "last_updated": "[today]", "next_command": "xoch-do", "current_step": "implement"}
XOCHEOF
```

If implementation is already complete and the job should go straight to review, use `"current_step": "final_review"` instead and record why.

For multi-project jobs, retain an explicit project owner for every revised phase task and sync the revision note, plan, phases, and state from the primary job.

### Step 9: Route

Recommend:

- `xoch-do` to continue at the current or next phase's `implement` step
- `xoch-do` if the revised current phase is already implemented and needs its `advance` step for checkpointing
- `xoch-do` if all implementation phases are complete, to run its `final_review` step
- `xoch-revise` (arc) if arc sequencing or membership also changed -- when this was already agreed earlier in this invocation, continue directly into the arc step (`revise-arc-core.md`) instead of routing

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

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Plans describe how; specs describe what.
- Do not change acceptance criteria in the plan step; switch to the spec step instead.
