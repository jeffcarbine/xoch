---
name: xoch-advance-core
description: Full reference workflow for xoch-do's advance step
---

# Xoch - Advance Core

This is the full reference workflow for `xoch-do`'s `advance` step. It is rendered to `~/.xoch/prompts/core/advance-core.md` and is not installed as a command.

Review the current phase, capture a snapshot, and advance when the engineer confirms the phase is complete.

`advance` is Xoch's phase-review-and-advance step, reached when `xoch-do` finds `current_step: advance` -- normally right after its own `implement` step, in the same response. It replaces the old standalone `xoch-next` command and uses phase language instead of milestone language.

## Purpose

Compare the current phase plan against the working tree, gather implementation and validation evidence, identify gaps, and either keep the phase open or advance job state to the next phase.

Target flow:

```text
xoch-open -> xoch-do -> xoch-doc -> xoch-close
```

## Work Model

Target-model job files live under:

```text
.xoch/work/jobs/[job-id]/
```

Use the `xoch job current --json` result from the command wrapper. Run it now if the result is unavailable.

Legacy migration jobs may still live under `.xoch/context/`. Continue them in place and do not move their files automatically.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Current Phase

{{xoch-partial:job-evidence.md}}

{{xoch-partial:current-phase-context.md}}

Also check notes or evidence from the recent `implement`-step work, under `notes_dir`.

If the current phase is unclear, ask the engineer which phase should be reviewed.

{{xoch-partial:state-phase-index.md}}

{{xoch-partial:phase-boundary.md}}

### Step 2: Inspect Changes

Run or ask for the equivalent of:

```bash
xoch git-state inspect --json
git status --short
git diff --stat
git diff
git diff --staged
```

For a multi-project phase, run these checks in every project touched by the phase and group the review by project. Do not infer one repository's git state from another.

Review the diff against the current phase only. Note unrelated changes as out of scope and avoid reverting them.

If the diff contains next-phase work, call it out separately. Do not expand the current review into implementing or validating that next phase.

**QA jobs only (`job_type: qa`).** A QA job changes source only to apply patches the engineer accepted during triage. Compare every changed, staged, or untracked path outside `.xoch/` with the Files listed under Patches in `notes/qa-phase-[N].md`. Any path not tied to a recorded patch is a violation, whoever made it: report each path, do not advance, and ask the engineer to revert it, record it as a patch, or move it into a separate job. Review each recorded patch's diff for scope -- it fixes its failure and nothing else.

### Step 3: Check Phase Requirements

For the current phase, assess:

- planned files touched
- acceptance criteria covered
- implementation jobs completed
- tests/checks run, including red→green evidence for any behavior tests this phase wrote — not just that something ran
- coverage status for any file this phase modified with executable code (see `coverage-gate.md` for the closing requirement)
- documentation targets updated or deferred
- risks, regressions, or missing evidence

If requirements changed, recommend `xoch-revise` instead of advancing blindly.

For a completed checkpoint phase (`current_phase_type` is `checkpoint`), assess its `checkpoint-[N].md` snapshot instead of the standard files/tests/coverage checklist above: what the engineer exercised live, what was found, and what was corrected.

**QA jobs only (`job_type: qa`).** Replace the files/tests/coverage checklist above with the phase's `notes/qa-phase-[N].md`: every planned case has a status (`pass`, `fail`, `blocked`, `skipped`), every `fail` has reproduction values, expected vs. actual, and a proposed severity, and every `blocked`/`skipped` case has a reason. Every `fail` also has a resolution: `patched` with a passing re-test recorded under Patches, or `deferred` with a reason under Deferred. A deferred failure does not block advancing -- deferred failures are the QA job's output, not a defect in the phase. A case with no recorded result, a failure with no resolution, or a `patched` failure with no passing re-test does. The snapshot's Files Changed section lists `.xoch/` artifacts plus each patch's files, and its Validation section summarizes case status counts and patched/deferred counts.

### Step 4: Provide Phase Review

Report:

- files changed
- phase requirements met
- gaps or risks
- testing status
- documentation status
- recommendation

Keep the review firm but not theatrical. The engineer has final say.

If the engineer has already mentioned manual testing, generated files, configuration changes, external setup, documentation decisions, or known skipped checks, include that context in the review and later snapshot.

Do not ask a separate catch-up question for manual, external, or skipped-check details. The `implement` step is responsible for recording follow-up phase evidence during the implementation conversation. If evidence is missing or contradictory, mention the gap in the review and let the `[Y]`/`[N]` advancement choice handle it.

### Step 5: Confirm Advancement

After the phase review, ask exactly this:

```text
Ready to move to the next phase? [Y]es / [N]o
```

If there are no more phases, use:

```text
Ready to move to review? [Y]es / [N]o
```

Do not update phase state until the engineer answers yes. If the engineer answers no, keep the phase open and ask what still needs to be added, checked, or discussed before advancing.

### Step 6: Check Git Commit And Push State

After the engineer confirms advancement, check whether the phase changes are committed and pushed.

Prefer the read-only helper, then inspect focused details as needed:

```bash
xoch git-state inspect --json
git status --short
git status --branch --short
git log --oneline @{u}..HEAD
```

If there are uncommitted changes, staged changes, or local commits that have not been pushed:

{{xoch-config:git.behavior ask="Ask the engineer, then act on the answer as described below: `Git changes detected. What would you like me to do? [G]enerate a commit message, [C]ommit, commit and [P]ush, or [N]othing?`" generate="Do not ask. The configured git.behavior is generate: act as `[G]` below." commit="Do not ask. The configured git.behavior is commit: act as `[C]` below." push="Do not ask. The configured git.behavior is push: act as `[P]` below." none="Do not ask. The configured git.behavior is none: act as `[N]` below." default="Ask the engineer, then act on the answer as described below: `Git changes detected. What would you like me to do? [G]enerate a commit message, [C]ommit, commit and [P]ush, or [N]othing?`"}}

For a multi-project phase, report commit/push state per touched project but decide once. For `[C]` or `[P]`, create one focused commit in each repository that has phase changes (and push each, for `[P]`); never combine repository histories or claim one push covers another.

Every commit message is distilled from the phase's own Xoch docs -- the accepted spec/plan text, the phase's description in the phases document, and the acceptance criteria and evidence this phase covers -- not from Xoch's workflow identifiers. Do not include the job ID, phase number, or arc name anywhere in the message; a reader with no knowledge of this job or Xoch should be able to understand the change from the message alone.

Shape:

```text
[imperative, present-tense summary of what changed]

[optional body: what and why, distilled from spec/plan/phase text -- not a diff recap]
```

Example:

```text
Add rate limiting to the webhook ingestion endpoint

Bursts of retried webhooks from upstream were occasionally
overwhelming the queue consumer. Cap accepted requests per source
IP over a rolling window and return 429 past that limit.
```

- `[G]` -- generate: print the drafted message and stop there. Do not run `git add`, `git commit`, or `git push`; the engineer commits manually.
- `[C]` -- commit: stage this phase's changes, commit them with the drafted message, and report the commit. Do not push.
- `[P]` -- commit and push: as `[C]`, then push the current branch to its configured upstream and report the pushed branch.
- `[N]` -- nothing: do not commit or push.

Then continue with snapshot and advancement, recording the choice (and any commit or push) in the snapshot's Additional Notes.

If the branch has no upstream, the push fails, or git state is ambiguous, stop the commit/push path, explain what blocked it, and ask the engineer how they want to proceed.

### Step 7: Snapshot And Advance

When confirmed, write a phase snapshot.

For target-model jobs, write the snapshot with one call, piping in only the sections that need judgment. The helper fills in everything mechanical itself: the title and date, the next phase (or "Final review"), every file changed since the phase started -- committed, uncommitted, and new, taken from git -- and an entry for each of the phase's acceptance criteria you did not report on ("not recorded"):

```bash
xoch snapshot create --job "[job-id]" --phase "[N]" <<'XOCHEOF'
## What Changed

[summary of what this phase changed and why]

## Acceptance Criteria

- AC-001: [met | partial | not met] - [evidence]

## Validation

- [check] - [result, including red -> green for behavior tests and coverage for touched files]

## Additional Notes

[manual testing, skipped checks, risks, decisions, and the commit/push choice]
XOCHEOF
```

A section left out is written as "TBD". Pass `--title` or `--next` only to override what the phases document supplies. Read the written snapshot back with `xoch file read` and correct it with `xoch file edit` if the generated parts need a note.

Then advance:

```bash
xoch phase advance --job "[job-id]" --phase "[N]"
```

`phase advance` marks phase N complete in the phases document and makes phase N+1 current, taking its title, goal, type, files, acceptance criteria, and validation from the phases document, and recording the commit phase N+1 starts from so its own snapshot can list what it changed. When phase N is the last phase, it routes state to `final_review` instead.

Do not edit the phases document or job state by hand to advance. If another phase exists, `phase advance` leaves job state at:

```json
{
  "status": "phase_ready",
  "current_phase": 2,
  "current_phase_title": "[next phase title]",
  "current_phase_goal": "[next phase goal]",
  "current_phase_type": "implementation | checkpoint",
  "current_phase_files": ["[path]"],
  "current_phase_acceptance_criteria": ["AC-001"],
  "current_phase_validation": ["[expected check]"],
  "phase_index": ["[every phase, with phase N now complete]"],
  "next_command": "xoch-do",
  "current_step": "implement"
}
```

If no phases remain, it leaves job state at `status: implementation_complete`, every `current_phase*` field cleared (`null` or `[]`), `next_command: xoch-do`, and `current_step: final_review`.

Both outcomes above are what `phase advance` writes when run per Step 7 -- this documents its effect, it is not a separate hand-edit.

For legacy migration jobs, write a comparable `milestone-[N].md` or phase snapshot in the legacy job folder and update the legacy tracker in place.

For a multi-project job, include commit, push, validation, and changed-file evidence by project in the canonical snapshot, then sync the snapshot and advanced state to participants. Do not advance when sync fails.

## Output

If more phases remain:

```text
Phase [N] complete.
Next phase: [N+1] - [title]
{{xoch-partial:next-step.md command="xoch-do"}}
```

Stop here. Do not begin the next phase's `implement` step in this response -- a fresh `xoch-do` invocation is required, per the phase boundary.

If implementation is complete:

```text
All phases complete.
{{xoch-partial:next-step.md command="xoch-do"}}
```

Stop here too -- entering `final_review` is a new step, not a continuation of the phase that just finished, so it also waits for a fresh `xoch-do` invocation.

## Rules

{{xoch-partial:response-ending.md}}

- Engineer confirmation is required before advancing.
- Review only the current phase unless the engineer asks for broader review.
- Advancing to the next phase does not authorize starting that phase.
- Preserve unrelated worktree changes.
- Multi-project git, validation, and snapshot evidence must remain project-specific.
- Record skipped checks as skipped, not passed.
- Do not move active legacy job folders during the migration.
