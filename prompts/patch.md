---
name: xoch-patch
description: Handle focused small or urgent fixes with Xoch
---

# Xoch - Patch

{{xoch-partial:workflow-boundary.md}}

A focused path for small or urgent fixes that keeps scope tight without skipping notes, validation, or documentation decisions. It is not a shortcut for broad feature work.

Use `xoch-patch` when the fix is narrow, touches few files, the desired behavior is clear, speed matters, and full spec/plan ceremony would outweigh the change. Use the normal lifecycle when requirements are unclear, several phases are needed, docs or APIs change broadly, multiple systems are involved, or the patch reveals larger design work.

With an active job (from the workflow boundary's `job current --json` result):

{{xoch-partial:job-evidence.md}}

{{xoch-partial:storage-root.md}}

With no job, ask whether to open a normal job with `xoch-open`, keep a patch note under `[xoch-root]/work/patches/`, or proceed without Xoch state and summarize in chat only.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Capture Patch Boundary

Ask or infer the issue, expected fix, files likely touched, behavior that must not change, required validation, documentation impact, and urgency. If scope is unclear, route to `xoch-trace` before editing.

### Step 2: Decide Patch Or Normal Job

Use the patch flow only when the boundary is small and stable. If scope grows, stop and recommend `xoch-open`, or `xoch-revise` for an active job.

### Step 3: Inspect Focused Context

Read only the files needed for the patch. Prefer existing project patterns and the smallest responsible change.

### Step 4: Implement

Make the patch with tight scope:

- avoid unrelated refactors
- preserve user changes already present in the worktree
- avoid broad formatting churn
- update docs only when behavior or usage changed
- avoid QA/PR ceremony

### Step 5: Validate

Run focused checks: syntax checks, targeted tests, a reproduction command, an installer smoke test when installer behavior changes, or a documentation scan when docs changed. If validation cannot run, record why; never hide skipped validation.

If the patch touches code, aim for 100% coverage on each touched file, as in the normal lifecycle. `xoch-patch` is the only place a coverage waiver is allowed, when urgency genuinely outweighs it; record the waiver and why coverage was not reached in the patch note.

### Step 6: Record Patch Note

When useful, write the note to `[notes-dir]/patch-[date].md` (active job) or `[xoch-root]/work/patches/patch-[date]-[slug].md` (no job), with this structure:

```markdown
# Patch - [summary]

**Date**: [today]

## Issue

[What was broken]

## Change

[What changed]

## Validation

- [check] - [result]

## Coverage

[100% reached, or "waived: [reason]", or "not applicable - no code touched"]

## Documentation

[updated, not impacted, waived, or follow-up]

## Follow-Up

[none or recommended job]
```

### Step 7: Route

Recommend:

- `xoch-do` (its `final_review` step) when patch is part of an active job and ready for review
- `xoch-close` when patch job is complete and reviewed/waived
- `xoch-open` when follow-up work belongs in a normal job
- `xoch-doc` when docs need refresh
- no further Xoch command when the patch is self-contained

## Output

End with:

```text
Patch complete.
Validation: [summary]
Coverage: [status]
Documentation: [status]
Follow-up: [summary]
```

When Step 7 recommends a command, end with `{{xoch-partial:next-step.md command="[recommended command]"}}`.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:engineer-git-rule.md}}

- Keep patches small; never use a patch as a substitute for unclear requirements.
