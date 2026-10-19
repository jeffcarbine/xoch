---
name: xoch-trace-core
description: Full reference workflow for xoch-trace
---

# Xoch - Trace Core

Investigate a defect, failure, or unclear symptom before changing code, when the problem is not yet clear enough for `xoch-do` or a bug needs disciplined investigation before a patch. Produce a focused trail: likely root cause, evidence, risks, and recommended next steps.

When a job is active:

{{xoch-partial:job-evidence.md}}

Trace notes live at `[notes-dir]/trace-[date].md`. With no job, ask whether to open one with `xoch-open` or keep the trace as an ad hoc note before writing findings.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Capture Symptom

Ask for the observed symptom, expected behavior, reproduction steps, environment, recent changes, logs/errors/screenshots/test output, and urgency and blast radius.

### Step 2: Frame Investigation

State what is known, what is unknown, initial hypotheses, files/logs/docs to inspect, and commands that may reproduce or narrow the issue.

{{xoch-partial:budget-check.md skill="trace"}}

### Step 3: Inspect Evidence

{{xoch-partial:context-economy.md}}

When symptoms may involve an interrupted merge, rebase, cherry-pick, or revert, inspect read-only git state with:

```bash
xoch git-state inspect --json
```

Read only relevant source, tests, logs, configuration, docs, and job or arc notes. Run focused commands when useful; get engineer confirmation before any command that may mutate state.

### Step 4: Test Hypotheses

For each hypothesis, record evidence for and against, the command or inspection used, and confidence. Prove or disprove one thing at a time.

### Step 5: Identify Root Cause Or Next Narrowing Step

Classify the result as root cause identified, likely root cause, narrowed but not proven, blocked, or not reproducible. Do not overstate certainty.

### Step 6: Write Trace Note

When a job exists, write the note with:

```bash
xoch file write --job "[job-id]" --path "notes/trace-[date].md" <<'XOCHEOF'
[trace note content]
XOCHEOF
```

For an ad hoc trace with no active job, write the note directly instead.

Before writing the final trace note, update the boundary, then complete it after the note exists:

```bash
xoch workflow update --job "[job-id]" --name xoch-trace --stage finalizing --pending record_trace --artifact "notes/trace-[date].md"
xoch workflow complete --job "[job-id]" --name xoch-trace --next "[recommended or explicitly invoked command]"
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

[xoch-patch | xoch-open | xoch-revise | xoch-do | more trace]
```

### Step 7: Route

Recommend:

- `xoch-patch` for a focused urgent fix
- `xoch-open` for a new normal job
- `xoch-revise` if the active job's spec or plan needs adjustment
- `xoch-do` if the current phase can implement the fix
- continue tracing if evidence is insufficient

When the route is `xoch-open`, leave a handoff so the next `xoch-open` picks the trace up as source requirements (and claims it, so it is never picked up twice):

```bash
xoch handoff write --source trace --topic "[topic]" <<'XOCHEOF'
[symptom, root cause or best hypothesis, key evidence, the recommended change, and the trace note path]
XOCHEOF
```

Report the handoff ID it prints.

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

- Do not change code unless the engineer explicitly turns the trace into an `xoch-patch` or a job.
- Do not invent logs, test output, or reproduction results.
