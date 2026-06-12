---
name: xoch-plan
description: Create an implementation approach and phases for a Xoch task
---

# Xoch - Plan

Create the implementation approach and phase breakdown for the open task.

## Purpose

Turn an accepted task spec into a practical plan with clear phases, file ownership notes, validation expectations, risks, and acceptance-criteria traceability.

Target flow:

```text
open -> spec -> plan -> make -> next -> review -> close
```

## Work Model

Target-model task files live under:

```text
.xoch/work/tasks/[task-id]/
```

Expected files after this command:

```text
.xoch/work/tasks/[task-id]/plan.md
.xoch/work/tasks/[task-id]/phases.md
.xoch/work/tasks/[task-id]/state.md
```

Legacy migration tasks may still live under `.xoch/context/`. If `.xoch/context/current.md` is active and no target-model task exists, continue that legacy task in place.

## Process

### Step 1: Identify Current Task

Read active pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration tasks

Then read:

- `state.md` when present
- `spec.md`
- relevant documentation target README/docs

Confirm the task before planning.

### Step 2: Validate Spec Readiness

Check that `spec.md` contains:

- task requirements
- acceptance criteria with AC IDs
- current-state/proposed-change analysis
- constraints or explicit "none"

If AC IDs are missing, add them during planning only after confirming they preserve the spec meaning.

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
bin/tokenEstimator.sh --batch [files...]
```

If the read is large, summarize why it is worth the context and ask the engineer before proceeding unless they have already approved exceeding budget.

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

### Step 7: Write Plan

Write:

```text
.xoch/work/tasks/[task-id]/plan.md
```

Use this structure:

```markdown
# Implementation Plan - [task-id]

**Date**: [today]
**Spec**: spec.md

---

## Token Usage (Plan Phase)

Budget: 13,000 tokens
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

### Step 8: Write Phases

Write:

```text
.xoch/work/tasks/[task-id]/phases.md
```

Use this structure:

```markdown
# Phases - [Task Title]

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
.xoch/work/tasks/[task-id]/phases/phase-[N].md
```

when a phase needs more detail than belongs in `phases.md`.

### Step 9: Update State

Update `state.md`:

```yaml
status: plan_complete
current_phase: 1
review_status: null
close_status: null
next_command: xoch-make
last_updated: [today]
```

For legacy migration tasks, write `plan.md` and `milestones.md` in the existing legacy folder until the migration task is closed.

## Output

End with:

```text
Implementation plan created.
Current phase: Phase 1 - [title]
Next: xoch-make
```

## Rules

- Engineer direction wins when explicit.
- Plans describe how; specs describe what.
- Phases replace milestones for new work.
- Preserve AC traceability.
- Do not move active legacy task folders during the migration.
