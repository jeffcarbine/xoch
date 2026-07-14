---
name: xoch-plan-core
description: Full reference workflow for xoch-plan
---

# Xoch - Plan Core

This is the full reference workflow for `xoch-plan`. It is rendered to `~/.xoch/prompts/core/plan-core.md` and is not installed as a command.

Create the implementation approach and phase breakdown for the active job.

## Purpose

Turn an accepted job spec into a practical plan with clear phases, file ownership notes, validation expectations, risks, and acceptance-criteria traceability.

Target flow:

```text
open-job -> spec -> plan -> make -> next -> review -> close-job
```

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Expected files after this command:

```text
.xoch/work/jobs/[job-id]/plan.md
.xoch/work/jobs/[job-id]/phases.md
.xoch/work/jobs/[job-id]/state.md
```

Legacy migration jobs may still live under `.xoch/context/`. If `.xoch/context/current.md` is active and no target-model job exists, continue that legacy job in place.

## Process

### Step 1: Identify Current Job

Read active pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

Then read:

- `state.md` when present
- `spec.md`
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

If the spec recommends an arc and the job is still standalone, ask whether the engineer wants to run `xoch-open-arc` before creating the job plan. Continue planning only when the engineer confirms this job should proceed independently or as the first job inside an arc.

### Step 3: Gather Architectural Approach

Ask the engineer for:

- implementation strategy
- likely files to create or modify
- patterns to follow
- constraints
- testing expectations
- dependency concerns

If the engineer asks the agent to decide, infer a conservative approach from the spec and existing docs.

### Step 4: Focused Architecture Read

Identify files needed to understand the implementation approach:

- related prompt files or source files
- docs describing patterns
- helper scripts
- installer/configuration files
- test or validation examples

Use:

```bash
~/.xoch/bin/token-estimator.sh --batch [files...]
```

If the read is large, summarize why it is worth the context and ask the engineer before proceeding unless they have already approved exceeding budget.

When validation commands are not already established by project context, detect advisory candidates with:

```bash
~/.xoch/bin/project-commands.sh detect --json
```

### Step 5: Analyze Approach

Provide a concise architecture analysis:

- proposed approach
- strengths
- concerns
- suggestions
- integration points

Revise until the approach is clear enough to plan.

### Step 6: Derive Phases

Break the work into phases. Each phase should have:

- a clear goal
- files likely touched
- acceptance criteria covered
- test/check expectations
- dependencies on earlier phases
- completion criteria
- evidence that `xoch-next` should capture before advancing

Prefer phases that can be reviewed independently.

### Step 7: Present Draft Plan

Before writing plan files, present the draft implementation plan and phase breakdown in chat. Include the architectural approach, likely files, phases, validation, risks, and acceptance-criteria coverage.

Then ask:

{{xoch-partial:accept-or-modify.md artifact="plan"}}

If the engineer chooses `[M]`, ask what they want modified, revise the draft, and ask again. Repeat until the engineer accepts.

Do not write `plan.md`, `phases.md`, individual phase files, or mark plan state complete until the engineer chooses `[A]`.

### Step 8: Write Accepted Plan

Write:

```text
.xoch/work/jobs/[job-id]/plan.md
```

Use this structure:

```markdown
# Implementation Plan - [job-id]

**Date**: [today]
**Spec**: spec.md
**Status**: Accepted

---

## Token Usage (Plan Phase)

Budget: 7,000 tokens
[Files read and estimates]

---

## Architectural Approach

[Approved approach]

---

## Files to Modify/Create

[List]

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

Write:

```text
.xoch/work/jobs/[job-id]/phases.md
```

Use this structure:

```markdown
# Phases - [Job Title]

## Current Phase: 1

---

## Phase 1: [Title]

[Description]

**Files to modify/create:**
- [file] - [why]

**Acceptance criteria covered:**
- AC-001

**Testing requirements:**
- [check]

**Completion evidence:**
- [diff, validation, manual test, doc update, or other evidence]

**Status**: Not Started
```

Optionally create individual phase files under:

```text
.xoch/work/jobs/[job-id]/phases/phase-[N].md
```

when a phase needs more detail than belongs in `phases.md`.

### Step 10: Update State

Update `state.md`:

```yaml
status: plan_complete
plan_status: accepted
current_phase: 1
phase_count: [number of phases]
current_phase_title: [phase 1 title]
current_phase_goal: [one-sentence phase goal]
current_phase_files:
  - [path]
current_phase_acceptance_criteria:
  - AC-001
current_phase_validation:
  - [expected check]
phase_index:
  - phase: 1
    title: [title]
    status: not_started
review_status: null
closure_status: null
next_command: xoch-make
last_updated: [today]
```

For legacy migration jobs, write `plan.md` and `milestones.md` in the existing legacy folder until the migration job is closed.

After accepted plan artifacts are written, verify acceptance-criteria references when practical:

```bash
~/.xoch/bin/coverage-actions.sh compare --job "[job-id]" --require plan --json
```

At plan time, missing snapshot/review coverage is expected; treat `missing_from_plan` and orphaned plan IDs as the actionable fields.

## Output

End with:

```text
Implementation plan created.
Current phase: Phase 1 - [title]
{{xoch-partial:next-step.md command="xoch-make"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Engineer direction wins when explicit.
- Present the draft plan and get `[A]` acceptance before writing plan artifacts.
- If the engineer chooses `[M]`, ask for modifications and revise before writing.
- Plans describe how; specs describe what.
- Phases replace milestones for new work.
- Preserve AC traceability.
- Do not move active legacy job folders during the migration.
