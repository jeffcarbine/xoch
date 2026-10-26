---
name: xoch-conventions-validate-core
description: Full reference workflow for xoch-conventions' validate mode
---

# Xoch - Conventions Validate Core

The validate mode of `xoch-conventions`: compare files against the project's documented conventions, record the findings, and route the fixes. Validate never edits code.

{{xoch-partial:project-routing.md}}

{{xoch-partial:job-evidence.md}}

## Process

### Step 1: Choose Files

- Files or globs the engineer named, expanded to paths -- check the whole file.
- Otherwise the branch's changes: `git diff --name-only [base]...HEAD` plus uncommitted and untracked files from `git status --short`, where `[base]` is `origin/HEAD`, else `main`, else `master` -- check changed lines and their immediate context.

Skip deleted files. If nothing remains, say so and stop.

### Step 2: Check

{{xoch-partial:conventions-check.md mode="check"}}

### Step 3: Record Findings

With an active job, write the findings, replacing any earlier run:

```bash
xoch file write --job "[job-id]" --path conventions-check.md <<'XOCHEOF'
# Conventions Check - [job-id]

**Run**: [timestamp]
**Source**: xoch-conventions validate
**Files checked**: [paths]
**Rules applied**: [rule IDs]

## Findings

| Rule | Status | Severity | Location | Finding | Fix | Resolution |
|---|---|---|---|---|---|---|
| CV-004 | confirmed | minor | src/a.js:12 | [what differs] | [fix] | open |
XOCHEOF
```

Write `No findings.` in place of the table when there are none. Every resolution starts `open`; later work sets `fixed`, or `accepted` when the engineer keeps the code as it is. With no active job, print the same content instead of writing it.

## Routing

- No findings -- with an active job, return to its prior `next_command`; otherwise stop.
- Every finding `minor` -- `xoch-patch`, citing rule IDs and locations.
- Any finding `substantive` -- `xoch-revise` with an active job, since the plan needs fix work; `xoch-open` without one.

Complete the managed workflow before the final line, then end with the routed command:

```text
Ready for next step: `[routed command]`
```

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}
