---
name: xoch-plan-core
description: Full reference workflow for xoch-open's plan step
---

# Xoch - Plan Core

The `plan` step of `xoch-open`: turn the accepted spec into `plan.md` and a phases document with file ownership, validation, risks, and AC traceability. Usually runs right after `spec` in the same invocation.

{{xoch-partial:project-routing.md}}

{{xoch-partial:context-economy.md}}

## Process

### Step 1: Identify Current Job

{{xoch-partial:job-evidence.md}}

Read job state, `spec`, and the relevant documentation-target README/docs. Confirm the job before planning.

### Step 2: Validate Spec Readiness

Check that `spec.md` contains:

- job requirements
- acceptance criteria with AC IDs
- an Arc Fit section or equivalent job-versus-arc recommendation
- current-state/proposed-change analysis
- constraints, or an explicit "none"

If AC IDs are missing, add them only after confirming they preserve the spec's meaning.

If the spec recommends an arc and the job is still standalone, ask whether to set up an arc (`open-core.md`'s Set Up An Arc) first. Continue only when the engineer confirms this job proceeds independently or as the first job in an arc.

### Step 3: Gather Architectural Approach

Ask the engineer for:

- implementation strategy
- likely files to create or modify
- patterns to follow
- constraints
- testing expectations
- dependency concerns

For multi-project jobs, establish the owning project for every file, validation command, contract change, and task.

If the engineer asks the agent to decide, infer a conservative approach from the spec and existing docs.

### Step 4: Focused Architecture Read

Identify the files needed to understand the approach: related prompt or source files, pattern docs, helper scripts, installer/configuration files, and test or validation examples.

{{xoch-partial:budget-check.md skill="plan"}}

When validation commands are not established by project context, detect advisory candidates, including coverage commands (`kind: coverage`):

```bash
xoch project-commands detect --json
```

### Step 5: Analyze Approach

Give a concise analysis: proposed approach, strengths, concerns, suggestions, and integration points. Revise until the approach is clear enough to plan.

### Step 6: Derive Phases

{{xoch-partial:behavior-tests.md}}

{{xoch-partial:coverage-gate.md}}

Break the work into independently reviewable phases. Each phase has:

- a goal
- files likely touched
- acceptance criteria covered
- behavior tests it introduces or turns green, mapped to ACs (see Behavior Tests)
- coverage-backfill work for targeted files lacking full coverage (see Coverage Gate)
- dependencies on earlier phases
- completion criteria
- evidence the `advance` step should capture

**Checkpoints.** When several phases must land together before the engineer can tell whether they work, consider a checkpoint phase (`"type": "checkpoint"`) right after that slice. It has no implementation: the engineer exercises everything built so far in real conditions and corrects issues directly with the agent, without a revise cycle. Checkpoints are declared only at plan time, never mid-job. Most jobs need none; when unsure, ask the engineer where one would help.

In a multi-project job, every phase task and file path names one project from `projects.json`. A phase may span projects for one coherent contract change, but per-project validation and commit evidence stay distinct.

### Step 7: Present Draft Plan

Present the draft plan in chat: architectural approach, likely files, phases, validation, risks, and acceptance-criteria coverage. Then ask:

{{xoch-partial:accept-or-modify.md artifact="plan"}}

On `[M]`, ask what to modify, revise the draft, and ask again until the engineer accepts. Do not write `plan.md`, the phases document, or plan state before `[A]`.

### Step 8: Write Accepted Plan

Write `plan.md`:

```bash
xoch file write --job "[job-id]" --path plan.md <<'XOCHEOF'
[plan.md content]
XOCHEOF
```

Structure:

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

Write the phases document through the helper, which validates it and refuses a malformed document without writing:

```bash
xoch phase write --job "[job-id]" <<'XOCHEOF'
[phases JSON]
XOCHEOF
```

Shape (phases are numbered by list position; never write a phase number):

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

- Leave a list empty (`[]`) instead of writing "None": `behavior_tests` is `[]` when the phase adds or changes no testable behavior, and `coverage_backfill` is `[]` when targeted files already have full coverage.
- `projects` and each file's `project` are only needed for multi-project jobs.
- Every phase starts as `not_started`; do not set `status` or `start_ref`.
- Put extra detail in the phase's `notes` list.

A checkpoint phase sets `"type": "checkpoint"` and uses `verification_focus` instead of files, behavior tests, and coverage backfill:

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

Use `xoch phase show --job "[job-id]"` to read the result back as text when useful.

### Step 10: Update State

```bash
xoch state update --job "[job-id]" <<'XOCHEOF'
{"status": "plan_complete", "plan_status": "accepted", "review_status": null, "closure_status": null, "last_updated": "[today]"}
XOCHEOF
```

Enter phase 1 through the helper; never hand-write phase fields. It reads the phases document, builds `phase_index`, and sets `current_phase`, `phase_count`, the `current_phase_*` fields, `next_command: xoch-do`, and `current_step: implement`. `--phase 0` marks nothing complete; it only makes phase 1 current:

```bash
xoch phase advance --job "[job-id]" --phase 0
```

Verify acceptance-criteria references:

```bash
xoch coverage compare --job "[job-id]" --require plan --json
```

At plan time, missing snapshot/review coverage is expected; act on `missing_from_plan` and orphaned plan IDs.

For a multi-project job, run coverage from the primary project, then sync the accepted plan, phases, and state to participants. Stop and report any sync refusal.

## Output

End with:

```text
Implementation plan created.
Current phase: Phase 1 - [title]
{{xoch-partial:next-step.md command="xoch-do"}}
```

This is a real stop: entering phase 1 needs a fresh `xoch-do` invocation.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Engineer direction wins when explicit.
- Plans describe how; specs describe what.
- Preserve AC traceability.
