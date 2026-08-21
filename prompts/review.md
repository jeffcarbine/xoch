---
name: xoch-review
description: Review completed Xoch work against acceptance, quality, tests, and documentation freshness
---

# Xoch - Review

{{xoch-partial:workflow-boundary.md}}

Review completed implementation before job closure.

`review` is Xoch's lightweight quality gate. It borrows the useful rigor of an audit without adding RepFlow-specific QA or PR ceremony.

## Purpose

Verify that completed work satisfies the spec, matches the plan, has adequate validation evidence, avoids obvious quality/security issues, and has a clear documentation freshness status.

Target flow:

```text
open-job -> spec -> plan -> make -> next -> review -> close-job
```

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Use the `xoch-actions.js job current --json` result from the workflow boundary. Run it now if the result is not already available; it returns target-model JSON state or legacy pointer metadata.

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

If implementation is plainly incomplete, say so and route to `xoch-make` or `xoch-next`.

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

Separately, confirm 100% coverage (line, branch, and function, when reported separately) on every file this job modified with executable code, using the coverage command detected in Step 4 when one exists. This is not waivable here by engineer preference or urgency — if coverage is incomplete, review status cannot be `pass` or `pass_with_waivers` regardless of any other waiver in this review, unless every remaining gap qualifies as a documented exception per `coverage-gate.md` (verified investigation, not an assertion, plus the required source/test comment pair). Route back to `xoch-make` to close any gap that doesn't qualify.

### Step 6: Documentation Freshness

Use `~/.xoch/bin/docs-drift.js check --json` when a baseline exists. Route reported paths with `~/.xoch/bin/docs-target.js resolve --path "[path]" --json`. Drift is a review signal, not an automatic documentation failure.

For each documentation target, mark:

- Current
- Updated
- Not impacted
- Stale
- Waived
- Unknown

If docs are stale and should be fixed before closure, route to:

```text
xoch-doc
```

If the engineer chooses not to update docs, record a documentation waiver.

### Step 7: Decide Review Status

Use one of these statuses:

- `pass` - acceptance is covered, the full suite passes (or its failures are explicitly waived as unrelated to this job), coverage is complete on every job-touched file (100%, or fully-recorded documented exceptions per `coverage-gate.md`), and no blocking risks remain
- `pass_with_waivers` - remaining gaps other than code coverage (which cannot be waived here, only handled via a documented exception) are explicitly waived by the engineer
- `needs_work` - issues should be fixed before close-job
- `blocked` - review cannot complete without missing information or environment access

`xoch-close-job` may proceed with `pass` or `pass_with_waivers`. It should ask before proceeding if review is missing or not passing.

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

{{xoch-partial:next-step.md command="[xoch-close-job | xoch-make | xoch-doc | xoch-revise-plan]"}}
```

Update `state.md`:

```yaml
review_status: [status]
next_command: [recommended next command]
last_updated: [today]
```

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
- Prefer fixing stale docs before close unless the engineer waives the update.
- Review every touched project in a multi-project job; one project's passing checks do not cover another.
- Do not move active legacy job folders during the migration.
