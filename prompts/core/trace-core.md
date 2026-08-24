---
name: xoch-trace-core
description: Full reference workflow for xoch-trace
---

# Xoch - Trace Core

This is the full reference workflow for `xoch-trace`. It is rendered to `~/.xoch/prompts/core/trace-core.md` and is not installed as a command.

Investigate a defect, failure, or unclear symptom before changing code.

## Purpose

Create a focused investigation trail that identifies likely root cause, evidence, risks, and recommended next steps.

Use `xoch-trace` when the problem is not yet clear enough for `xoch-make` or when a bug needs disciplined investigation before a patch.

## Work Model

When a job is active:

{{xoch-partial:job-evidence.md}}

Target-model trace notes live under its `notes_dir`:

```text
[notes-dir]/trace-[date].md
```

If no job exists, write findings only after asking whether to open a job with `xoch-open-job` or keep the trace as an ad hoc note.

When a target-model job is active and `xoch-trace` is not already active, begin the workflow while preserving the job's prior next command:

```bash
~/.xoch/bin/xoch-actions.js workflow begin --job "[job-id]" --name xoch-trace --stage investigating --pending continue_trace --return "[current next command]"
```

{{xoch-partial:project-routing.md}}

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
~/.xoch/bin/token-estimator.js --batch [files...]
```

### Step 3: Inspect Evidence

{{xoch-partial:context-economy.md}}

When symptoms may involve an interrupted merge, rebase, cherry-pick, or revert, inspect read-only git state with:

```bash
~/.xoch/bin/git-state.js inspect --json
```

Read only relevant:

- source files
- tests
- logs
- configuration
- docs
- job or arc notes

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

When a job exists, write to `[notes-dir]/trace-[date].md` (`notes_dir` from the Work Model's `job evidence` call) with:

```bash
node ~/.xoch/bin/xoch-actions.js file write --job "[job-id]" --path "notes/trace-[date].md" <<'XOCHEOF'
[trace note content]
XOCHEOF
```

For an ad hoc trace with no active job, write the note directly instead.

Before writing the final trace note, update the boundary, then complete it after the note exists:

```bash
~/.xoch/bin/xoch-actions.js workflow update --job "[job-id]" --name xoch-trace --stage finalizing --pending record_trace --artifact "notes/trace-[date].md"
~/.xoch/bin/xoch-actions.js workflow complete --job "[job-id]" --name xoch-trace --next "[recommended or explicitly invoked command]"
```

Use this structure:

```markdown
# Trace - [job-id or symptom]

**Date**: [today]
**Status**: [identified | likely | narrowed | blocked | not reproducible]

## Symptom

[Observed behavior]

## Evidence

- [fact, log, command, or file]

## Hypotheses

| Hypothesis | Status | Evidence |
|---|---|---|
| [hypothesis] | [supported/refuted/unknown] | [evidence] |

## Root Cause

[Root cause or current best explanation]

## Recommended Next Step

[xoch-patch | xoch-open-job | xoch-revise-plan | xoch-make | more trace]
```

For legacy migration jobs, write the note in the legacy job folder.

### Step 7: Route

Recommend:

- `xoch-patch` for a focused urgent fix
- `xoch-open-job` for a new normal job
- `xoch-revise-plan` if the active job plan needs adjustment
- `xoch-make` if the current phase can implement the fix
- continue tracing if evidence is insufficient

## Output

End with:

```text
Trace status: [status]
Root cause: [summary]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:engineer-git-rule.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Investigation comes before implementation.
- Do not change code unless the engineer explicitly turns the trace into patch or make work.
- Do not invent logs, test output, or reproduction results.
- Record uncertainty honestly.
- Do not move active legacy job folders during the migration.
