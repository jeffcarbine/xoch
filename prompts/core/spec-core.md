---
name: xoch-spec-core
description: Full reference workflow for xoch-open's spec step
---

# Xoch - Spec Core

The `spec` step of `xoch-open`: turn source requirements into an accepted `spec.md` with acceptance criteria, current-state analysis, and notes. Usually runs right after `title` in the same invocation.

{{xoch-partial:project-routing.md}}

{{xoch-partial:context-economy.md}}

## Process

### Step 1: Confirm Job State

Use the job from the `xoch job current --json` result; run it if the result is unavailable. Confirm its state is readable:

```bash
xoch state get --job "[job-id]" --json
```

If no job is current or its state is missing, the job was never opened through `xoch job open`: return to `open-core.md`'s Fresh Job flow instead of creating state by hand. Otherwise mark the spec in progress:

```bash
xoch state set --job "[job-id]" --field status --value spec_in_progress
```

### Step 2: Gather Source Requirements

A job ID, title, branch name, file name, or project context orients the conversation but is not a source requirement. If this step is reached without a problem statement, desired outcome, issue text, pasted notes, explicit acceptance criteria, or direct answers to clarification questions, stop and ask the engineer for one. Do not infer requirements from the job name.

Ask for or extract:

- problem statement
- desired outcome
- in-scope and out-of-scope work
- acceptance criteria
- constraints
- documentation targets
- risks or unknowns

{{xoch-partial:storage-root.md}}

Other inputs:

- Handoffs chosen and claimed during `open` (`xoch handoff get --id "[id]"`): use what they say should change, and confirm it with the engineer like any other source.
- Accepted findings in `[xoch-root]/discoveries/*-discovery.md`, when present: treat accepted conclusions and assumptions as inputs, and preserve unresolved questions.
- An engineer-provided issue or spec with explicit requirements is the source baseline. If later clarifications conflict with it, surface the conflict and ask which source wins.

Continue only once source requirements exist.

### Step 3: Clarify Requirements

Ask a few targeted questions until these are clear:

- measurable success outcome
- scope boundaries
- acceptance criteria
- documentation targets
- constraints and non-goals
- important edge cases
- version impact: `none`, `patch`, `minor`, or `major`, with the reason, and whether the project keeps a changelog (`CHANGELOG.md` or equivalent). Recommend a level (breaking -> major, new capability -> minor, fix -> patch, internal-only -> none); the engineer decides. `xoch-doc` applies it after review passes.

If a material unknown remains that the engineer cannot answer:

1. State the unknown and the requirement, criterion, constraint, or decision it blocks.
2. Do not substitute model background knowledge or unsupported inference.
3. Recommend `xoch-discovery` and ask:

   ```text
   This spec has an unresolved unknown. Start discovery? [Y]es / [N]o
   ```

4. On `[Y]`, keep `status: spec_in_progress`, set `next_command: xoch-discovery`, and stop without drafting or accepting `spec.md`.
5. On `[N]`, continue only after the engineer explicitly accepts a documented assumption, narrows the spec, or defers the affected requirement.

When discovery returns, incorporate its accepted findings and cite the discovery note in `Clarifications & Notes`.

### Step 4: Current-State Analysis

Read the target README or docs when available and compare documented behavior against the proposed change. Summarize current state, proposed changes, what stays the same, and potential impacts.

For a multi-project job, identify requirements, current state, proposed changes, documentation targets, and acceptance evidence by project, in one shared spec. Do not create separate specs for participants.

Ask the engineer whether the change analysis is correct.

### Step 5: Assess Job Versus Arc Fit

Before writing the spec, decide whether the work is one focused job or arc-sized. Arc signals:

{{xoch-partial:arc-signals.md}}

If it fits one job, continue and optionally note:

```markdown
## Arc Fit

This work appears suitable for a single job because [reason].
```

If it is arc-sized:

1. Explain the signals and recommend setting up an arc before job-level planning.
2. Ask whether to:
   - set up the arc now
   - continue this job spec anyway
   - narrow this spec to the first job in the arc
3. To set up the arc now, follow `open-core.md`'s Set Up An Arc, adopting this job with `--adopt-active` and skipping its final Continue step. Then return here in the same response and continue this spec, scoped to this job's part of the arc.

When the spec belongs or may belong to an arc, include:

```markdown
## Arc Fit

- Recommended shape: [single job | arc candidate | job inside existing arc]
- Rationale: [short reason]
- Suggested arc: [arc-id or none]
- Candidate related jobs: [list or none]
```

This check is advisory; do not block a deliberately single-job spec.

### Step 6: Present Draft Spec

Present the draft spec in chat, using the structure in Step 7, with enough detail to review requirements, acceptance criteria, current state, proposed changes, risks, and arc fit. Then ask:

{{xoch-partial:accept-or-modify.md artifact="spec"}}

On `[M]`, ask what to modify, revise the draft, and ask again until the engineer accepts. Do not write `spec.md` or mark spec state complete before `[A]`.

### Step 7: Write Accepted Spec

Write `spec.md`:

```bash
xoch file write --job "[job-id]" --path spec.md <<'XOCHEOF'
[spec.md content]
XOCHEOF
```

Structure:

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

## Version Impact

- Level: [none | patch | minor | major]
- Reason: [why this level]
- Changelog: [path to the project's changelog, or none]

---

## Project Scope

[For multi-project jobs: each project, its role, requirement ownership, contracts affected, and documentation targets. Omit for standalone jobs.]

---

## Arc Fit

[Single-job or arc recommendation, rationale, suggested arc, and candidate related jobs]

---

## Token Usage (Spec Phase)

Budget: [current value reported by `xoch token-estimator budget check --skill spec`]
[Files read and estimates]
```


### Step 8: Update State

```bash
xoch state update --job "[job-id]" <<'XOCHEOF'
{"status": "spec_complete", "spec_status": "accepted", "last_updated": "[today]"}
XOCHEOF
```

For a multi-project job, write the accepted spec and state to the primary job, then sync participant context. Do not finish successfully if sync fails.

## Output

Report:

```text
Specification captured.
Job: [job-id]
```

Then run `xoch job step-advance --job "[job-id]"` to move `current_step` from `spec` to `plan`, and continue into the `plan` step (`plan-core.md`'s Step 1 onward) in this same response. Do not stop or print a `Ready for next step` line for this transition.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Specs describe change, not implementation details.
- Acceptance criteria are binary, testable, and carry AC IDs.
- Always make an explicit job-versus-arc recommendation before continuing to `plan`.
