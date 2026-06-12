---
name: xoch-patch
description: Handle focused small or urgent fixes with Xoch
---

# Xoch - Patch

Use a focused path for small or urgent fixes.

## Purpose

Keep urgent work scoped without skipping necessary notes, validation, or documentation decisions.

Patch is not a shortcut for broad feature work. If scope grows, route to `xoch-open-job`.

## When To Use Patch

Use `xoch-patch` when:

- the fix is narrow
- the expected files are few
- the desired behavior is already clear
- speed matters
- full spec/plan ceremony would be heavier than the change

Use the normal lifecycle when:

- requirements are unclear
- several phases are needed
- docs or APIs change broadly
- multiple systems are involved
- the patch reveals larger design work

## Work Model

If a job is active, read job pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

Patch notes for target-model jobs may live under:

```text
.xoch/work/jobs/[job-id]/notes/patch-[date].md
```

If no job exists, ask whether to:

1. open a normal job with `xoch-open-job`
2. create a small patch note under `.xoch/work/patches/`
3. proceed without Xoch state and summarize in chat only

## Process

### Step 1: Capture Patch Boundary

Ask or infer:

- issue
- expected fix
- files likely touched
- behavior that must not change
- validation required
- documentation impact
- urgency

If scope is unclear, route to `xoch-trace` before editing.

### Step 2: Decide Patch Or Normal Job

Use patch flow only when the boundary is small and stable.

If scope grows, stop and recommend:

```text
xoch-open-job
```

or, for an active job:

```text
xoch-revise-spec
xoch-revise-plan
```

### Step 3: Inspect Focused Context

Read only the files needed to make the patch. Prefer existing project patterns and smallest responsible change.

### Step 4: Implement

Make the patch with tight scope:

- avoid unrelated refactors
- preserve user changes already present in the worktree
- avoid broad formatting churn
- update docs only when behavior or usage changed
- avoid QA/PR ceremony

### Step 5: Validate

Run focused checks appropriate to the change:

- syntax checks
- targeted tests
- reproduction command
- installer smoke test when installer behavior changes
- documentation scan when docs changed

If validation cannot run, record why.

### Step 6: Record Patch Note

When useful, write:

```text
.xoch/work/jobs/[job-id]/notes/patch-[date].md
```

or:

```text
.xoch/work/patches/patch-[date]-[slug].md
```

Use this structure:

```markdown
# Patch - [summary]

**Date**: [today]

## Issue

[What was broken]

## Change

[What changed]

## Validation

- [check] - [result]

## Documentation

[updated, not impacted, waived, or follow-up]

## Follow-Up

[none or recommended job]
```

### Step 7: Route

Recommend:

- `xoch-review` when patch is part of an active job and ready for review
- `xoch-close-job` when patch job is complete and reviewed/waived
- `xoch-open-job` when follow-up work belongs in a normal job
- `xoch-doc` when docs need refresh
- no further Xoch command when the patch is self-contained

## Output

End with:

```text
Patch complete.
Validation: [summary]
Documentation: [status]
Follow-up: [summary]
```

## Rules

{{xoch-partial:engineer-git-rule.md}}

- Keep patches small.
- If scope grows, switch to normal job flow.
- Do not hide skipped validation.
- Do not use patch as a substitute for unclear requirements.
- Do not move active legacy job folders during the migration.
