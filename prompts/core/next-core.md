---
name: xoch-next-core
description: Full reference workflow for xoch-next
---

# Xoch - Next Core

This is the full reference workflow for `xoch-next`. It is rendered to `~/.xoch/prompts/core/next-core.md` and is not installed as a command.

Review the current phase, capture a snapshot, and advance when the engineer confirms the phase is complete.

`next` replaces the old `advance` command and uses phase language instead of milestone language.

## Purpose

Compare the current phase plan against the working tree, gather implementation and validation evidence, identify gaps, and either keep the phase open or advance job state to the next phase.

Target flow:

```text
open-job -> spec -> plan -> make -> next -> review -> close-job
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

### Step 1: Identify Current Phase

{{xoch-partial:job-evidence.md}}

{{xoch-partial:current-phase-context.md}}

Also check notes or evidence from recent `xoch-make` work, under `notes_dir`.

If the current phase is unclear, ask the engineer which phase should be reviewed.

{{xoch-partial:state-phase-index.md}}

{{xoch-partial:phase-boundary.md}}

### Step 2: Inspect Changes

Run or ask for the equivalent of:

```bash
~/.xoch/bin/git-state.js inspect --json
git status --short
git diff --stat
git diff
git diff --staged
```

For a multi-project phase, run these checks in every project touched by the phase and group the review by project. Do not infer one repository's git state from another.

Review the diff against the current phase only. Note unrelated changes as out of scope and avoid reverting them.

If the diff contains next-phase work, call it out separately. Do not expand the current review into implementing or validating that next phase.

### Step 3: Check Phase Requirements

For the current phase, assess:

- planned files touched
- acceptance criteria covered
- implementation jobs completed
- tests/checks run, including red→green evidence for any behavior tests this phase wrote — not just that something ran
- coverage status for any file this phase modified with executable code (100% is required before the job can close; see `coverage-gate.md`)
- documentation targets updated or deferred
- risks, regressions, or missing evidence

If requirements changed, recommend `xoch-revise-spec` or `xoch-revise-plan` instead of advancing blindly.

For a completed checkpoint phase (`current_phase_type` is `checkpoint`), assess its `checkpoint-[N].md` snapshot instead of the standard files/tests/coverage checklist above: what the engineer exercised live, what was found, and what was corrected.

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

Do not ask a separate catch-up question for manual, external, or skipped-check details. `xoch-make` is responsible for recording follow-up phase evidence during the implementation conversation. If evidence is missing or contradictory, mention the gap in the review and let the `[Y]`/`[N]` advancement choice handle it.

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
~/.xoch/bin/git-state.js inspect --json
git status --short
git status --branch --short
git log --oneline @{u}..HEAD
```

If there are uncommitted changes, staged changes, or local commits that have not been pushed, say:

```text
Git changes detected. What would you like me to do? [C]ommit and push the changes, [G]enerate a commit message for you, or [N]othing?
```

For a multi-project phase, report commit/push state per touched project but ask this choice once. If the engineer chooses `[C]`, create and push one focused commit in each repository that has phase changes; never combine repository histories or claim one push covers another.

If the engineer chooses `[C]`:

1. Create a focused commit for the current phase changes.
2. Distill the commit message from the phase's own Xoch docs -- the accepted spec/plan text, the phase's description in `phases.md`, and the acceptance criteria and evidence this phase covers -- not from Xoch's workflow identifiers. Do not include the job ID, phase number, or arc name anywhere in the message; a reader with no knowledge of this job or Xoch should be able to understand the change from the message alone.

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

3. Push the current branch to its configured upstream.
4. Report the exact commit message and pushed branch to the engineer.
5. Continue with snapshot and advancement.

If the engineer chooses `[G]`:

1. Draft a commit message the same way as `[C]`: distilled from the phase's own docs, with no job ID, phase number, or arc reference anywhere in it.
2. Print the drafted message and stop. Do not run `git commit`, `git add`, or `git push` — the engineer commits manually.
3. Continue with snapshot and advancement.

If the engineer chooses `[N]`, do not commit or push. Continue with snapshot and advancement, and record in the snapshot that commit/push was deferred.

If the branch has no upstream, the push fails, or git state is ambiguous, stop the commit/push path, explain what blocked it, and ask the engineer how they want to proceed.

### Step 7: Snapshot And Advance

When confirmed, write a phase snapshot.

For target-model jobs, prefer deterministic helpers for file/path mechanics:

```bash
~/.xoch/bin/xoch-actions.js snapshot create --job "[job-id]" --phase "[N]" --title "[title]" --next "[next phase or xoch-review]"
~/.xoch/bin/xoch-actions.js phase advance --job "[job-id]" --phase "[N]" --next-phase "[N+1]" --next-title "[title]" --next-goal "[goal]" --next-type "[implementation or checkpoint, from phase N+1's Type field]" --next-files "[comma-separated paths]" --next-ac "[comma-separated AC IDs]" --next-validation "[comma-separated checks]"
```

If there are no more phases, omit the `--next-*` arguments so the helper routes state to `xoch-review`.

After helper use, replace placeholder snapshot content with the actual summary/evidence. If helpers are unavailable, create or update `phase-[N].md` under `snapshots_dir` (from Step 1's `job evidence` call).

Use this structure:

```markdown
# Phase [N] Snapshot - [Title]

**Completed**: [today]
**Status**: Complete

## What Changed

[Summary]

## Files Changed

- `[project]` `[file]` - [what changed]

## Acceptance Criteria

- AC-001: [status and evidence]

## Validation

- [check] - [result]

## Additional Notes

[manual testing, skipped checks, risks, commit/push status, or decisions]

## Next

[next phase or xoch-review]
```

Also update the current phase section in `phases.md`:

```markdown
**Status**: Complete
```

If another phase exists, update:

```markdown
## Current Phase: [N+1]
```

and update `state.md`:

```yaml
status: phase_ready
current_phase: [N+1]
current_phase_title: [next phase title]
current_phase_goal: [one-sentence next phase goal]
current_phase_type: [implementation or checkpoint]
current_phase_files:
  - [path]
current_phase_acceptance_criteria:
  - AC-001
current_phase_validation:
  - [expected check]
phase_index:
  - phase: [N]
    title: [completed title]
    status: complete
    type: [implementation or checkpoint]
  - phase: [N+1]
    title: [next title]
    status: not_started
    type: [implementation or checkpoint]
next_command: xoch-make
last_updated: [today]
```

If no phases remain, update `state.md`:

```yaml
status: implementation_complete
current_phase: null
current_phase_title: null
current_phase_goal: null
current_phase_type: null
current_phase_files: []
current_phase_acceptance_criteria: []
current_phase_validation: []
next_command: xoch-review
last_updated: [today]
```

For legacy migration jobs, write a comparable `milestone-[N].md` or phase snapshot in the legacy job folder and update the legacy tracker in place.

For a multi-project job, include commit, push, validation, and changed-file evidence by project in the canonical snapshot, then sync the snapshot and advanced state to participants. Do not advance when sync fails.

## Output

If more phases remain:

```text
Phase [N] complete.
Next phase: [N+1] - [title]
{{xoch-partial:next-step.md command="xoch-make"}}
```

Stop here. Do not begin the next `xoch-make` phase work in this response.

If implementation is complete:

```text
All phases complete.
{{xoch-partial:next-step.md command="xoch-review"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Engineer confirmation is required before advancing.
- Review only the current phase unless the engineer asks for broader review.
- Advancing to the next phase does not authorize starting that phase.
- Preserve unrelated worktree changes.
- Multi-project git, validation, and snapshot evidence must remain project-specific.
- Record skipped checks as skipped, not passed.
- Do not move active legacy job folders during the migration.
