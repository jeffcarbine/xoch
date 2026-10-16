---
name: xoch-plan-core
description: Full reference workflow for xoch-open's plan step
---

# Xoch - Plan Core

This is the full reference workflow for `xoch-open`'s `plan` step. It is rendered to `~/.xoch/prompts/core/plan-core.md` and is not installed as a command.

Create the implementation approach and phase breakdown for the active job.

## Purpose

Turn an accepted job spec into a practical plan with clear phases, file ownership notes, validation expectations, risks, and acceptance-criteria traceability.

The `plan` step normally runs right after `spec`, continuing in the same `xoch-open` invocation.

Target flow:

```text
xoch-open -> xoch-do -> xoch-doc -> xoch-close
```

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Expected artifacts after this command: `plan.md` in the job directory, plus the phases document and updated job state, both written through helpers.

Legacy migration jobs may still live under `.xoch/context/`. If `.xoch/context/current.md` is active and no target-model job exists, continue that legacy job in place.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Current Job

{{xoch-partial:job-evidence.md}}

Then read:

- job state, via `xoch state get --job "[job-id]" --json`
- `spec`
- relevant documentation target README/docs

{{xoch-partial:context-economy.md}}

{{xoch-partial:state-phase-index.md}}

Confirm the job before planning.

### Step 2: Validate Spec Readiness

Check that `spec.md` contains:

- job requirements
- acceptance criteria with AC IDs
- an explicit Arc Fit section or equivalent job-versus-arc recommendation
- current-state/proposed-change analysis
- constraints or explicit "none"

If AC IDs are missing, add them during planning only after confirming they preserve the spec meaning.

If the spec recommends an arc and the job is still standalone, ask whether the engineer wants to set up an arc (`open-core.md` covers arc creation) before creating the job plan. Continue planning only when the engineer confirms this job should proceed independently or as the first job inside an arc.

### Step 3: Gather Architectural Approach

Ask the engineer for:

- implementation strategy
- likely files to create or modify
- patterns to follow
- constraints
- testing expectations
- dependency concerns

For multi-project jobs, establish the owning project for every file, validation command, contract change, and implementation task.

If the engineer asks the agent to decide, infer a conservative approach from the spec and existing docs.

### Step 4: Focused Architecture Read

Identify files needed to understand the implementation approach:

- related prompt files or source files
- docs describing patterns
- helper scripts
- installer/configuration files
- test or validation examples

{{xoch-partial:budget-check.md skill="plan"}}

When validation commands are not already established by project context, detect advisory candidates with:

```bash
xoch project-commands detect --json
```

This also surfaces coverage-command candidates (`kind: coverage`) when the target project's tooling signals one.

### Step 5: Analyze Approach

Provide a concise architecture analysis:

- proposed approach
- strengths
- concerns
- suggestions
- integration points

Revise until the approach is clear enough to plan.

### Step 6: Derive Phases

{{xoch-partial:behavior-tests.md}}

{{xoch-partial:coverage-gate.md}}

Break the work into phases. Each phase should have:

- a clear goal
- files likely touched
- acceptance criteria covered
- the behaviors/tests this phase introduces or turns green, mapped to the AC(s) they cover
- whether the phase's targeted files already have full code coverage — when they don't, explicit phase work to backfill coverage for the existing, already-correct code, identified now rather than discovered mid-`xoch-do`
- dependencies on earlier phases
- completion criteria
- evidence that the `advance` step should capture before advancing

Prefer phases that can be reviewed independently.

When several phases must land together before the engineer can tell whether they actually work — a coherent, testable slice of the job — consider inserting a **checkpoint** immediately after that slice: a phase of `**Type**: Checkpoint` with no implementation of its own. At a checkpoint, the engineer exercises everything built so far in real conditions and collaborates directly with the agent on any corrections, without a formal revise cycle. Checkpoints are declared only here, at plan time; they are not inserted ad hoc mid-job. Most jobs need none. When in doubt, ask the engineer where a checkpoint would help most before finalizing the phase breakdown.

In a multi-project job, every phase task and file path must name one project from `projects.json`. A phase may span projects when the work is one coherent contract change, but its per-project validation and commit evidence must remain distinct.

### Step 7: Present Draft Plan

Before writing plan files, present the draft implementation plan and phase breakdown in chat. Include the architectural approach, likely files, phases, validation, risks, and acceptance-criteria coverage.

Then ask:

{{xoch-partial:accept-or-modify.md artifact="plan"}}

If the engineer chooses `[M]`, ask what they want modified, revise the draft, and ask again. Repeat until the engineer accepts.

Do not write `plan.md`, the phases document, or mark plan state complete until the engineer chooses `[A]`.

### Step 8: Write Accepted Plan

Write `plan.md` with:

```bash
xoch file write --job "[job-id]" --path plan.md <<'XOCHEOF'
[plan.md content]
XOCHEOF
```

Use this structure:

```markdown
# Implementation Plan - [job-id]

**Date**: [today]
**Spec**: spec.md
**Status**: Accepted

---

## Token Usage (Plan Phase)

Budget: [current value reported by `xoch token-estimator budget check --skill plan`]
[Files read and estimates]

---

## Architectural Approach

[Approved approach]

---

## Files to Modify/Create

[Standalone: path list. Multi-project: project and path list.]

---

## Implementation Strategy

[Strategy]

---

## Technical Constraints

[Constraints]

---

## Risks & Considerations

[Risks, breaking changes, integration points]

---

## Acceptance Coverage

| AC | Covered By Phase(s) |
|---|---|
| AC-001 | Phase 1 |
```

### Step 9: Write Accepted Phases

Write the phases document as JSON through the helper, which validates it before saving and refuses a malformed document without writing anything:

```bash
xoch phase write --job "[job-id]" <<'XOCHEOF'
[phases JSON]
XOCHEOF
```

Use this shape. Phases are numbered by their position in the list -- never write a phase number yourself:

```json
{
  "phases": [
    {
      "title": "[Title]",
      "goal": "[one-sentence goal]",
      "description": "[what this phase does and why]",
      "type": "implementation",
      "projects": ["[project name]"],
      "files": [
        { "path": "[file]", "project": "[project]", "note": "[why]" }
      ],
      "acceptance_criteria": ["AC-001"],
      "behavior_tests": ["[test description] - covers AC-00X"],
      "coverage_backfill": ["[file] - [gap to backfill]"],
      "testing_requirements": ["[check]"],
      "completion_evidence": ["[diff, validation, manual test, doc update, or other evidence]"]
    }
  ]
}
```

Leave a list empty (`[]`) rather than writing "None" into it -- for example, `behavior_tests` is `[]` when a phase doesn't add or change testable code behavior, and `coverage_backfill` is `[]` when the targeted files already have full coverage. `projects` and each file's `project` are only needed for multi-project jobs. Every phase starts as `not_started`; do not set `status` or `start_ref`.

A checkpoint phase carries no implementation of its own, so it sets `"type": "checkpoint"` and uses `verification_focus` instead of files, behavior tests, and coverage backfill:

```json
{
  "title": "Checkpoint - [what it verifies]",
  "goal": "[what the engineer confirms live]",
  "description": "[what the engineer should exercise live, and why this is the right point to pause]",
  "type": "checkpoint",
  "acceptance_criteria": ["AC-001"],
  "verification_focus": ["[what to test live, tied to the phases it follows]"],
  "completion_evidence": ["checkpoint-[N].md snapshot: what was tested, what was found, what was corrected"]
}
```

When a phase needs more detail than these fields hold, put it in the phase's `notes` list.

Read the result back as readable text with `xoch phase show --job "[job-id]"` when it helps to confirm what was written.

### Step 10: Update State

Update the plan-specific state fields:

```bash
xoch state update --job "[job-id]" <<'XOCHEOF'
{"status": "plan_complete", "plan_status": "accepted", "review_status": null, "closure_status": null, "last_updated": "[today]"}
XOCHEOF
```

Then enter phase 1 through the deterministic helper rather than hand-writing phase fields. It reads phase 1 from the phases document just written, builds `phase_index` from every phase in it, and sets `current_phase`, `phase_count`, `current_phase_title`/`current_phase_goal`/`current_phase_type`, `current_phase_files`/`current_phase_acceptance_criteria`/`current_phase_validation`, `next_command` (`xoch-do`), and `current_step` (`implement`) together:

```bash
xoch phase advance --job "[job-id]" --phase 0
```

`--phase 0` is the entry idiom: there is no phase 0, so nothing gets marked complete -- this call only establishes phase 1 as current.

For legacy migration jobs, write `plan.md` and `milestones.md` in the existing legacy folder until the migration job is closed.

After accepted plan artifacts are written, verify acceptance-criteria references when practical:

```bash
xoch coverage compare --job "[job-id]" --require plan --json
```

At plan time, missing snapshot/review coverage is expected; treat `missing_from_plan` and orphaned plan IDs as the actionable fields.

For a multi-project job, run coverage from the primary project, then sync the accepted plan, phases, and state to participants. Stop and report any sync refusal.

## Output

End with:

```text
Implementation plan created.
Current phase: Phase 1 - [title]
{{xoch-partial:next-step.md command="xoch-do"}}
```

Unlike `spec`'s handoff into `plan`, this one really does stop: entering phase 1 is `xoch-do`'s job, not `xoch-open`'s, and it needs a fresh invocation per the phase boundary.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Engineer direction wins when explicit.
- Present the draft plan and get `[A]` acceptance before writing plan artifacts.
- If the engineer chooses `[M]`, ask for modifications and revise before writing.
- Plans describe how; specs describe what.
- Phases replace milestones for new work.
- Preserve AC traceability.
- Multi-project plan tasks and paths must have explicit project ownership.
- Do not move active legacy job folders during the migration.
