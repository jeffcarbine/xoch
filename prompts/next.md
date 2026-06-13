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
open-job -> spec -> plan -> make -> next -> review -> close-job
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

### Step 4: Provide Phase Review

Report:

- files changed
- phase requirements met
- gaps or risks
- testing status
- documentation status
- recommendation

Keep the review firm but not theatrical. The engineer has final say.

If the engineer has already mentioned manual testing, generated files, configuration changes, external setup, documentation decisions, or known skipped checks, include that context in the review and later snapshot.

### Step 5: Check Git Commit And Push State

Before asking to advance, check whether the phase changes are committed and pushed.

Use focused git checks such as:

```bash
git status --short
git status --branch --short
git log --oneline @{u}..HEAD
```

If there are uncommitted changes, staged changes, or local commits that have not been pushed, say:

```text
Changes haven't been committed and pushed to git yet. Would you like me to [C]ommit and push them for you, or [N]o?
```

If the engineer chooses `[C]`:

1. Create a focused commit for the current phase changes.
2. Use this commit message shape when Xoch writes the message:

   ```text
   [job-id] phase [N]: [description of changes]
   ```

3. Push the current branch to its configured upstream.
4. Report the exact commit message and pushed branch to the engineer.
5. Continue with the normal advancement confirmation.

If the engineer chooses `[N]`, do not commit or push. Continue with the normal advancement confirmation and record in the snapshot that commit/push was deferred.

If the branch has no upstream, the push fails, or git state is ambiguous, stop the commit/push path, explain what blocked it, and ask the engineer how they want to proceed.

### Step 6: Confirm Advancement

After the phase review and git commit/push check, ask exactly this:

```text
Ready to move to the next phase? [Y]es - next, [N]o - I am not ready yet
```

If there are no more phases, use:

```text
Ready to move to review? [Y]es - review, [N]o - I am not ready yet
```

Do not update phase state until the engineer answers yes. If the engineer answers no, keep the phase open and ask what still needs to be added, checked, or discussed before advancing.

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

[manual testing, skipped checks, risks, commit/push status, or decisions]

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
