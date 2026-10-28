---
name: xoch-qa-report-core
description: Full reference workflow for xoch-do's final_review step on a QA job
---

# Xoch - QA Report Core

The `final_review` step of `xoch-do` on a QA job: turn every phase's recorded results into one actionable QA report, then ask what happens next for deferred failures (patch, open a job, or nothing). Failures patched and re-tested during their phase are reported but need no follow-up. Produces `qa-report.md` and the state fields `qa_decision` and `review_status: qa_reported`.

{{xoch-partial:context-economy.md}}

## Process

### Step 1: Gather Results

Use `xoch job evidence --job "[job-id]" --json` to resolve paths. Read job state (`xoch state get --job "[job-id]" --json`), `intake.md`, `plan.md`, and every `notes/qa-phase-[N].md`. Read phase snapshots only when a results note is missing or contradicts them.

Confirm every planned case has a recorded status. A case with no result is reported as `not run` -- never assumed to have passed.

### Step 2: Write The Report

```bash
xoch file write --job "[job-id]" --path qa-report.md <<'XOCHEOF'
# QA Report - [job title]

**Date**: [today]
**Environment**: [dev | staging] - [target]
**Capabilities**: [browser=.., http=.., shell=..]
**Related job**: [job ID or none]

## Summary

[One paragraph: what was QA'd, overall result, the most important finding.]

| Phase | Cases | Pass | Fail | Patched | Deferred | Blocked | Skipped | Not run |
|---|---|---|---|---|---|---|---|---|
| **Total** | | | | | | | | |

## Patched During QA

- [case ID] - [short title] - [severity] - [change] - [files] - re-test passed

## Deferred Failures

Ordered by severity (proposed by the agent; engineer may adjust).

### [case ID] - [short title] - [severity]

- Phase: [N] - [title]
- What it probes: [the case's rationale]
- Reproduction: [target, literal input, steps]
- Expected: [..]
- Actual: [..]
- Evidence: [..]

## Blocked, Skipped, And Not Run

- [case ID] - [status] - [reason]

## Coverage Gaps

[Areas the plan excluded, cases that could not be run, and capabilities the agent lacked -- what this report does not vouch for.]

## Recommended Follow-Up

- Recommendation: [patch | open a job | nothing needed]
- Rationale: [why this scope]
- Suggested source requirements: [the deferred failures to address, as they would be handed to xoch-patch or xoch-open]
XOCHEOF
```

### Step 3: Recommend And Ask

Recommend one option from the deferred failures only -- patched failures are already resolved:

- **Nothing needed** -- no deferred failures, and no blocked or not-run cases the engineer considers important.
- **Patch** -- one or two failures, narrow and well understood, likely confined to a few files, no security exposure, and clear expected behavior.
- **Open a job** -- anything broader: several failures, a security-relevant failure (injection, escaping, authorization), unclear expected behavior, or a fix likely to span components.

Present the summary table, the patched failures in one line each, the deferred failures in one line each, and the recommendation with its reason. Then ask exactly:

```text
What would you like to do next? [P]atch, [O]pen a job, or [N]othing needed?
```

The engineer may also adjust severities or the recommended scope before choosing; update `qa-report.md` to match before recording the decision.

### Step 4: Record The Decision

```bash
xoch state set --job "[job-id]" --field qa_decision --value "[patch | open_job | none]"
xoch state set --job "[job-id]" --field review_status --value qa_reported
xoch state set --job "[job-id]" --field status --value qa_reported
xoch state set --job "[job-id]" --field current_step --value null
xoch state set --job "[job-id]" --field next_command --value xoch-close
```

`current_step` is written directly here, not through `job step-advance`: this outcome is the engineer's decision, not a mechanical lookup.

Append the decision to `qa-report.md` under a `## Decision` heading (the choice, the date, and any severity or scope adjustments the engineer made).

## Output

```text
QA report written.
Job: [job-id]
Results: [pass]/[total] passed, [fail] failed, [blocked + skipped + not run] not passed
Decision: [patch | open a job | nothing needed]
```

Then end with the next step. A QA job is closed before follow-up work starts, so there is never a second active job:

- `[N]` -- `Ready for next step: \`xoch-close\``
- `[P]` -- say that after closing, `xoch-patch` should be given the report's deferred failures (`qa-report.md` -> Recommended Follow-Up) as its issue, then end with `Ready for next step: \`xoch-close\``
- `[O]` -- leave the deferred failures as a handoff for the next `xoch-open`, report the handoff ID it prints, say that after closing `xoch-open` will offer it as source requirements, then end with `Ready for next step: \`xoch-close\``:

  ```bash
  xoch handoff write --source qa --topic "[job title] follow-up" <<'XOCHEOF'
  [the report's Recommended Follow-Up: each deferred failure with its reproduction, expected vs. actual, and severity, plus the qa-report.md path]
  XOCHEOF
  ```

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Never edit source files here, and never start the patch or new job from here. Patching happens only during a phase's triage step.
- Never report a case as passing without a recorded result.
- Never route a QA job to `xoch-doc`.
