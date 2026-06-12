---
name: xoch-trace
description: Investigate root cause for defects or unclear symptoms
---

# Xoch - Trace

Investigate a defect, failure, or unclear symptom before changing code.

## Purpose

Create a focused investigation trail that identifies likely root cause, evidence, risks, and recommended next steps.

Use `xoch-trace` when the problem is not yet clear enough for `xoch-make` or when a bug needs disciplined investigation before a patch.

## Work Model

When a task is active, read task pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration tasks

Target-model trace notes live under:

```text
.xoch/work/tasks/[task-id]/notes/trace-[date].md
```

If no task exists, write findings only after asking whether to open a task with `xoch-open` or keep the trace as an ad hoc note.

## Process

### Step 1: Capture Symptom

Ask for:

- observed symptom
- expected behavior
- reproduction steps
- environment
- recent changes
- logs, errors, screenshots, or test output
- urgency and blast radius

### Step 2: Frame Investigation

State:

- what is known
- what is unknown
- initial hypotheses
- files, logs, or docs to inspect
- commands that may reproduce or narrow the issue

Use token estimates for broad reads:

```bash
bin/tokenEstimator.sh --batch [files...]
```

### Step 3: Inspect Evidence

Read only relevant:

- source files
- tests
- logs
- configuration
- docs
- task or arc notes

Run focused commands when useful. If a command may mutate state, require engineer confirmation first.

### Step 4: Test Hypotheses

For each hypothesis, record:

- hypothesis
- evidence for
- evidence against
- command or inspection used
- confidence

Prefer proving or disproving one thing at a time.

### Step 5: Identify Root Cause Or Next Narrowing Step

Classify the result:

- root cause identified
- likely root cause
- narrowed but not proven
- blocked
- not reproducible

Do not overstate certainty.

### Step 6: Write Trace Note

When a task exists, write:

```text
.xoch/work/tasks/[task-id]/notes/trace-[date].md
```

Use this structure:

```markdown
# Trace - [task-id or symptom]

**Date**: [today]
**Status**: [identified | likely | narrowed | blocked | not reproducible]

## Symptom

[Observed behavior]

## Evidence

- [fact, log, command, or file]

## Hypotheses

| Hypothesis | Status | Evidence |
|---|---|---|
| [hypothesis] | [supported/refuted/open] | [evidence] |

## Root Cause

[Root cause or current best explanation]

## Recommended Next Step

[xoch-patch | xoch-open | xoch-revise-plan | xoch-make | more trace]
```

For legacy migration tasks, write the note in the legacy task folder.

### Step 7: Route

Recommend:

- `xoch-patch` for a focused urgent fix
- `xoch-open` for a new normal task
- `xoch-revise-plan` if the active task plan needs adjustment
- `xoch-make` if the current phase can implement the fix
- continue tracing if evidence is insufficient

## Output

End with:

```text
Trace status: [status]
Root cause: [summary]
Next: [recommended command]
```

## Rules

- Investigation comes before implementation.
- Do not change code unless the engineer explicitly turns the trace into patch or make work.
- Do not invent logs, test output, or reproduction results.
- Record uncertainty honestly.
- Do not move active legacy task folders during the migration.
