---
name: xoch-implement-core
description: Full reference workflow for xoch-do's implement step
---

# Xoch - Implement Core

The `implement` step of `xoch-do`: brief the current phase, settle ownership with the engineer, do the work when appropriate, record evidence, and continue into `advance`.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Current Job

{{xoch-partial:job-evidence.md}}

{{xoch-partial:current-phase-context.md}}

If there is no active job, ask the engineer to run `xoch-open` or provide the job ID.

Mark the phase started before any other work. It records the commit the phase begins from, so its snapshot lists only its own changes, and does nothing for a phase already started:

```bash
xoch phase start --job "[job-id]"
```

If `current_phase_type` is `checkpoint`, follow Checkpoint Flow below instead of Steps 2-8.

### Step 2: Validate Readiness

Confirm:

- the job has a spec and a plan
- a current phase is identifiable and not already complete
- the phase's acceptance criteria are listed or can be inferred
- required documentation targets are known or explicitly marked unknown

If the requirements or plan no longer fit the work, route to `xoch-revise`, which decides whether the spec, the plan, or both need to change.

### Step 3: Explain The Current Phase

Before any edits, always give a concise, specific phase briefing:

- phase title and goal
- why this phase matters
- files marked for work or likely touched
- owning project for every file in a multi-project phase
- source context already known from state, plan, spec, or prior conversation
- acceptance criteria covered
- expected validation
- risks or constraints
- likely next command

### Step 4: Ask How To Proceed

Stop and ask:

{{xoch-partial:action-choice.md agent_action="does" engineer_action="does"}}

Do not begin implementation until the engineer chooses, unless they already made a clear choice in the message that invoked `xoch-do`. This choice also settles test ownership; there is no separate ask before Step 6.

- `[A]` Agent does: inspect the needed files, implement, validate, and record evidence. The agent drafts any tests.
- `[E]` Engineer does: do not edit. Provide a focused implementation checklist, validation checklist, and likely files to inspect. Wait for the engineer's tests before Step 6's fail-confirmation.
- `[C]` Collaborate: work interactively, making only changes the engineer confirms. Decide who writes which test as you go.

Record the chosen path in job state or phase notes when useful.

Treat all follow-up back-and-forth in the phase as implementation evidence. Record additional edits, manual checks, skipped checks, changed validation expectations, and decisions in the final phase summary and in state or notes, so `advance` can review without a catch-up question.

### Step 5: Prepare Implementation

{{xoch-partial:context-economy.md}}

For agent-owned or collaborative work:

1. Inspect only the files the phase needs, from their owning project roots.
2. Prefer existing project patterns over new abstractions.
3. Identify focused tests/checks before editing. When commands are not known, detect advisory candidates (from each touched project root, for multi-project phases):

   ```bash
   xoch project-commands detect --json
   ```

4. Note risky operations that need engineer approval.

{{xoch-partial:budget-check.md skill="do"}}

### Step 6: Write Behavior Tests First

{{xoch-partial:behavior-tests.md}}

When this phase adds or changes testable code behavior:

1. Write the tests before editing implementation code, per Step 4's ownership: `[A]` the agent drafts them, `[E]` the engineer provides them, `[C]` decide together.
2. Run them and confirm they fail for the right reason.
3. Record the failure as evidence.
4. Stop and ask: {{xoch-partial:accept-or-modify.md artifact="tests"}}. This gate is mandatory no matter who wrote the tests. Do not begin Step 7 before `[A]`. On `[M]`, revise the tests, re-confirm they still fail for the right reason, and ask again.

Coverage-backfill tests for existing code (per the plan) are written and run too; they are expected to pass immediately. The accept/modify gate still applies before Step 7.

Skip this step when the phase adds or changes no testable code behavior.

### Step 7: Implement

When editing:

- keep changes scoped to the current phase; do not edit files solely for a later phase
- avoid unrelated refactors
- preserve user changes already present in the worktree
- use deterministic helpers when available
- update docs only when this phase changes documented behavior
- avoid adding QA or PR process ceremony
- never move or copy implementation source between participating repositories
- add proper inline documentation on new code -- JSDoc for JavaScript/TypeScript, docstrings for Python, or the equivalent convention for the language being written
- implement until this phase's behavior tests pass, then continue to Step 8

{{xoch-config:documentation.commentMode always="Apply the inline-documentation bullet above unconditionally." default="Match whatever the target project's file or module already does for inline documentation instead of applying the bullet above unconditionally -- including adding no comments, when that's the established convention."}}

Append useful implementation notes:

```bash
xoch file write --job "[job-id]" --path "notes/do-[date].md" --append <<'XOCHEOF'
[implementation notes]
XOCHEOF
```

### Step 8: Validate

Run focused validation that matches the phase, for example:

- syntax checks for touched shell scripts
- installer smoke tests when install behavior changes
- prompt inventory scans when command files change
- targeted documentation scans when terminology changes
- project test suites when code behavior changes
- this phase's behavior tests now pass, and coverage-backfill tests still pass
- coverage on any file this phase modified with executable code, when the project has coverage tooling

If validation cannot be run, record why.

### Step 9: Record Evidence

Summarize:

- files changed, grouped by project for multi-project jobs
- acceptance criteria touched
- tests/checks run and not run
- red -> green status for each behavior test written this phase
- coverage status for any file this phase modified with executable code
- additional changes, manual checks, skipped checks, or decisions from follow-up back-and-forth
- risks or follow-up notes
- whether docs were updated or intentionally deferred

Update job state, keeping `last_validation` compact (detailed history belongs in snapshots or notes):

```bash
xoch state update --job "[job-id]" <<'XOCHEOF'
{"status": "phase_in_progress", "last_do_summary": "[short summary]", "last_validation": ["[latest check and result]"], "last_updated": "[today]"}
XOCHEOF
```

Do not touch the `current_phase*` fields or `next_command`; `phase advance` owns them, and `next_command` stays `xoch-do` within a phase.

For a multi-project job, write notes and state through the primary job and sync participant context after the final evidence update. A participant sync failure leaves the phase incomplete for handoff even when source edits succeeded.

## Checkpoint Flow

Follow this instead of Steps 2-8 when `current_phase_type` is `checkpoint`.

1. Summarize what the phases since the last checkpoint (or the start of the job) built: their goals and the acceptance criteria they cover. Use the phases document (`xoch phase show --job "[job-id]"`) and prior snapshots, not memory alone.
2. Ask the engineer to exercise that work live, however this job's output is actually used, and report what they find.
3. Make the corrections the engineer surfaces directly in this conversation. Do not invoke `xoch-revise`, and do not reopen or amend completed phases' snapshots.
4. Once the engineer confirms things look right, write `checkpoint-[N].md` under `snapshots_dir`: what was tested, what was found, and what was corrected.
5. Continue into `advance` per Output below.

## Output

Report:

```text
Phase work complete or ready for review.
Job: [job-id]
Current phase: [N] - [title]
```

Then run `xoch job step-advance --job "[job-id]"` to move `current_step` from `implement` to `advance`, and continue into the `advance` step (`advance-core.md`'s Step 1 onward) in this same response. Do not stop or print a `Ready for next step` line for this transition.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:engineer-git-rule.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Do not silently change spec scope or reshape remaining phases; use `xoch-revise`.
