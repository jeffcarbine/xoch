---
name: xoch-review-core
description: Full reference workflow for xoch-build's final_review step
---

# Xoch - Review Core

This is the full reference workflow for `xoch-build`'s `final_review` step. It is rendered to `~/.xoch/prompts/core/review-core.md` and is not installed as a command.

Review completed implementation before job closure.

This is Xoch's lightweight quality gate, reached once every phase is done. It borrows the useful rigor of an audit without adding RepFlow-specific QA or PR ceremony.

## Purpose

Verify that completed work satisfies the spec, matches the plan, has adequate validation evidence, avoids obvious quality/security issues, and has a clear documentation freshness status.

Target flow:

```text
xoch-open -> xoch-build -> xoch-doc -> xoch-close
```

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Use the `xoch-actions.js job current --json` result from the command wrapper. Run it now if the result is unavailable.

Legacy migration jobs may still live under `.xoch/context/`. Continue them in place and do not move their files automatically.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Load Job Evidence

{{xoch-partial:job-evidence.md}}

Then read:

- `state`
- `spec`
- `plan`
- `phases` only when state and snapshots do not establish phase completion clearly
- completed phase snapshots (`current_phase_snapshot`, or list `snapshots_dir` for the full set)
- `review` if it already exists (non-`null`)
- documentation targets from job state/spec
- relevant README or `.xoch/docs/` files when documentation freshness is in scope
- git status and diff

For multi-project jobs, inspect source changes, git state, tests, and documentation independently in every project that the plan or snapshots mark as touched.

For legacy migration jobs, read the equivalent legacy context files.

{{xoch-partial:state-phase-index.md}}

### Step 2: Check Implementation Completeness

Confirm one of these is true:

- all planned phases are complete
- the engineer explicitly asks for an early review
- the job is small enough that phase tracking was intentionally skipped

If implementation is plainly incomplete, say so and route back into `xoch-build`'s `implement`/`advance` flow rather than continuing this step.

### Step 3: Acceptance Coverage

Start with the deterministic coverage report:

```bash
~/.xoch/bin/coverage-actions.js compare --job "[job-id]" --require review --json
```

Use the report to find missing or orphaned IDs; the agent still judges status and evidence.

For each acceptance criterion in the spec, mark:

- Pass
- Partial
- Fail
- Not Verified
- Waived

Include concise evidence. Evidence can come from code changes, docs, validation output, manual testing reported by the engineer, or explicit waiver.

Multi-project acceptance evidence must name the project that supplies it. Criteria may require evidence from more than one project.

### Step 4: Quality And Risk Review

Review the completed work for:

- correctness against the stated requirement
- fit with existing project patterns
- avoidable complexity
- risky side effects
- security basics
- data or state migration concerns
- missing tests/checks
- documentation drift

Focus on real risks. Do not block on taste unless taste reflects a maintainability or correctness issue.

When project validation commands are not already known, inspect advisory candidates with:

```bash
~/.xoch/bin/project-commands.js detect --json
```

### Step 5: Full-Suite And Coverage Validation

{{xoch-partial:coverage-gate.md}}

Re-run the project's full test suite (using the test command detected or already known from Step 4) and record whether it passes. A failure unrelated to this job's work may be explicitly waived by the engineer; record the waiver and what makes it unrelated. A failure caused by or related to this job's work blocks `pass`/`pass_with_waivers` until fixed.

Separately, confirm 100% coverage (line, branch, and function, when reported separately) on every file this job modified with executable code, using the coverage command detected in Step 4 when one exists. This is not waivable here by engineer preference or urgency -- if coverage is incomplete, review status cannot be `pass` or `pass_with_waivers` regardless of any other waiver in this review, unless every remaining gap qualifies as a documented exception per `coverage-gate.md` (verified investigation, not an assertion, plus the required source/test comment pair). Route back to `xoch-build`'s `implement` step to close any gap that doesn't qualify.

### Step 6: Documentation Freshness

Use `~/.xoch/bin/docs-drift.js check --json` when a baseline exists. Route reported paths with `~/.xoch/bin/docs-target.js resolve --path "[path]" --json`. Drift is a review signal, not an automatic documentation failure.

For each documentation target, mark:

- Current
- Updated
- Not impacted
- Stale
- Waived
- Unknown

This assessment is informational for the review record. It does not decide whether `xoch-doc` runs next -- a passing review always routes to `xoch-doc` (Step 8), where staleness is actually addressed or explicitly waived, regardless of what this step finds.

### Step 7: Decide Review Status

Use one of these statuses:

- `pass` - acceptance is covered, the full suite passes (or its failures are explicitly waived as unrelated to this job), coverage is complete on every job-touched file (100%, or fully-recorded documented exceptions per `coverage-gate.md`), and no blocking risks remain
- `pass_with_waivers` - remaining gaps other than code coverage (which cannot be waived here, only handled via a documented exception) are explicitly waived by the engineer
- `needs_work` - issues should be fixed before `xoch-close`
- `blocked` - review cannot complete without missing information or environment access

On `pass` or `pass_with_waivers`, the recommended next command is always `xoch-doc` -- not `xoch-close` or `xoch-pr` directly, even though `xoch-close` may eventually proceed once `xoch-doc` has run. `xoch-close` should ask before proceeding if review is missing or not passing.

### Step 8: Write Review Result

For target-model jobs, write `review.md` under the `job_directory` field returned by `job evidence`.

Use this structure:

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
- Coverage: `[file]` - [percentage/status; must be 100% for every job-touched file with code, or a documented exception per `coverage-gate.md` with the file/branch, investigation findings, and source/test comment locations]

## Documentation Freshness

- `[doc]` - [status]

## Waivers

- [waiver or "None"]

## Recommendation

{{xoch-partial:next-step.md command="[xoch-doc when pass or pass_with_waivers | xoch-build when needs_work | xoch-revise-plan when scope changed | more investigation when blocked]"}}
```

Update `state.md`, setting `current_step` from the same outcome rather than leaving it at `final_review`:

```yaml
review_status: [status]
next_command: [recommended next command]
current_step: [null when pass or pass_with_waivers -- next_command is xoch-doc; implement when needs_work -- next_command is xoch-build; final_review when blocked -- still stuck here]
last_updated: [today]
```

`current_step` is written directly here, not through `job step-advance` -- this outcome is a judgment call, not a mechanical lookup.

For legacy migration jobs, write `review.md` in the legacy job folder.

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
- A passing review always routes to `xoch-doc` next, never directly to `xoch-close` or `xoch-pr` -- documentation staleness is addressed or waived there, not skipped here.
- Review every touched project in a multi-project job; one project's passing checks do not cover another.
- Do not move active legacy job folders during the migration.
