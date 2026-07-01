---
name: xoch-open-arc
description: Open an optional Xoch arc for grouping related jobs
---

# Xoch - Open Arc

Open an optional arc: a larger goal that groups related jobs by reference.

## Purpose

Create arc state, capture the larger goal, record known job membership, and make it easy for future jobs to point back to the arc.

Arcs are not required for normal Xoch work. Use them when several jobs share a larger outcome and the engineer wants a small amount of shared tracking.

## Work Model

Arcs live under:

```text
.xoch/work/arcs/[arc-id]/
```

Jobs remain first-class folders under:

```text
.xoch/work/jobs/[job-id]/
```

Arc membership is by job ID reference only. Do not move or nest job folders inside an arc.

## Process

### Step 1: Check Active Job Context

Before gathering arc metadata, inspect active job pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

If an active target-model job exists, read its `state.md` and determine whether it is already part of an arc:

- If `arc` is an arc ID, summarize that existing arc relationship and ask whether the engineer wants to revise that arc instead of opening a new one.
- If `arc` is `standalone`, `null`, empty, or missing, treat it as an active standalone job candidate for the new arc.

For an active standalone job:

1. Summarize the job ID, title, current status, current phase, documentation targets, and next command.
2. Check whether `.xoch/work/jobs/[job-id]/spec.md` exists.
3. If a spec exists, summarize the spec purpose, acceptance criteria clusters, and potential arc signals.
4. Ask whether to:
   - infer the arc purpose and initial job list from the active job spec
   - use engineer-provided arc spec/metadata instead
   - open the arc without adopting the active job
5. Unless the engineer declines adoption, add the active standalone job to the new arc's `jobs.md` under `Active`.
6. If the engineer approves, update that job's `state.md` with `arc: [arc-id]`.

If the active job comes from legacy `.xoch/context/`, do not move it. Ask before referencing it in target-model arc files, and record the legacy context path in `jobs.md` or `notes.md` if the engineer wants it included.

### Step 2: Gather Arc Metadata

Ask for:

- arc ID or short name
- arc title
- larger goal or purpose
- success outcome
- known job IDs, if any
- documentation targets or project area
- risks, constraints, or non-goals

If no ID is provided, generate a short kebab-case ID from the title or goal.

If the engineer chose to infer arc metadata from an active job spec, propose defaults before writing files:

- arc title from the broader outcome implied by the job spec
- purpose from the job problem statement and proposed changes
- success outcome from the spec acceptance criteria
- candidate jobs from acceptance-criteria clusters, impacted areas, or clearly separable workstreams
- documentation targets from the active job state/spec

Ask for confirmation or edits to those inferred values.

### Step 3: Check Existing Arc State

Inspect:

```text
.xoch/work/arcs/
```

If the arc already exists, summarize its state and ask whether to resume it or use `xoch-revise-arc`.

### Step 4: Create Arc Files

Prefer the deterministic helper:

```bash
~/.xoch/bin/xoch-actions.sh arc open --id "[arc-id]" --title "[title]" --purpose "[purpose]" --success "[success outcome]" --doc-scope "[scope]" --doc-path "[path]"
```

Add `--adopt-active` only when the engineer confirmed adopting the active standalone job.

If the helper is unavailable, create the files manually as below.

### Step 5: Manual Arc State Fallback

Create:

```text
.xoch/work/arcs/[arc-id]/state.md
```

Use this shape:

```yaml
arc_id: [arc-id]
title: [arc title]
purpose: [larger goal]
status: active
documentation_targets:
  - scope: feature|project|docs|unknown
    path: [path or unknown]
success_outcome: [what done looks like]
risks: []
unresolved_questions: []
started: [today]
last_updated: [today]
next_command: xoch-open-job
```

### Step 6: Write Job References

Create:

```text
.xoch/work/arcs/[arc-id]/jobs.md
```

Use this structure:

```markdown
# Arc Jobs - [arc-id]

## Active

- `[job-id]` - [job title or unknown]

## Planned

- `[job-id or placeholder]` - [intended job]

## Complete

- None

## Parked

- None
```

If an active standalone job was adopted, include it under `Active` automatically unless the engineer declined adoption.

If known jobs already exist under `.xoch/work/jobs/`, ask before updating their `state.md` arc field to `[arc-id]`.

### Step 7: Write Notes

Create:

```text
.xoch/work/arcs/[arc-id]/notes.md
```

Capture:

- why the arc exists
- initial decisions
- known constraints
- initial job membership reasoning
- whether active-job adoption was checked
- whether arc metadata was inferred from an active job spec or provided by the engineer

### Step 8: Update Adopted Job State

If an active standalone target-model job was adopted and the engineer approved the back-reference, update:

```text
.xoch/work/jobs/[job-id]/state.md
```

Set:

```yaml
arc: [arc-id]
last_updated: [today]
```

Do not change current phase, review status, or next command unless the engineer explicitly asks.

### Step 9: Route

If the engineer wants to open a job in the arc:

```text
{{xoch-partial:next-step.md command="xoch-open-job"}}
```

Tell `xoch-open-job` to set:

```yaml
arc: [arc-id]
```

If the arc was opened only for planning, stop after summarizing the created arc files.

## Output

End with:

```text
Arc opened.
Arc: [arc-id]
Job references: .xoch/work/arcs/[arc-id]/jobs.md
{{xoch-partial:next-step.md command="xoch-open-job"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Arcs group jobs by reference.
- Do not create job folders inside arc folders.
- Prefer `~/.xoch/bin/xoch-actions.sh` for deterministic arc file creation.
- Do not rewrite job `state.md` arc fields without engineer confirmation.
- Always check for an active standalone job before creating a new arc.
- Adopt the active standalone job by reference when the engineer approves or when they asked to infer the arc from that job.
- Do not require arcs for standalone jobs.
- Keep arcs lightweight; they are coordination records, not project-management ceremony.
