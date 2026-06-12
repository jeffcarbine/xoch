---
name: xoch-review
description: Review completed Xoch work against acceptance, quality, tests, and documentation freshness
---

# Xoch - Review

Review completed implementation before task closure.

`review` is Xoch's lightweight quality gate. It borrows the useful rigor of an audit without adding RepFlow-specific QA or PR ceremony.

## Purpose

Verify that completed work satisfies the spec, matches the plan, has adequate validation evidence, avoids obvious quality/security issues, and has a clear documentation freshness status.

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

Legacy migration tasks may still live under `.xoch/context/`. Continue them in place and do not move their files automatically.

## Process

### Step 1: Load Task Evidence

Read:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md`
- completed phase snapshots
- `review.md` if it already exists
- documentation targets from task state/spec
- relevant README or `.xoch/docs/` files when documentation freshness is in scope
- git status and diff

For legacy migration tasks, read the equivalent legacy context files.

### Step 2: Check Implementation Completeness

Confirm one of these is true:

- all planned phases are complete
- the engineer explicitly asks for an early review
- the task is small enough that phase tracking was intentionally skipped

If implementation is plainly incomplete, say so and route to `xoch-make` or `xoch-next`.

### Step 3: Acceptance Coverage

For each acceptance criterion in the spec, mark:

- Pass
- Partial
- Fail
- Not Verified
- Waived

Include concise evidence. Evidence can come from code changes, docs, validation output, manual testing reported by the engineer, or explicit waiver.

### Step 4: Quality And Risk Review

Review the completed work for:

- correctness against the stated requirement
- fit with existing project patterns
- avoidable complexity
- risky side effects
- security basics
- data or state migration concerns
- missing tests/checks
- documentation drift

Focus on real risks. Do not block on taste unless taste reflects a maintainability or correctness issue.

### Step 5: Documentation Freshness

For each documentation target, mark:

- Current
- Updated
- Not impacted
- Stale
- Waived
- Unknown

If docs are stale and should be fixed before closure, route to:

```text
xoch-doc
```

If the engineer chooses not to update docs, record a documentation waiver.

### Step 6: Decide Review Status

Use one of these statuses:

- `pass` - acceptance is covered and no blocking risks remain
- `pass_with_waivers` - remaining gaps are explicitly waived by the engineer
- `needs_work` - issues should be fixed before close
- `blocked` - review cannot complete without missing information or environment access

`xoch-close` may proceed with `pass` or `pass_with_waivers`. It should ask before proceeding if review is missing or not passing.

### Step 7: Write Review Result

For target-model tasks, write:

```text
.xoch/work/tasks/[task-id]/review.md
```

Use this structure:

```markdown
# Review - [task-id]

**Date**: [today]
**Status**: [pass | pass_with_waivers | needs_work | blocked]

## Acceptance Coverage

| AC | Status | Evidence |
|---|---|---|
| AC-001 | Pass | [evidence] |

## Quality And Risk

[Findings, risks, or no blocking issues found]

## Validation Evidence

- [check] - [result]

## Documentation Freshness

- `[doc]` - [status]

## Waivers

- [waiver or "None"]

## Recommendation

Next: [xoch-close | xoch-make | xoch-doc | xoch-revise-plan]
```

Update `state.md`:

```yaml
review_status: [status]
next_command: [recommended next command]
last_updated: [today]
```

For legacy migration tasks, write `review.md` in the legacy task folder.

## Output

End with:

```text
Review status: [status]
Next: [recommended command]
```

## Rules

- Do not invent validation that was not run or reported.
- Waivers must be explicit and recorded.
- Review does not create QA or PR handoff tasks.
- Prefer fixing stale docs before close unless the engineer waives the update.
- Do not move active legacy task folders during the migration.
