---
name: xoch-revise-spec-core
description: Full reference workflow for xoch-revise's spec step
---

# Xoch - Revise Spec Core

This is the full reference workflow for `xoch-revise`'s spec step. It is rendered to `~/.xoch/prompts/core/revise-spec-core.md` and is not installed as a command.

Revise a job's foundational requirements after the original spec needs to change.

## Purpose

Capture what changed, preserve the previous requirement history, update the job specification, and mark downstream plans/phases as needing review when necessary.

This step runs when the definition of done changes: scope, acceptance criteria, constraints, non-goals, documentation targets, or job purpose. It replaces the old standalone `xoch-revise-spec` command.

When the requirement is still correct but the implementation path needs to change, that's `xoch-revise`'s plan step (`revise-plan-core.md`) instead. When both change, this step runs first and continues into the plan step in the same invocation.

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Revision notes live under:

```text
.xoch/work/jobs/[job-id]/revisions/
```

Legacy migration jobs may still live under `.xoch/context/`. Continue them in place and do not move them automatically.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Current Job

{{xoch-partial:job-evidence.md}}

Then load:

- `state` when returned
- `spec`
- `plan`
- `phases`
- recent files under `revisions_dir`
- relevant documentation target files when the spec change affects docs

If no active job exists, ask for the job ID.

### Step 2: Identify The Spec Change

Ask what changed:

- requirement
- acceptance criterion
- scope boundary
- non-goal
- constraint
- documentation target
- risk or assumption
- job purpose

Clarify whether the change supersedes, adds to, or removes existing spec content.

### Step 3: Assess Impact

Identify:

- affected acceptance criteria
- phases already completed that remain valid
- phases that need plan updates
- tests/checks that need to change
- documentation targets that need update
- whether job status should move back from implementation/review/closure toward planning

If the arc association or the arc's own goal changes, offer to continue into `xoch-revise`'s arc step (`revise-arc-core.md`) after the job steps, in this same invocation.

If the impact includes plan changes and the confirmed mode was spec-only, say so and ask whether to continue into the plan step after this one -- do not silently expand the revision.

### Step 4: Present Draft Revision

Before writing anything, present the drafted revision in chat: the reason, the previous and updated requirement text, acceptance-criteria additions/changes/removals, and the impact assessment from Step 3.

Then ask:

{{xoch-partial:accept-or-modify.md artifact="spec revision"}}

If the engineer chooses `[M]`, ask what they want modified, revise the draft, and ask again. Do not write the revision note, `spec.md`, or state until the engineer chooses `[A]`.

### Step 5: Write Revision Note

Write `spec-[date].md` with:

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

For legacy migration jobs, write the revision note in the legacy job folder.

### Step 6: Update Spec

Update `spec.md` carefully:

- preserve the original job intent when still valid
- use explicit AC IDs
- do not renumber existing AC IDs unless the engineer explicitly asks
- mark removed criteria as removed or superseded when history matters
- update current-state, proposed-changes, clarifications, and impacts when needed

### Step 7: Update State

For target-model jobs, update `state.md`:

```yaml
status: spec_revised
spec_status: revised
review_status: null
closure_status: null
last_spec_revision: revisions/spec-[date].md
last_updated: [today]
next_command: xoch-revise
```

`next_command: xoch-revise` marks the plan step as still pending, so an interrupted invocation resumes there.

If the plan is still valid, set instead:

```yaml
next_command: xoch-do
current_step: implement
```

and record why no plan revision is needed.

For legacy migration jobs, update the legacy tracker or notes in place.

For multi-project jobs, preserve project ownership in the revised spec and sync the revision note, spec, and state from the primary job.

### Step 8: Continue Or Route

When the plan also needs revision (mode **Both**, or the engineer agreed to continue after Step 3), do not stop: continue directly into the plan step (`revise-plan-core.md`'s own Step 1 onward) in this same response, without printing a `Ready for next step` line.

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
- Do not silently change acceptance criteria.
- Preserve old AC IDs when practical.
- Record why the spec changed before editing the spec.
- Present the draft revision and get `[A]` acceptance before writing anything.
- Do not move active legacy job folders during the migration.
