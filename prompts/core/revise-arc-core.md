---
name: xoch-revise-arc-core
description: Full reference workflow for xoch-revise's arc step
---

# Xoch - Revise Arc Core

This is the full reference workflow for `xoch-revise`'s arc step. It is rendered to `~/.xoch/prompts/core/revise-arc-core.md` and is not installed as a command.

Revise an arc's purpose, status, notes, risks, documentation targets, or job membership.

## Purpose

Update an arc when the larger goal changes while preserving why the arc changed. This step replaces the old standalone `xoch-revise-arc` command; it is the arc-level sibling of `xoch-revise`'s spec and plan steps and can run with or without an active job.

## Work Model

Arc files live under:

```text
.xoch/work/arcs/[arc-id]/
```

Typical files:

```text
state.md
jobs.md
notes.md
revisions/
```

Arc membership is represented by job ID references. Job folders remain under `.xoch/work/jobs/`.

## Process

### Step 1: Identify Arc

If the engineer provides an arc ID, use it. Otherwise list arcs under `[xoch-root]/work/arcs/` (resolve `[xoch-root]` with `xoch config root`).

{{xoch-partial:arc-evidence.md}}

{{xoch-partial:arc-context.md}}

### Step 2: Identify The Revision

Ask what changed:

- purpose or success outcome
- scope or non-goals
- job membership
- job status grouping: active, planned, complete, parked
- documentation targets
- risk, constraint, or unresolved question
- arc status

Clarify whether existing jobs should point back to this arc in their job `state.md`.

### Step 3: Assess Impact

Summarize:

- current arc state
- proposed change
- affected job IDs
- whether job `state.md` files need updates
- whether any job specs or plans should be revised

If job requirements or implementation order changed, note which affected jobs need a spec, plan, or both revision. When the active job is one of them, offer to continue into its spec or plan step after this one, in this same `xoch-revise` invocation; other jobs get `xoch-revise` as follow-up once they're active.

### Step 4: Present Draft Revision

Before writing anything, present the drafted revision in chat: the reason, previous and updated arc state, job membership changes, any job back-reference updates, and follow-up per affected job.

Then ask:

{{xoch-partial:accept-or-modify.md artifact="arc revision"}}

If the engineer chooses `[M]`, ask what they want modified, revise the draft, and ask again. Do not write the revision note, arc files, or job back-references until the engineer chooses `[A]`.

### Step 5: Write Revision Note

Create `arc-[date].md` under `revisions_dir` (from Step 1's `arc evidence` call).

Use this structure:

```markdown
# Arc Revision - [arc-id]

**Date**: [today]

## Reason

[Why the arc changed]

## Previous State

[Brief summary]

## Updated State

[Brief summary]

## Job Membership Changes

- Added: [job IDs]
- Removed: [job IDs]
- Reclassified: [job IDs]

## Follow-Up

- [job] -> [xoch-revise (spec) | xoch-revise (plan) | xoch-revise (both) | none]
```

### Step 6: Update Arc Files

Update only the files needed:

- `state.md` for title, purpose, status, documentation targets, success outcome, risks, unresolved questions, or `last_updated`
- `jobs.md` for job membership references -- prefer `xoch arc job-move` for moving or adding a job between Active/Planned/Complete/Parked
- `notes.md` for rationale or context

If the engineer confirmed job back-reference updates, update affected job `state.md` files:

```yaml
arc: [arc-id or standalone]
```

Do not move job folders.

### Step 7: Continue Or Route

If the engineer agreed in Step 3 to continue into the active job's spec or plan step, do not stop: continue directly into that step (`revise-spec-core.md` or `revise-plan-core.md`'s own Step 1 onward) in this same response, without printing a `Ready for next step` line.

Otherwise recommend the next command:

- `xoch-open` to create a new job in the arc
- `xoch-revise` for changed job requirements, sequencing, or phases
- `xoch-do` to continue active job implementation

## Output

When continuing into a job step, report only:

```text
Arc revised.
Arc: [arc-id]
Revision: .xoch/work/arcs/[arc-id]/revisions/arc-[date].md
```

and carry on with that step. Otherwise end with:

```text
Arc revised.
Arc: [arc-id]
Revision: .xoch/work/arcs/[arc-id]/revisions/arc-[date].md
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Arc changes must preserve a revision note.
- Present the draft revision and get `[A]` acceptance before writing anything.
- Job membership is by job ID reference.
- Do not nest, move, archive, or delete job folders from arc commands.
- Do not update job `state.md` arc fields without engineer confirmation.
- Keep arc revisions focused on the shared goal; job-level scope changes belong in `xoch-revise`.
