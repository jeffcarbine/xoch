---
name: xoch-spec-core
description: Full reference workflow for xoch-spec
---

# Xoch - Spec Core

This is the full reference workflow for `xoch-spec`. It is rendered to `~/.xoch/prompts/core/spec-core.md` and is not installed as a command.

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
.xoch/work/current.json
.xoch/work/jobs/[job-id]/state.md
.xoch/work/jobs/[job-id]/spec.md
```

Legacy migration jobs may still live under `.xoch/context/`. If `.xoch/context/current.md` points to an active job and no `.xoch/work/current.json` exists, continue that legacy job in place and do not move it automatically.

{{xoch-partial:project-routing.md}}

## Process

### Step 0: Load Glossaries

Check for project glossaries:

```text
.xoch/glossaries/README.md
.xoch/glossaries/quick-reference.md
```

If present, read the glossary index and quick reference before requirements clarification. Use glossary-approved terminology in questions, acceptance criteria, and final spec text.

{{xoch-partial:context-economy.md}}

### Step 1: Identify Current Job

Use the `xoch-actions.js job current --json` result from the command wrapper. Run it now if the result is unavailable.

If a current job exists, use its job ID and job folder.

If no current job exists, ask the engineer for:

- job ID or short name
- job title
- documentation target if known

Generate or clean job IDs with:

```bash
~/.xoch/bin/generate-job-id.js --id "[provided-id]"
~/.xoch/bin/generate-job-id.js
```

### Step 2: Ensure Job State

For target-model jobs, ensure:

```text
.xoch/work/jobs/[job-id]/state.md
.xoch/work/current.json
```

If `state.md` does not exist, create it with:

```yaml
job_id: [job-id]
title: [job title]
status: spec_in_progress
arc: [arc-id or standalone]
current_phase: null
phase_count: 0
current_phase_title: null
current_phase_goal: null
current_phase_files: []
current_phase_acceptance_criteria: []
current_phase_validation: []
phase_index: []
documentation_targets:
  - [README path, docs packet, or project-wide]
decisions: []
risks: []
active_workflow: null
workflow_stage: null
pending_action: null
workflow_artifact: null
return_command: null
workflow_started_at: null
review_status: null
closure_status: null
next_command: xoch-spec
started: [today]
last_updated: [today]
```

For legacy jobs, update the legacy context files in place.

### Step 3: Gather Source Requirements

Do not draft a spec from only a job ID, job title, branch name, file name, or project context. Those can orient the conversation, but they are not source requirements.

If the engineer invoked `xoch-spec` without providing a problem statement, desired outcome, issue text, pasted notes, explicit acceptance criteria, or direct answers to clarification questions, stop and ask them to provide that source. Do not infer or invent requirements from the job name.

Ask for or extract:

- problem statement
- desired outcome
- in-scope work
- out-of-scope work
- acceptance criteria
- constraints
- documentation targets
- risks or unknowns

Read relevant accepted `notes/discovery-*.md` findings when they already exist. Treat their accepted conclusions and assumptions as spec inputs while preserving any unresolved questions.

If the engineer provides an issue/spec with explicit requirements, treat it as the source baseline. If later clarifications conflict, surface the conflict and ask which source should win.

Only continue to current-state analysis and draft spec once source requirements exist.

### Step 4: Clarify Requirements

Ask targeted questions until these are clear:

- measurable success outcome
- scope boundaries
- acceptance criteria
- documentation targets
- constraints and non-goals
- important edge cases

Prefer a few high-signal questions over a long questionnaire.

If a material unknown remains and the engineer cannot answer it:

1. State the unknown and the requirement, criterion, constraint, or decision it blocks.
2. Do not substitute model background knowledge or unsupported inference.
3. Recommend `xoch-discovery` and ask:

   ```text
   This spec has an unresolved unknown. Start discovery? [Y]es / [N]o
   ```

4. If `[Y]`, keep `status: spec_in_progress`, set `next_command: xoch-discovery`, and stop without drafting or accepting `spec.md`.
5. If `[N]`, continue only after the engineer explicitly accepts a documented assumption, narrows the spec, or defers the affected requirement.

When discovery returns, incorporate its accepted findings and cite the discovery note in `Clarifications & Notes`.

### Step 5: Current-State Analysis

Read the target README or docs when available. Compare current documented behavior against the proposed change.

Summarize:

- current state
- proposed changes
- staying the same
- potential impacts

For a multi-project job, identify requirements, current state, proposed changes, documentation targets, and acceptance evidence by project. Keep one shared specification; do not create separate specs for listed participants.

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

### Step 7: Present Draft Spec

Before writing the spec file, present the draft spec in chat using the structure below. Keep it concise enough to review, but complete enough that the engineer can see requirements, acceptance criteria, current state, proposed changes, risks, and arc fit.

Then ask:

{{xoch-partial:accept-or-modify.md artifact="spec"}}

If the engineer chooses `[M]`, ask what they want modified, revise the draft, and ask again. Repeat until the engineer accepts.

Do not write `spec.md` or mark spec state complete until the engineer chooses `[A]`.

### Step 8: Write Accepted Spec

Write `spec.md` with:

```bash
node ~/.xoch/bin/xoch-actions.js file write --job "[job-id]" --path spec.md <<'XOCHEOF'
[spec.md content]
XOCHEOF
```

Use this structure:

```markdown
# Specification - [job-id]

**Date**: [today]
**Status**: Accepted
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

## Project Scope

[For multi-project jobs: each project, its role, requirement ownership, contracts affected, and documentation targets. Omit for standalone jobs.]

---

## Arc Fit

[Single-job or arc recommendation, rationale, suggested arc, and candidate related jobs]

---

## Token Usage (Spec Phase)

Budget: 5,000 tokens
[Files read and estimates]
```

### Step 9: Update State

Update `state.md`:

```yaml
status: spec_complete
spec_status: accepted
next_command: xoch-plan
last_updated: [today]
```

If writing a legacy migration job, update the existing `.xoch/context/[job-id]/spec.md` and current pointer instead.

For a multi-project job, write the accepted spec and state to the primary job, then sync participant context. Do not finish successfully if sync fails.

## Output

End with:

```text
Specification captured.
Job: [job-id]
{{xoch-partial:next-step.md command="xoch-plan"}}
```

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Specs describe change, not implementation details.
- Do not draft a spec without engineer-provided source requirements.
- Do not invent requirements from a job name, branch name, file name, or project context.
- Route material unknowns to `xoch-discovery` instead of manufacturing certainty.
- Multi-project specs identify project ownership without splitting the job into independent specifications.
- Present the draft spec and get `[A]` acceptance before writing `spec.md`.
- If the engineer chooses `[M]`, ask for modifications and revise before writing.
- Acceptance criteria must be binary and testable.
- Use AC IDs for traceability.
- Always make an explicit job-versus-arc recommendation before routing to `xoch-plan`.
- Do not silently contradict a provided source requirement.
- Do not move active legacy job folders during the migration.
