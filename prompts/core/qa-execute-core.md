---
name: xoch-qa-execute-core
description: Full reference workflow for xoch-do's implement step on a QA job
---

# Xoch - QA Execute Core

This is the full reference workflow for `xoch-do`'s `implement` step on a QA job. It is rendered to `~/.xoch/prompts/core/qa-execute-core.md` and is not installed as a command.

## Purpose

Run -- or hand to the engineer -- every case in the current QA phase exactly as planned, against the confirmed target only, and record what actually happened. Then triage the phase's failures with the engineer: patch and re-test the small, well-understood ones now, and defer the rest to a follow-up job. By the end of the QA job, only deferred failures should survive into the report.

{{xoch-partial:context-economy.md}}

## Process

### Step 1: Load The Phase

Use `xoch job evidence --job "[job-id]" --json` to resolve paths. Read job state with `xoch state get --job "[job-id]" --json` (for `qa_environment`, `qa_target`, `qa_environment_confirmed`, `qa_capabilities`) and the current phase with `xoch phase get --job "[job-id]" --phase [N] --json` -- its required capability, allowed owners, cases, and engineer instructions.

If `qa_environment_confirmed` is not `true`, stop: do not send any input. Report the gap and route back to `xoch-qa` for intake.

{{xoch-partial:phase-boundary.md}}

### Step 2: Brief The Phase

Before running anything, tell the engineer:

- phase title and what it exercises
- the target and environment, restated: `[dev | staging] - [target]`
- the required capability and whether the agent has it
- every case ID with a one-line summary, and how many cases there are
- anything the cases will create (accounts, records, uploads) and whether it needs cleaning up afterward

### Step 3: Ask Who Runs It

Offer only the owners the phase allows:

- capability available -> `How would you like to proceed? [E]ngineer does, [A]gent does, or [C]ollaborate?`
- capability not available -> `I can't run this phase's cases myself ([capability] isn't available). How would you like to proceed? [E]ngineer does, or [C]ollaborate?`

Do not run any case until the engineer chooses, unless they already chose in the message that invoked `xoch-do`.

- `[A]` Agent runs every case, in order, and records results.
- `[E]` Engineer runs every case. Print the case table and the numbered engineer instructions with every exact value, then wait for the engineer's results.
- `[C]` Split the cases with the engineer as you go -- the agent runs what its capabilities allow and the engineer runs the rest -- and record who ran each.

### Step 4: Run Or Hand Off Cases

For every case:

- Use the planned input **exactly** -- same characters, same encoding, same steps. If a case cannot be run as written (the field no longer exists, a precondition fails), mark it `blocked` with the reason instead of improvising a different case.
- Send input only to the confirmed target. If a step would leave it (a redirect to production, a third-party call, a real email or payment), stop that case and mark it `blocked`.
- Capture evidence sized to the case: HTTP status and a short response excerpt, the message shown on screen, console or network errors, a screenshot or GIF path when a browser tool supports it, or the exact command output.
- Compare the actual result with the planned expected result and assign a status:
  - `pass` -- matches the expected result
  - `fail` -- does not match
  - `blocked` -- could not be run as written
  - `skipped` -- intentionally not run, with the engineer's reason

For every `fail`, also record:

- exact reproduction: target, the literal input, and the steps
- expected vs. actual
- proposed severity -- `critical` (security exposure, data loss, crash of a core flow), `high` (core flow broken or wrong), `medium` (secondary flow or poor handling of bad input), `low` (cosmetic or message wording). This is a proposal the engineer can change.

While running cases, never edit source, configuration, or data -- fixes happen only in Step 6, after the phase's results are recorded and triaged. Never retry a failing case with different input to "see if it works" without recording that as a separate, labeled exploratory note.

### Step 5: Record Results

Write the phase's results:

```bash
xoch file write --job "[job-id]" --path "notes/qa-phase-[N].md" <<'XOCHEOF'
# QA Phase [N] Results - [title]

**Run**: [today]
**Environment**: [dev | staging] - [target]
**Ran by**: [[A] | [E] | [C]]

| ID | Status | Actual result | Evidence | Ran by | Resolution |
|---|---|---|---|---|---|

## Failures

### [case ID] - [short title]

- Severity (proposed): [critical | high | medium | low]
- Reproduction: [target, literal input, steps]
- Expected: [..]
- Actual: [..]
- Evidence: [..]
- Resolution: [patch now | defer]

## Patches

### [case ID] - [short title]

- Change: [what was fixed, in one or two lines]
- Files: [paths]
- Patched by: [[A] | [E] | [C]]
- Re-test: [original case, exact same input] -> [pass | fail], plus [affected passing cases re-run] -> [results]
- Evidence: [..]

## Deferred

- [case ID] - [severity] - [why it needs a follow-up job]

## Blocked / Skipped

- [case ID] - [reason]

## Notes

[anything created that needs cleanup, exploratory notes, environment hiccups]
XOCHEOF
```

Leave the Resolution column, Patches, and Deferred sections empty until Step 6.

Summarize for the engineer: counts per status, each failure in one line with its proposed severity, and any blocked or skipped cases.

If the phase has no failures, skip Step 6.

### Step 6: Triage, Patch, And Re-Test

Sort every `fail` into one of two groups and propose the grouping to the engineer:

- **Patch now** -- narrow and well understood: clear expected behavior, a fix likely confined to a few files, and no design decision or open question about intent.
- **Defer** -- anything larger: several related failures with a shared cause, unclear expected behavior, a fix spanning components, or a security failure whose fix is a design question rather than a one-line correction.

Present both groups with a one-line reason per failure, then ask:

```text
Do you want to [A]ccept this grouping, or [M]ove items between groups?
```

On `[M]`, regroup as the engineer directs and ask again. Do not patch anything until the engineer chooses `[A]`.

Then, for each patch-now failure, ask once for the whole group: `Who patches? [E]ngineer does, [A]gent does, or [C]ollaborate?` For each patch:

1. Make the smallest fix that addresses the recorded failure. Do not fold in refactors, unrelated fixes, or work for other failures.
2. Make sure the patched code is what the confirmed target is running (restart the local server, rebuild, or wait for the engineer to confirm a staging deploy) before re-testing.
3. Re-run the original case with its exact planned input, and re-run any of this phase's passing cases the patch could plausibly affect. Re-testing is the bar: no new regression test is required.
4. If the re-test passes, mark the failure `patched`. If it fails, try one more fix or move the failure to the defer group -- do not keep iterating inside QA.

A patch that cannot be re-tested this session is deferred, not patched.

Update `notes/qa-phase-[N].md`: fill the Resolution column (`patched` or `deferred`; leave it blank for non-failures), add a Patches entry per patched failure, and list deferred failures under Deferred. Keep each original `fail` row and its reproduction details -- a patched failure is still a finding, not a pass.

Summarize: failures patched (with files changed), failures deferred.

Update job state:

```bash
xoch state set --job "[job-id]" --field status --value phase_in_progress
xoch state set --job "[job-id]" --field last_do_summary --value "[N] cases: [x] pass, [y] fail ([p] patched, [d] deferred), [z] blocked, [w] skipped"
```

## Output

Report:

```text
QA phase results recorded.
Job: [job-id]
Current phase: [N] - [title]
```

Then run `xoch job step-advance --job "[job-id]"` to move `implement` -> `advance` and continue directly into `advance-core.md`, following its **QA jobs** branches, in this same response. Do not print a `Ready for next step` line for this transition.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

{{xoch-partial:engineer-git-rule.md}}

- Change source only in Step 6, only to patch a failure the engineer accepted as patch-now, and only as much as that failure needs.
- Never edit source, configuration, or data to make a case pass while it is being run.
- Never change a planned case's input while running it. Blocked is an honest result.
- Never send input to anything other than the confirmed target.
