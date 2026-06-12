---
name: xoch-start-job
description: Start or resume a Xoch job
---

# Xoch - Start Job

Start or resume a focused unit of work.

This is the normal entry point for Xoch job work.

## Purpose

Create or resume job state, capture basic metadata, record optional arc association, identify documentation targets when known, and route to `xoch-spec`.

Target flow:

```text
start-job -> spec -> plan -> make -> next -> review -> close-job
```

## Work Model

New job work lives under:

```text
.xoch/work/jobs/[job-id]/
```

The active job pointer is:

```text
.xoch/work/current.md
```

Arcs live under:

```text
.xoch/work/arcs/[arc-id]/
```

Arcs reference job IDs; job folders are not nested inside arc folders.

Legacy migration jobs may still live under `.xoch/context/`. If a legacy current job exists and the engineer wants to continue it, do not move it automatically.

## Process

### Step 1: Detect Active Work

Read active pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

If active work exists:

- summarize job ID, title, status, current phase, and next command when available
- ask whether to resume it or start a different job

If the engineer starts a different job while one is active, recommend `xoch-pause` first.

### Step 2: Gather Metadata

Ask only for missing values:

- job ID or issue ID
- job title
- short description
- standalone job or arc association
- documentation target, if known
- whether strict documentation target enforcement is required

If the engineer describes work that sounds like several related jobs, suggest starting an arc first:

```text
This may be arc-sized. Consider `xoch-start-arc` if you want shared tracking before job-level specs.
```

Continue creating the job if the engineer confirms this should remain one focused job.

Documentation targets may be:

- a feature README
- root README/project docs
- `.xoch/docs/` packets
- `project-wide`
- `unknown` for exploratory work

### Step 3: Generate Or Clean Job ID

Use:

```bash
bin/generateJobId.sh --id "[provided-id]"
```

If no ID is provided:

```bash
bin/generateJobId.sh
```

### Step 4: Create Job Folder

Create:

```text
.xoch/work/jobs/[job-id]/
.xoch/work/jobs/[job-id]/notes/
.xoch/work/jobs/[job-id]/phases/
.xoch/work/jobs/[job-id]/revisions/
```

Do not create arc folders unless the job belongs to an arc or the engineer asks to start an arc.

### Step 5: Write State

Create:

```text
.xoch/work/jobs/[job-id]/state.md
```

Use this shape:

```yaml
job_id: [job-id]
title: [job title]
description: [short description]
status: active
arc: [arc-id or standalone]
current_phase: null
documentation_targets:
  - scope: feature|project|docs|unknown
    path: [path or unknown]
decisions: []
risks: []
unresolved_questions: []
review_status: null
closure_status: null
next_command: xoch-spec
started: [today]
last_updated: [today]
```

### Step 6: Write Current Pointer

Create `.xoch/work/current.md`:

```markdown
# Current Job

**Job ID**: [job-id]
**Title**: [job title]
**Arc**: [arc-id or standalone]
**Status**: active
**Current Phase**: none
**Next Command**: xoch-spec
**Job Directory**: .xoch/work/jobs/[job-id]/
**Started**: [today]
```

### Step 7: Route

End with:

```text
Job started.
{{xoch-partial:next-step.md command="xoch-spec"}}
```

## Rules

- Jobs are first-class units of work.
- Arcs group job IDs by reference.
- Missing documentation targets are allowed for exploratory work but must be explicit in `state.md`.
- Do not auto-migrate active legacy `.xoch/context/` jobs.
