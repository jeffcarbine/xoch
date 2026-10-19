---
name: xoch-advance-core
description: Full reference workflow for xoch-do's advance step
---

# Xoch - Advance Core

The `advance` step of `xoch-do`, normally reached right after `implement` in the same response: review the current phase against the working tree, capture a snapshot, and advance when the engineer confirms.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Current Phase

{{xoch-partial:job-evidence.md}}

{{xoch-partial:current-phase-context.md}}

Also check recent `implement`-step notes and evidence under `notes_dir`. If the current phase is unclear, ask the engineer which phase to review.

### Step 2: Inspect Changes

Run or ask for the equivalent of:

```bash
xoch git-state inspect --json
git status --short
git diff --stat
git diff
git diff --staged
```

For a multi-project phase, run these in every touched project and group the review by project. Never infer one repository's git state from another.

Review the diff against the current phase only. Note unrelated changes as out of scope and do not revert them. Call out next-phase work separately; do not implement or validate it.

**QA jobs only (`job_type: qa`).** A QA job changes source only to apply patches the engineer accepted during triage. Compare every changed, staged, or untracked path outside `.xoch/` with the Files listed under Patches in `notes/qa-phase-[N].md`. Any path not tied to a recorded patch is a violation, whoever made it: report each path, do not advance, and ask the engineer to revert it, record it as a patch, or move it into a separate job. Review each recorded patch's diff for scope -- it fixes its failure and nothing else.

### Step 3: Check Phase Requirements

Assess:

- planned files touched
- acceptance criteria covered
- planned work completed
- tests/checks run, including red -> green evidence for behavior tests written this phase, not just that something ran
- coverage status for any file this phase modified with executable code
- documentation targets updated or deferred
- risks, regressions, or missing evidence

If requirements changed, recommend `xoch-revise` instead of advancing.

For a checkpoint phase (`current_phase_type` is `checkpoint`), assess its `checkpoint-[N].md` snapshot instead of the checklist above: what the engineer exercised live, what was found, and what was corrected.

**QA jobs only (`job_type: qa`).** Replace the files/tests/coverage checklist above with the phase's `notes/qa-phase-[N].md`: every planned case has a status (`pass`, `fail`, `blocked`, `skipped`), every `fail` has reproduction values, expected vs. actual, and a proposed severity, and every `blocked`/`skipped` case has a reason. Every `fail` also has a resolution: `patched` with a passing re-test recorded under Patches, or `deferred` with a reason under Deferred. A deferred failure does not block advancing -- deferred failures are the QA job's output, not a defect in the phase. A case with no recorded result, a failure with no resolution, or a `patched` failure with no passing re-test does. The snapshot's Files Changed section lists `.xoch/` artifacts plus each patch's files, and its Validation section summarizes case status counts and patched/deferred counts.

### Step 4: Provide Phase Review

Report files changed, phase requirements met, gaps or risks, testing status, documentation status, and a recommendation. Be direct; the engineer has final say.

Include any manual testing, generated files, configuration changes, external setup, documentation decisions, or skipped checks the engineer already mentioned, in the review and later in the snapshot. Do not ask a separate catch-up question for them; if evidence is missing or contradictory, state the gap and let the `[Y]`/`[N]` choice handle it.

### Step 5: Confirm Advancement

Ask exactly:

```text
Ready to move to the next phase? [Y]es / [N]o
```

If no phases remain, ask:

```text
Ready to move to review? [Y]es / [N]o
```

Do not update phase state before a yes. On no, keep the phase open and ask what still needs to be added, checked, or discussed.

### Step 6: Check Git Commit And Push State

After a yes, check whether the phase changes are committed and pushed:

```bash
xoch git-state inspect --json
git status --short
git status --branch --short
git log --oneline @{u}..HEAD
```

If there are uncommitted changes, staged changes, or unpushed local commits:

{{xoch-config:git.behavior
generate="Do not ask the engineer what to do with git. Draft a commit message, print it, and stop there: do not run `git add`, `git commit`, or `git push`; the engineer commits manually."
commit="Do not ask the engineer what to do with git. Stage this phase's changes, commit them with a drafted message, and report the commit. Do not push."
push="Do not ask the engineer what to do with git. Stage this phase's changes, commit them with a drafted message, push the current branch to its configured upstream, and report the commit and pushed branch."
none="Do not ask the engineer what to do with git, and do not commit or push: leave the changes for the engineer."
default="Ask the engineer once, after reporting git state per touched project for a multi-project phase:

```text
Git changes detected. What would you like me to do? [G]enerate a commit message, [C]ommit, commit and [P]ush, or [N]othing?
```

- `[G]` -- print the drafted message and stop there. Do not run `git add`, `git commit`, or `git push`; the engineer commits manually.
- `[C]` -- stage this phase's changes, commit them with the drafted message, and report the commit. Do not push.
- `[P]` -- as `[C]`, then push the current branch to its configured upstream and report the pushed branch.
- `[N]` -- do not commit or push."
}}

When drafting a commit message:

{{xoch-partial:commit-message.md}}

For a multi-project phase, draft, commit, and push separately in each repository that has phase changes. Never combine repository histories or claim one push covers another.

Record what was done with git in the snapshot's Additional Notes, then continue to Step 7.

If the branch has no upstream, the push fails, or git state is ambiguous, stop the commit/push path, explain what blocked it, and ask the engineer how to proceed.

### Step 7: Snapshot And Advance

Write the phase snapshot with one call, piping in only the sections that need judgment. The helper fills in the title, date, next phase (or "Final review"), every file changed since the phase started (committed, uncommitted, and new), and "not recorded" for any phase acceptance criterion you omit:

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

A section left out is written as "TBD". Pass `--title` or `--next` only to override the phases document. Read the snapshot back with `xoch file read` and fix it with `xoch file edit` if the generated parts need a note.

Then advance:

```bash
xoch phase advance --job "[job-id]" --phase "[N]"
```

`phase advance` marks phase N complete and makes phase N+1 current (`status: phase_ready`, `current_step: implement`), copying its fields from the phases document and recording its start commit. After the last phase it sets `status: implementation_complete`, clears the `current_phase*` fields, and sets `current_step: final_review`. Never edit the phases document or job state by hand to advance.

For a multi-project job, record commit, push, validation, and changed-file evidence by project in the canonical snapshot, then sync the snapshot and advanced state to participants. Do not advance when sync fails.

## Output

If more phases remain:

```text
Phase [N] complete.
Next phase: [N+1] - [title]
{{xoch-partial:next-step.md command="xoch-do"}}
```

If implementation is complete:

```text
All phases complete.
{{xoch-partial:next-step.md command="xoch-do"}}
```

Either way, stop. The next phase's `implement` step and `final_review` each need a fresh `xoch-do` invocation.

## Rules

{{xoch-partial:response-ending.md}}

- Engineer confirmation is required before advancing.
- Review only the current phase unless the engineer asks for broader review.
- Preserve unrelated worktree changes.
- Keep multi-project git, validation, and snapshot evidence project-specific.
- Record skipped checks as skipped, not passed.
