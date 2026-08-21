---
name: xoch-close-job
description: Close completed Xoch work and finalize job state
---

# Xoch - Close Job

{{xoch-partial:workflow-boundary.md}}

Close a completed Xoch job.

`close-job` replaces the old `finalize` command and is the lifecycle opposite of `open-job`.

## Purpose

Verify review, coverage, and documentation status, record final job history, clear the active job pointer, and mark the job closed.

Target flow:

```text
open-job -> spec -> plan -> make -> next -> review -> close-job
```

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Use the `xoch-actions.js job current --json` result from the workflow boundary. Run it now if the result is not already available; it returns target-model JSON state or legacy pointer metadata.

Legacy migration jobs may still live under `.xoch/context/`. Continue them in place and do not move their files automatically unless the engineer explicitly asks.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Job

{{xoch-partial:job-evidence.md}}

Then load:

- `state`
- `spec`
- `plan`
- `phases` only when state and snapshots do not establish implementation completion clearly
- phase snapshots (`current_phase_snapshot`, or list `snapshots_dir` for the full set)
- `review`
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

### Step 4: Check Coverage

{{xoch-partial:coverage-gate.md}}

Confirm 100% coverage (line, branch, and function, when reported separately) on every file this job modified with executable code — use `xoch-review`'s recorded coverage evidence when review already covered it, or check directly with the project's coverage command otherwise.

This cannot be waived by engineer preference or urgency, and a review waiver from Step 3 does not cover it. A gap may only stand if it's a documented exception per `coverage-gate.md` — verified investigation, not an assertion, plus the required source/test comment pair. If coverage is incomplete on any job-touched file and doesn't qualify as a documented exception, do not close the job — route to `xoch-make` to close the gap, even when review was waived or skipped entirely.

### Step 5: Check Documentation Freshness

Confirm project READMEs, feature READMEs, `.xoch/docs/`, and glossary entries are current enough for this job.

If docs are stale or unknown, ask whether to:

1. Run `xoch-doc`
2. Record an explicit documentation waiver and continue closing
3. Stop and keep the job active

### Step 6: Check Worktree State

Inspect:

```bash
git status --short
git diff --stat
```

Summarize remaining uncommitted changes. Do not require a commit to close unless the engineer's workflow requires it.

For multi-project jobs, inspect and report worktree state separately in every listed project.

If unrelated worktree changes exist, mention them and avoid including them in the closure summary.

### Step 7: Write Closure Notes

For target-model jobs, write `closure.md` under the `job_directory` field returned by `job evidence`.

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

## Coverage

[100% coverage confirmed on every job-touched file with code, or "not applicable - no code touched", or "documented exception: [file/branch, see review.md]"]

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

For multi-project jobs, write closure state through the primary job and sync it before clearing pointers in any mirror.

### Step 8: Clear Active Pointer

Clear the active pointer only if the helper reports that it points to this job:

```bash
~/.xoch/bin/xoch-actions.js job current --json
~/.xoch/bin/xoch-actions.js pointer clear --job "[job-id]"
```

For legacy migration jobs, clear:

```text
.xoch/context/current.md
```

Do not clear a pointer for a different active job.

For multi-project jobs, run the same helper checks from every listed repository. Clear only pointers that identify this job; a participant may legitimately have no pointer or another active job.

### Step 9: Leave Job In Place

Closed jobs stay in their existing folder; marking `status: closed` in `state.md` and clearing the active pointer is sufficient. Do not move or archive job folders.

## Output

End with:

```text
Job closed.
Job: [job-id]
Review: [status]
Coverage: [status]
Documentation: [status]
Follow-up: [summary]
```

## Rules

{{xoch-partial:response-ending.md}}

- Closing requires either passing review or an explicit review waiver.
- Closing requires 100% coverage on every job-touched file with code. This cannot be waived, regardless of any review or documentation waiver — the only exception is a documented exception per `coverage-gate.md`.
- Stale documentation requires either refresh or an explicit documentation waiver.
- Do not hide skipped validation.
- Do not clear the wrong active job pointer.
- Synchronize final multi-project closure context before clearing the canonical scope's pointer.
- Do not move active legacy job folders during the migration unless the engineer explicitly asks.
