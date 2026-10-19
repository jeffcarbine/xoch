---
name: xoch-revise-arc-core
description: Full reference workflow for xoch-revise's arc step
---

# Xoch - Revise Arc Core

The arc step of `xoch-revise`: update an arc's purpose, status, notes, risks, documentation targets, or job membership when the larger goal changes, and record why. Runs with or without an active job.

{{xoch-partial:storage-root.md}}

Arc files live under `[xoch-root]/work/arcs/[arc-id]/`: state and membership (helper-owned JSON), `notes.md`, and `revisions/`. Membership is by job ID reference; job folders stay under `[xoch-root]/work/jobs/`.

## Process

### Step 1: Identify Arc

Use the engineer's arc ID, or the active job's arc. Otherwise list arcs under `[xoch-root]/work/arcs/`.

{{xoch-partial:arc-evidence.md}}

{{xoch-partial:arc-context.md}}

### Step 2: Identify The Revision

Ask what changed: purpose or success outcome, scope or non-goals, job membership, job status grouping (active, planned, complete, parked), documentation targets, risk/constraint/unresolved question, or arc status. Clarify whether existing jobs should point back to this arc in their job state's `arc` field.

### Step 3: Assess Impact

Summarize:

- current arc state
- proposed change
- affected job IDs
- whether any job's `arc` field needs updating
- whether any job specs or plans should be revised

If job requirements or implementation order changed, note which affected jobs need a spec, plan, or both revision. When the active job is one of them, offer to continue into its spec or plan step after this one, in this same `xoch-revise` invocation; other jobs get `xoch-revise` as follow-up once they're active.

### Step 4: Present Draft Revision

Before writing anything, present the drafted revision in chat: the reason, previous and updated arc state, job membership changes, any job back-reference updates, and follow-up per affected job.

Then ask:

{{xoch-partial:accept-or-modify.md artifact="arc revision"}}

On `[M]`, ask what to modify, revise the draft, and ask again. Do not write the revision note, arc files, or job back-references before `[A]`.

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

- arc state, for title, purpose, status, documentation targets, success outcome, risks, unresolved questions, or `last_updated`:

  ```bash
  xoch arc update --arc "[arc-id]" <<'XOCHEOF'
  {"[field]": "[value]", "last_updated": "[today]"}
  XOCHEOF
  ```

- arc membership, for moving or adding a job between Active/Planned/Complete/Parked -- always through `xoch arc job-move`
- `notes.md` for rationale or context

If the engineer confirmed job back-reference updates, update each affected job:

```bash
xoch state set --job "[job-id]" --field arc --value "[arc-id or standalone]"
```

Do not move job folders.

### Step 7: Continue Or Route

If the engineer agreed in Step 3 to continue into the active job's spec or plan step, continue into it (`revise-spec-core.md` or `revise-plan-core.md`'s Step 1 onward) in this same response, without a `Ready for next step` line.

Otherwise recommend the next command:

- `xoch-open` to create a new job in the arc
- `xoch-revise` for changed job requirements, sequencing, or phases
- `xoch-do` to continue active job implementation

## Output

When continuing into a job step, report only:

```text
Arc revised.
Arc: [arc-id]
Revision: [revision path]
```

and carry on with that step. Otherwise end with:

```text
Arc revised.
Arc: [arc-id]
Revision: [revision path]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Arc changes must preserve a revision note.
- Do not nest, move, archive, or delete job folders from arc commands.
- Do not update a job's `arc` field without engineer confirmation.
- Keep arc revisions focused on the shared goal; job-level scope changes belong in the spec or plan step.
