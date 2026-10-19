---
name: xoch-revise-spec-core
description: Full reference workflow for xoch-revise's spec step
---

# Xoch - Revise Spec Core

The spec step of `xoch-revise`, for when the definition of done changes (scope, acceptance criteria, constraints, non-goals, documentation targets, or job purpose). Record what changed and why, preserve requirement history, update `spec.md`, and flag downstream plan/phase impact. When both spec and plan change, this step runs first and continues into `revise-plan-core.md`. Revision notes live under the job's `revisions/` directory.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Current Job

{{xoch-partial:job-evidence.md}}

Then load job state, `spec`, `plan`, phases (`xoch phase get --job "[job-id]" --json`), recent files under `revisions_dir`, and relevant documentation-target files when the change affects docs.

### Step 2: Identify The Spec Change

Ask what changed (requirement, acceptance criterion, scope boundary, non-goal, constraint, documentation target, risk or assumption, or job purpose) and whether it supersedes, adds to, or removes existing spec content.

### Step 3: Assess Impact

Identify:

- affected acceptance criteria
- phases already completed that remain valid
- phases that need plan updates
- tests/checks that need to change
- documentation targets that need update
- whether job status should move back from implementation/review/closure toward planning

If the arc association or the arc's own goal changes, offer to continue into `xoch-revise`'s arc step (`revise-arc-core.md`) after the job steps, in this same invocation.

If the impact includes plan changes and the confirmed mode was spec-only, say so and ask whether to continue into the plan step after this one.

### Step 4: Present Draft Revision

Before writing anything, present the drafted revision in chat: the reason, the previous and updated requirement text, acceptance-criteria additions/changes/removals, and the impact assessment from Step 3.

Then ask:

{{xoch-partial:accept-or-modify.md artifact="spec revision"}}

On `[M]`, ask what to modify, revise the draft, and ask again. Do not write the revision note, `spec.md`, or state before `[A]`.

### Step 5: Write Revision Note

Write the revision note:

```bash
xoch file write --job "[job-id]" --path "revisions/spec-[date].md" <<'XOCHEOF'
[revision note content]
XOCHEOF
```

Use this structure:

```markdown
# Spec Revision - [job-id]

**Date**: [today]

## Reason

[Why the spec changed]

## Previous Requirement

[Relevant previous text or summary]

## Updated Requirement

[New text or summary]

## Acceptance Criteria Changes

- Added: [AC IDs]
- Changed: [AC IDs]
- Removed: [AC IDs]

## Impact

- Plan impact: [none | plan revision required]
- Phase impact: [summary]
- Documentation impact: [summary]
```

### Step 6: Update Spec

Update `spec.md`:

- preserve the original job intent when still valid
- use explicit AC IDs
- do not renumber existing AC IDs unless the engineer explicitly asks
- mark removed criteria as removed or superseded when history matters
- update current-state, proposed-changes, clarifications, and impacts when needed

### Step 7: Update State

Update job state:

```bash
xoch state update --job "[job-id]" <<'XOCHEOF'
{"status": "spec_revised", "spec_status": "revised", "review_status": null, "closure_status": null, "last_spec_revision": "revisions/spec-[date].md", "last_updated": "[today]", "next_command": "xoch-revise"}
XOCHEOF
```

`next_command: xoch-revise` marks the plan step as still pending, so an interrupted invocation resumes there.

If the plan is still valid, also set:

```bash
xoch state update --job "[job-id]" <<'XOCHEOF'
{"next_command": "xoch-do", "current_step": "implement"}
XOCHEOF
```

and record why no plan revision is needed.

For multi-project jobs, preserve project ownership in the revised spec and sync the revision note, spec, and state from the primary job.

### Step 8: Continue Or Route

When the plan also needs revision (mode **Both**, or the engineer agreed after Step 3), continue into the plan step (`revise-plan-core.md`'s Step 1 onward) in this same response, without a `Ready for next step` line.

Otherwise recommend:

- `xoch-do` when the current plan remains valid
- `xoch-do` (its `final_review` step) when the change only affects final verification
- `xoch-doc` when docs need immediate refresh

## Output

When continuing into the plan step, report only:

```text
Spec revised.
Job: [job-id]
Revision: [revision path]
```

and carry on with the plan step. Otherwise end with:

```text
Spec revised.
Job: [job-id]
Revision: [revision path]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Specs define what success means.
- Do not silently change acceptance criteria; preserve old AC IDs when practical.
- Record why the spec changed before editing it.
