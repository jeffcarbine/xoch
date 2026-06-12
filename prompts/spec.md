---
name: xoch-spec
description: Capture Xoch job requirements and acceptance criteria
---

# Xoch - Spec

Capture what should change before implementation planning begins.

## Purpose

Turn a job idea, issue, bug, or copied requirements into a clear job specification with acceptance criteria, constraints, current-state analysis, and traceable notes.

`xoch-spec` normally runs after `xoch-open-job`.

Target flow:

```text
open-job -> spec -> plan -> make -> next -> review -> close-job
```

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Expected files after this command:

```text
.xoch/work/current.md
.xoch/work/jobs/[job-id]/state.md
.xoch/work/jobs/[job-id]/spec.md
```

Legacy migration jobs may still live under `.xoch/context/`. If `.xoch/context/current.md` points to an active job and no `.xoch/work/current.md` exists, continue that legacy job in place and do not move it automatically.

## Process

### Step 0: Load Glossaries

Check for project glossaries:

```text
.xoch/glossaries/README.md
.xoch/glossaries/quick-reference.md
```

If present, read the glossary index and quick reference before requirements clarification. Use glossary-approved terminology in questions, acceptance criteria, and final spec text.

### Step 1: Identify Current Job

Read active job pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

If a current job exists, use its job ID and job folder.

If no current job exists, ask the engineer for:

- job ID or short name
- job title
- documentation target if known

Generate or clean job IDs with:

```bash
bin/generateJobId.sh --id "[provided-id]"
bin/generateJobId.sh
```

### Step 2: Ensure Job State

For target-model jobs, ensure:

```text
.xoch/work/jobs/[job-id]/state.md
.xoch/work/current.md
```

If `state.md` does not exist, create it with:

```yaml
job_id: [job-id]
title: [job title]
status: spec_in_progress
arc: [arc-id or standalone]
current_phase: null
documentation_targets:
  - [README path, docs packet, or project-wide]
decisions: []
risks: []
review_status: null
closure_status: null
next_command: xoch-spec
started: [today]
last_updated: [today]
```

For legacy jobs, update the legacy context files in place.

### Step 3: Gather Source Requirements

Ask for or extract:

- problem statement
- desired outcome
- in-scope work
- out-of-scope work
- acceptance criteria
- constraints
- documentation targets
- risks or unknowns

If the engineer provides an issue/spec with explicit requirements, treat it as the source baseline. If later clarifications conflict, surface the conflict and ask which source should win.

### Step 4: Clarify Requirements

Ask targeted questions until these are clear:

- measurable success outcome
- scope boundaries
- acceptance criteria
- documentation targets
- constraints and non-goals
- important edge cases

Prefer a few high-signal questions over a long questionnaire.

### Step 5: Current-State Analysis

Read the target README or docs when available. Compare current documented behavior against the proposed change.

Summarize:

- current state
- proposed changes
- staying the same
- potential impacts

Ask the engineer whether the change analysis is correct.

### Step 6: Assess Job Versus Arc Fit

Before writing the final job spec, decide whether the requested work still looks like one focused job or whether it would be healthier as an arc with multiple jobs.

Use these signals for arc-sized work:

- multiple independent outcomes or workstreams
- several features, packages, services, or repositories with different validation paths
- substantial sequencing where one piece should be planned or reviewed separately from another
- several documentation targets with different owners or audiences
- acceptance criteria that naturally cluster into multiple jobs
- uncertainty high enough that a shared arc spec would help before job-level specs continue

If the work appears to fit one focused job, continue normally and optionally note:

```markdown
## Arc Fit

This work appears suitable for a single job because [reason].
```

If the work appears arc-sized:

1. Explain the signals that make it larger than one job.
2. Recommend `xoch-open-arc` before continuing job-level planning.
3. Ask the engineer whether to:
   - run `xoch-open-arc` now
   - continue this job spec anyway
   - narrow this job spec to the first job in the arc
4. If the engineer chooses `xoch-open-arc`, stop after summarizing the recommended arc purpose and candidate jobs.

When continuing a job spec that belongs to or may belong to an arc, include:

```markdown
## Arc Fit

- Recommended shape: [single job | arc candidate | job inside existing arc]
- Rationale: [short reason]
- Suggested arc: [arc-id or none]
- Candidate related jobs: [list or none]
```

This check is advisory. Do not block a deliberately single-job spec if the engineer chooses to continue.

### Step 7: Write Spec

Write:

```text
.xoch/work/jobs/[job-id]/spec.md
```

Use this structure:

```markdown
# Specification - [job-id]

**Date**: [today]
**Status**: Draft
**Documentation Targets**: [paths or project-wide]

---

## Requirements

[Requirement source and clarified job scope]

---

## Acceptance Criteria

- AC-001: [Binary, testable criterion]
- AC-002: [Binary, testable criterion]

---

## Current State

[What exists today]

---

## Proposed Changes

[What will change]

---

## Staying The Same

[Unaffected behavior]

---

## Clarifications & Notes

[Decisions and notes]

---

## Potential Impacts

[Breaking changes, risks, affected docs/features]

---

## Arc Fit

[Single-job or arc recommendation, rationale, suggested arc, and candidate related jobs]

---

## Token Usage (Spec Phase)

Budget: 8,000 tokens
[Files read and estimates]
```

### Step 8: Update State

Update `state.md`:

```yaml
status: spec_complete
spec_status: draft
next_command: xoch-plan
last_updated: [today]
```

If writing a legacy migration job, update the existing `.xoch/context/[job-id]/spec.md` and current pointer instead.

## Output

End with:

```text
Specification captured.
Job: [job-id]
{{xoch-partial:next-step.md command="xoch-plan"}}
```

## Rules

- Specs describe change, not implementation details.
- Acceptance criteria must be binary and testable.
- Use AC IDs for traceability.
- Always make an explicit job-versus-arc recommendation before routing to `xoch-plan`.
- Do not silently contradict a provided source requirement.
- Do not move active legacy job folders during the migration.
