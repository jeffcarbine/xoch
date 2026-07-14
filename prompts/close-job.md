---
name: xoch-close-job
description: Close completed Xoch work and archive or finalize job state
---

# Xoch - Close Job

Close a completed Xoch job.

`close-job` replaces the old `finalize` command and is the lifecycle opposite of `open-job`.

## Purpose

Verify review and documentation status, record final job history, clear the active job pointer, and archive or mark the job closed.

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

Legacy migration jobs may still live under `.xoch/context/`. Continue them in place and do not move their files automatically unless the engineer explicitly asks.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Job

Load:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md` only when state and snapshots do not establish implementation completion clearly
- phase snapshots
- `review.md`
- documentation targets
- git status

For legacy migration jobs, read the equivalent legacy files.

If there is no active job, ask which job should be closed.

### Step 2: Confirm Implementation Completion

Confirm one of these is true:

- all phases are complete
- `state.md` says `implementation_complete`
- the engineer explicitly wants to close a small or manually tracked job

If implementation is incomplete, recommend returning to `xoch-make` or `xoch-next`.

### Step 3: Check Review Status

Review may be:

- `pass`
- `pass_with_waivers`
- `needs_work`
- `blocked`
- missing

If review is missing or not passing, ask whether to:

1. Run `xoch-review`
2. Record an explicit review waiver and continue closing
3. Stop and keep the job active

Only continue without a passing review when the engineer explicitly chooses a waiver.

### Step 4: Check Documentation Freshness

Confirm project READMEs, feature READMEs, `.xoch/docs/`, and glossary entries are current enough for this job.

If docs are stale or unknown, ask whether to:

1. Run `xoch-doc`
2. Record an explicit documentation waiver and continue closing
3. Stop and keep the job active

### Step 5: Check Worktree State

Inspect:

```bash
git status --short
git diff --stat
```

Summarize remaining uncommitted changes. Do not require a commit to close unless the engineer's workflow requires it.

For multi-project jobs, inspect and report worktree state separately in every listed project.

If unrelated worktree changes exist, mention them and avoid including them in the closure summary.

### Step 6: Write Closure Notes

For target-model jobs, write:

```text
.xoch/work/jobs/[job-id]/closure.md
```

Use this structure:

```markdown
# Closure - [job-id]

**Date**: [today]
**Status**: Closed

## Summary

[What was completed]

## Acceptance

[Acceptance/review result]

## Validation

[Checks and manual testing]

## Documentation

[Docs updated, not impacted, or waived]

## Waivers

- [review/doc waiver or "None"]

## Files Changed

- `[file]` - [summary]

## Follow-Up

[Known follow-up or "None"]
```

Update `state.md`:

```yaml
status: closed
closure_status: closed
next_command: null
closed: [today]
last_updated: [today]
```

For legacy migration jobs, write `closure.md` or final notes in the legacy job folder.

For multi-project jobs, write closure state through the primary job and sync it before clearing pointers or archiving any mirror.

### Step 7: Clear Active Pointer

Clear the active pointer only if it points to this job:

```text
.xoch/work/current.md
```

For legacy migration jobs, clear:

```text
.xoch/context/current.md
```

Do not clear a pointer for a different active job.

For multi-project jobs, check `.xoch/work/current.md` in every listed repository. Clear it only where it points to this job; a participant may legitimately have no pointer or another active job.

### Step 8: Archive Or Leave In Place

Ask the engineer whether to:

1. Leave the closed job in place
2. Move it under an archive folder

If helper scripts exist for archive/unarchive, prefer them. Otherwise, move files only with explicit confirmation.

For target-model jobs, after the active pointer is cleared and the engineer chooses archive, run a dry-run first:

```bash
~/.xoch/bin/archive-actions.sh archive --kind job --id "[job-id]" --dry-run
~/.xoch/bin/archive-actions.sh archive --kind job --id "[job-id]"
```

If the helper refuses the move, stop and report why. Do not manually bypass its path or overwrite checks.

For multi-project jobs, archive participant mirrors first with `archive-actions.sh --root "[participant path]"`, then archive the canonical primary job last. Use a dry-run for every repository. Leaving all job folders in place is also valid.

## Output

End with:

```text
Job closed.
Job: [job-id]
Review: [status]
Documentation: [status]
Follow-up: [summary]
```

## Rules

{{xoch-partial:response-ending.md}}

- Closing requires either passing review or an explicit review waiver.
- Stale documentation requires either refresh or an explicit documentation waiver.
- Do not hide skipped validation.
- Do not clear the wrong active job pointer.
- Synchronize final multi-project closure context before archiving the canonical scope.
- Do not move active legacy job folders during the migration unless the engineer explicitly asks.
