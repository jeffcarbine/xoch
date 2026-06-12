---
name: xoch-close
description: Close completed Xoch work and archive or finalize task state
---

# Xoch - Close

Close a completed Xoch task.

`close` replaces the old `finalize` command and is the lifecycle opposite of `open`.

## Purpose

Verify review and documentation status, record final task history, clear the active task pointer, and archive or mark the task closed.

Target flow:

```text
open -> spec -> plan -> make -> next -> review -> close
```

## Work Model

Target-model task files live under:

```text
.xoch/work/tasks/[task-id]/
```

Read active task pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration tasks

Legacy migration tasks may still live under `.xoch/context/`. Continue them in place and do not move their files automatically unless the engineer explicitly asks.

## Process

### Step 1: Identify Task

Load:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md`
- phase snapshots
- `review.md`
- documentation targets
- git status

For legacy migration tasks, read the equivalent legacy files.

If there is no active task, ask which task should be closed.

### Step 2: Confirm Implementation Completion

Confirm one of these is true:

- all phases are complete
- `state.md` says `implementation_complete`
- the engineer explicitly wants to close a small or manually tracked task

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
3. Stop and keep the task open

Only continue without a passing review when the engineer explicitly chooses a waiver.

### Step 4: Check Documentation Freshness

Confirm project READMEs, feature READMEs, `.xoch/docs/`, and glossary entries are current enough for this task.

If docs are stale or unknown, ask whether to:

1. Run `xoch-doc`
2. Record an explicit documentation waiver and continue closing
3. Stop and keep the task open

### Step 5: Check Worktree State

Inspect:

```bash
git status --short
git diff --stat
```

Summarize remaining uncommitted changes. Do not require a commit to close unless the engineer's workflow requires it.

If unrelated worktree changes exist, mention them and avoid including them in the closure summary.

### Step 6: Write Closure Notes

For target-model tasks, write:

```text
.xoch/work/tasks/[task-id]/close.md
```

Use this structure:

```markdown
# Close - [task-id]

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
close_status: closed
next_command: null
closed: [today]
last_updated: [today]
```

For legacy migration tasks, write `close.md` or final notes in the legacy task folder.

### Step 7: Clear Active Pointer

Clear the active pointer only if it points to this task:

```text
.xoch/work/current.md
```

For legacy migration tasks, clear:

```text
.xoch/context/current.md
```

Do not clear a pointer for a different active task.

### Step 8: Archive Or Leave In Place

Ask the engineer whether to:

1. Leave the closed task in place
2. Move it under an archive folder

If helper scripts exist for archive/unarchive, prefer them. Otherwise, move files only with explicit confirmation.

## Output

End with:

```text
Task closed.
Task: [task-id]
Review: [status]
Documentation: [status]
Follow-up: [summary]
```

## Rules

- Closing requires either passing review or an explicit review waiver.
- Stale documentation requires either refresh or an explicit documentation waiver.
- Do not hide skipped validation.
- Do not clear the wrong active task pointer.
- Do not move active legacy task folders during the migration unless the engineer explicitly asks.
