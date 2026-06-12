---
name: xoch-spec
description: Capture Xoch task requirements and acceptance criteria
---

# Xoch - Spec

Capture what should change before implementation planning begins.

## Purpose

Turn a task idea, issue, bug, or copied requirements into a clear task specification with acceptance criteria, constraints, current-state analysis, and traceable notes.

`xoch-spec` normally runs after `xoch-open`.

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
.xoch/work/current.md
.xoch/work/tasks/[task-id]/state.md
.xoch/work/tasks/[task-id]/spec.md
```

Legacy migration tasks may still live under `.xoch/context/`. If `.xoch/context/current.md` points to an active task and no `.xoch/work/current.md` exists, continue that legacy task in place and do not move it automatically.

## Process

### Step 0: Load Glossaries

Check for project glossaries:

```text
.xoch/glossaries/README.md
.xoch/glossaries/quick-reference.md
```

If present, read the glossary index and quick reference before requirements clarification. Use glossary-approved terminology in questions, acceptance criteria, and final spec text.

### Step 1: Identify Current Task

Read active task pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration tasks

If a current task exists, use its task ID and task folder.

If no current task exists, ask the engineer for:

- task ID or short name
- task title
- documentation target if known

Generate or clean task IDs with:

```bash
bin/generateTaskId.sh --id "[provided-id]"
bin/generateTaskId.sh
```

### Step 2: Ensure Task State

For target-model tasks, ensure:

```text
.xoch/work/tasks/[task-id]/state.md
.xoch/work/current.md
```

If `state.md` does not exist, create it with:

```yaml
task_id: [task-id]
title: [task title]
status: spec_in_progress
arc: [arc-id or standalone]
current_phase: null
documentation_targets:
  - [README path, docs packet, or project-wide]
decisions: []
risks: []
review_status: null
close_status: null
next_command: xoch-spec
started: [today]
last_updated: [today]
```

For legacy tasks, update the legacy context files in place.

### Step 3: Gather Source Requirements

Ask for or extract:

- problem statement
- desired outcome
- in-scope work
- out-of-scope work
- acceptance criteria
- constraints
- documentation targets
- risks or unknowns

If the engineer provides an issue/spec with explicit requirements, treat it as the source baseline. If later clarifications conflict, surface the conflict and ask which source should win.

### Step 4: Clarify Requirements

Ask targeted questions until these are clear:

- measurable success outcome
- scope boundaries
- acceptance criteria
- documentation targets
- constraints and non-goals
- important edge cases

Prefer a few high-signal questions over a long questionnaire.

### Step 5: Current-State Analysis

Read the target README or docs when available. Compare current documented behavior against the proposed change.

Summarize:

- current state
- proposed changes
- staying the same
- potential impacts

Ask the engineer whether the change analysis is correct.

### Step 6: Write Spec

Write:

```text
.xoch/work/tasks/[task-id]/spec.md
```

Use this structure:

```markdown
# Specification - [task-id]

**Date**: [today]
**Status**: Draft
**Documentation Targets**: [paths or project-wide]

---

## Requirements

[Requirement source and clarified task scope]

---

## Acceptance Criteria

- AC-001: [Binary, testable criterion]
- AC-002: [Binary, testable criterion]

---

## Current State

[What exists today]

---

## Proposed Changes

[What will change]

---

## Staying The Same

[Unaffected behavior]

---

## Clarifications & Notes

[Decisions and notes]

---

## Potential Impacts

[Breaking changes, risks, affected docs/features]

---

## Token Usage (Spec Phase)

Budget: 8,000 tokens
[Files read and estimates]
```

### Step 7: Update State

Update `state.md`:

```yaml
status: spec_complete
spec_status: draft
next_command: xoch-plan
last_updated: [today]
```

If writing a legacy migration task, update the existing `.xoch/context/[task-id]/spec.md` and current pointer instead.

## Output

End with:

```text
Specification captured.
Task: [task-id]
Next: xoch-plan
```

## Rules

- Specs describe change, not implementation details.
- Acceptance criteria must be binary and testable.
- Use AC IDs for traceability.
- Do not silently contradict a provided source requirement.
- Do not move active legacy task folders during the migration.
