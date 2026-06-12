---
name: xoch-next
description: Review the current phase and advance to the next Xoch phase
---

# Xoch - Next

Review the current phase, capture a snapshot, and advance when the engineer confirms the phase is complete.

`next` replaces the old `advance` command and uses phase language instead of milestone language.

## Purpose

Compare the current phase plan against the working tree, gather implementation and validation evidence, identify gaps, and either keep the phase open or advance job state to the next phase.

Target flow:

```text
start-job -> spec -> plan -> make -> next -> review -> close-job
```

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Read active job pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

Legacy migration jobs may still live under `.xoch/context/`. Continue them in place and do not move their files automatically.

## Process

### Step 1: Identify Current Phase

Load the active job and read:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md`
- current `phases/phase-[N].md` when present
- notes or evidence from recent `xoch-make` work

For legacy migration jobs, read the equivalent legacy files.

If the current phase is unclear, ask the engineer which phase should be reviewed.

### Step 2: Inspect Changes

Run or ask for the equivalent of:

```bash
git status --short
git diff --stat
git diff
git diff --staged
```

Review the diff against the current phase only. Note unrelated changes as out of scope and avoid reverting them.

### Step 3: Check Phase Requirements

For the current phase, assess:

- planned files touched
- acceptance criteria covered
- implementation jobs completed
- tests/checks run
- documentation targets updated or deferred
- risks, regressions, or missing evidence

If requirements changed, recommend `xoch-revise-spec` or `xoch-revise-plan` instead of advancing blindly.

### Step 4: Ask About Additional Changes

Ask whether there were changes outside the git diff, such as:

- manual testing
- generated files
- configuration changes
- external setup
- documentation decisions
- known skipped checks

Include the engineer's answer in the phase snapshot.

### Step 5: Provide Phase Review

Report:

- files changed
- phase requirements met
- gaps or risks
- testing status
- documentation status
- recommendation

Keep the review firm but not theatrical. The engineer has final say.

### Step 6: Confirm Advancement

Ask whether to:

1. Mark the phase complete and advance
2. Keep the phase in progress
3. Adjust before advancing

Do not update phase state until the engineer confirms.

### Step 7: Snapshot And Advance

When confirmed, write a phase snapshot.

For target-model jobs, create or update:

```text
.xoch/work/jobs/[job-id]/snapshots/phase-[N].md
```

Use this structure:

```markdown
# Phase [N] Snapshot - [Title]

**Completed**: [today]
**Status**: Complete

## What Changed

[Summary]

## Files Changed

- `[file]` - [what changed]

## Acceptance Criteria

- AC-001: [status and evidence]

## Validation

- [check] - [result]

## Additional Notes

[manual testing, skipped checks, risks, or decisions]

## Next

[next phase or xoch-review]
```

Also update the current phase section in `phases.md`:

```markdown
**Status**: Complete
```

If another phase exists, update:

```markdown
## Current Phase: [N+1]
```

and update `state.md`:

```yaml
status: phase_ready
current_phase: [N+1]
next_command: xoch-make
last_updated: [today]
```

If no phases remain, update `state.md`:

```yaml
status: implementation_complete
current_phase: null
next_command: xoch-review
last_updated: [today]
```

For legacy migration jobs, write a comparable `milestone-[N].md` or phase snapshot in the legacy job folder and update the legacy tracker in place.

## Output

If more phases remain:

```text
Phase [N] complete.
Next phase: [N+1] - [title]
{{xoch-partial:next-step.md command="xoch-make"}}
```

If implementation is complete:

```text
All phases complete.
{{xoch-partial:next-step.md command="xoch-review"}}
```

## Rules

- Engineer confirmation is required before advancing.
- Review only the current phase unless the engineer asks for broader review.
- Preserve unrelated worktree changes.
- Record skipped checks as skipped, not passed.
- Do not move active legacy job folders during the migration.
