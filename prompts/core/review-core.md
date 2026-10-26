---
name: xoch-review-core
description: Full reference workflow for xoch-do's final_review step
---

# Xoch - Review Core

The `final_review` step of `xoch-do`: a lightweight quality gate once every phase is done. Verify the work satisfies the spec, matches the plan, has adequate validation evidence, avoids obvious quality/security issues, and has a clear documentation freshness status.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Load Job Evidence

{{xoch-partial:job-evidence.md}}

Read:

- job state, via `xoch state get --job "[job-id]" --json`
- `spec` and `plan`
- phases, via `xoch phase get --job "[job-id]" --json`, only when state and snapshots do not establish phase completion
- completed phase snapshots (`current_phase_snapshot`, or list `snapshots_dir`)
- `review`, if it already exists
- documentation targets from job state/spec
- relevant README or `.xoch/docs/` files when documentation freshness is in scope
- git status and diff

For multi-project jobs, inspect source changes, git state, tests, and documentation independently in every project the plan or snapshots mark as touched.

{{xoch-partial:state-phase-index.md}}

### Step 2: Check Implementation Completeness

Confirm one of these:

- all planned phases are complete
- the engineer explicitly asked for an early review
- the job is small enough that phase tracking was intentionally skipped

If implementation is plainly incomplete, say so and route back into `xoch-do`'s `implement`/`advance` flow.

### Step 3: Acceptance Coverage

Run the coverage report to find missing or orphaned IDs; status and evidence are still your judgment:

```bash
xoch coverage compare --job "[job-id]" --require review --json
```

Mark each spec acceptance criterion `Pass`, `Partial`, `Fail`, `Not Verified`, or `Waived`, with concise evidence: code changes, docs, validation output, engineer-reported manual testing, or an explicit waiver. Multi-project evidence names the project that supplies it; a criterion may need evidence from several projects.

### Step 4: Quality And Risk Review

Review for:

- correctness against the stated requirement
- fit with existing project patterns
- avoidable complexity
- risky side effects
- security basics
- data or state migration concerns
- missing tests/checks
- documentation drift

Focus on real risks. Do not block on taste unless it reflects a maintainability or correctness issue.

When validation commands are not known, detect advisory candidates:

```bash
xoch project-commands detect --json
```

### Step 5: Full-Suite And Coverage Validation

{{xoch-partial:coverage-gate.md}}

Re-run the full test suite (command from Step 4 or already known) and record whether it passes. The engineer may explicitly waive a failure unrelated to this job's work; record the waiver and why it is unrelated. A failure caused by or related to this job's work blocks `pass`/`pass_with_waivers` until fixed.

{{xoch-config:coverage.strictness required="Separately, confirm 100% coverage (line, branch, and function, when reported separately) on every file this job modified with executable code, using the coverage command detected in Step 4 when one exists. This is not waivable here by engineer preference or urgency -- if coverage is incomplete, review status cannot be `pass` or `pass_with_waivers` regardless of any other waiver in this review, unless every remaining gap qualifies as a documented exception per the Coverage Gate (verified investigation, not an assertion, plus the required source/test comment pair). Route back to `xoch-do`'s `implement` step to close any gap that doesn't qualify." default="Separately, confirm coverage on every file this job modified with executable code, using the coverage command detected in Step 4 when one exists. If coverage is incomplete, report the specific gap to the engineer and ask whether to close it now (route back to `xoch-do`'s `implement` step) or accept it and proceed -- record the engineer's answer in the review. A gap the engineer accepts does not block `pass` or `pass_with_waivers`; a documented exception per the Coverage Gate still applies the same way it does under `required`."}}

### Step 6: Conventions Check

Check the files this job changed -- `git diff --name-only [start_ref]` from phase 1's `start_ref` (`xoch phase get --job "[job-id]" --phase 1 --json`), plus uncommitted and untracked files, minus deleted ones:

{{xoch-partial:conventions-check.md mode="check"}}

When conventions apply, record the findings, replacing any earlier run:

{{xoch-partial:conventions-findings.md source="final_review"}}

{{xoch-config:conventions.strictness required="An unresolved finding against a `confirmed` rule blocks `pass` and `pass_with_waivers`: fix it now (route back to `xoch-do`'s `implement` step), or, when the rule itself is wrong, change it with `xoch-conventions`. Findings against `inferred` rules never block; ask the engineer to fix or accept each one and record the answer as its resolution." default="Conventions findings do not block. Ask the engineer to fix or accept each finding, and record the answer as its resolution in `conventions-check.md`."}}

### Step 7: Documentation Freshness

Use `xoch docs-drift check --json` when a baseline exists, and route reported paths with `xoch docs-target resolve --path "[path]" --json`. Drift is a review signal, not an automatic failure.

Mark each documentation target `Current`, `Updated`, `Not impacted`, `Stale`, `Waived`, or `Unknown`. This is informational: a passing review always routes to `xoch-doc`, where staleness is addressed or waived, regardless of what this step finds.

### Step 8: Decide Review Status

- `pass` - acceptance is covered, the full suite passes (or its failures are explicitly waived as unrelated to this job), {{xoch-config:coverage.strictness required="coverage is complete on every job-touched file (100%, or fully-recorded documented exceptions per the Coverage Gate)" default="coverage is complete on every job-touched file, or any reported gap was explicitly accepted by the engineer (100%, a fully-recorded documented exception, or an accepted gap per the Coverage Gate)"}}, {{xoch-config:conventions.strictness required="no unresolved finding remains against a `confirmed` convention, " default=""}}and no blocking risks remain
- `pass_with_waivers` - remaining gaps other than code coverage (which {{xoch-config:coverage.strictness required="cannot be waived here, only handled via a documented exception" default="is instead handled by the engineer's live accept/fix decision or a documented exception"}}) are explicitly waived by the engineer
- `needs_work` - issues should be fixed before `xoch-close`
- `blocked` - review cannot complete without missing information or environment access

On `pass` or `pass_with_waivers`, the next command is always `xoch-doc`, never `xoch-close` or `xoch-pr` directly. `xoch-close` asks before proceeding if review is missing or not passing.

### Step 9: Write Review Result

Write `review.md` under the `job_directory` returned by `job evidence`:

```markdown
# Review - [job-id]

**Date**: [today]
**Status**: [pass | pass_with_waivers | needs_work | blocked]

## Acceptance Coverage

| AC | Status | Evidence |
|---|---|---|
| AC-001 | Pass | [evidence] |

## Quality And Risk

[Findings, risks, or no blocking issues found]

## Validation Evidence

- `[project]` [check] - [result]

## Full-Suite And Coverage

- Full suite: [pass | fail, waived as unrelated: reason | fail, blocking]
- Coverage: `[file]` - {{xoch-config:coverage.strictness required="[percentage/status; must be 100% for every job-touched file with code, or a documented exception per the Coverage Gate with the file/branch, investigation findings, and source/test comment locations]" default="[percentage/status; 100%, a documented exception per the Coverage Gate, or a gap the engineer explicitly accepted -- record which]"}}

## Conventions

- `[rule ID]` `[location]` - [fixed | accepted | open], or "No findings", or "No documented conventions"

## Documentation Freshness

- `[doc]` - [status]

## Waivers

- [waiver or "None"]

## Recommendation

{{xoch-partial:next-step.md command="[xoch-doc when pass or pass_with_waivers | xoch-do when needs_work | xoch-revise when scope changed | more investigation when blocked]"}}
```

Update job state, setting `current_step` from the outcome:

```bash
xoch state update --job "[job-id]" <<'XOCHEOF'
{"review_status": "[status]", "next_command": "[recommended next command]", "current_step": "[see below]", "last_updated": "[today]"}
XOCHEOF
```

- `pass` or `pass_with_waivers`: `current_step` is JSON `null` (not a string); `next_command` is `xoch-doc`.
- `needs_work`: `current_step` is `"implement"`; `next_command` is `xoch-do`.
- `blocked`: `current_step` stays `"final_review"`.

Write `current_step` directly here, not through `job step-advance`; the outcome is a judgment, not a mechanical transition.

For multi-project jobs, write the review and state through the primary job and sync them to participants. A sync failure makes the review `blocked` until routing is repaired.

## Output

End with:

```text
Review status: [status]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Do not invent validation that was not run or reported.
- Waivers must be explicit and recorded.
- Review does not create QA or PR handoff jobs.
