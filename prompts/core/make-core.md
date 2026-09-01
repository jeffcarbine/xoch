---
name: xoch-make-core
description: Full reference workflow for xoch-make
---

# Xoch - Make Core

This is the full reference workflow for `xoch-make`. It is rendered to `~/.xoch/prompts/core/make-core.md` and is not installed as a command.

Implement, guide, or collaborate on the current phase of the active job.

`make` is Xoch's implementation command. It replaces the old `start` command and uses phase language instead of milestone language.

## Purpose

Load the active job, understand the current phase, choose an ownership mode with the engineer, perform the work when appropriate, record useful evidence, and route to `xoch-next`.

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

### Step 1: Identify Current Job

{{xoch-partial:job-evidence.md}}

{{xoch-partial:current-phase-context.md}}

If there is no active job, ask the engineer to run `xoch-open-job` or provide the job ID.

{{xoch-partial:state-phase-index.md}}

{{xoch-partial:phase-boundary.md}}

If the current phase's `current_phase_type` (from Step 1's state read) is `checkpoint`, stop here and follow `## Checkpoint Flow` below instead of Steps 2-8.

### Step 2: Validate Readiness

Before implementation, confirm:

- the job has a spec
- the job has a plan
- a current phase is identifiable
- the current phase is not already complete
- acceptance criteria for the phase are listed or can be inferred
- required documentation targets are known or explicitly marked unknown

If foundational requirements or the plan no longer fit the work, route to:

```text
xoch-revise-spec
xoch-revise-plan
```

Use `revise-spec` when the definition of done changes. Use `revise-plan` when the implementation path or phase breakdown changes.

### Step 3: Explain The Current Phase

Before implementation, give the engineer a concise phase briefing. This briefing is required even when the phase looks straightforward.

- phase title and goal
- why this phase matters
- files marked for work or likely touched
- owning project for every file in a multi-project phase
- source context already known from state, plan, spec, or prior conversation
- acceptance criteria covered
- expected validation
- risks or constraints
- likely next command

Keep this practical and specific. The engineer should understand what needs to be done, where the work is expected to happen, and how success will be checked before edits begin.

### Step 4: Ask How To Proceed

After the briefing, stop and ask:

{{xoch-partial:action-choice.md agent_action="makes" engineer_action="makes"}}

Do not begin implementation until the engineer chooses one of these paths, unless they already made a clear choice in the same message that invoked `xoch-make`.

Interpret the choices as:

- `[A]` Agent makes: inspect the needed files, implement the phase, validate, and record evidence. When this phase writes tests, the agent drafts them too (Step 6).
- `[E]` Engineer makes: do not edit; provide a focused implementation checklist, validation checklist, and likely files to inspect. When this phase writes tests, wait for the engineer to provide them before Step 6's fail-confirmation.
- `[C]` Collaborate: work interactively, making only the changes the engineer confirms. When this phase writes tests, decide who writes which test as part of that same collaboration rather than fixing it in advance.

This single choice also settles test ownership for the phase — there is no separate ask before Step 6.

Record the chosen path in job state or phase notes when useful.

After the initial ownership choice, treat all follow-up back-and-forth in the same phase conversation as part of phase implementation evidence. If the agent or engineer makes additional edits, runs manual checks, skips checks, changes validation expectations, or makes decisions after the first build pass, record those details in the final phase summary and in job state, notes, or the current phase file when useful. This lets `xoch-next` review the phase without asking a separate catch-up question.

### Step 5: Prepare Implementation

{{xoch-partial:context-economy.md}}

For agent-owned or collaborative work:

1. Inspect only the files needed for the current phase, from their owning project roots.
2. Prefer existing project patterns over new abstractions.
3. Identify focused tests/checks before editing. When commands are not already known, inspect advisory candidates with:

   ```bash
   ~/.xoch/bin/project-commands.js detect --json
   ```

   For multi-project phases, run command detection separately from each touched project root.

4. Note any risky operations that need engineer approval.

{{xoch-partial:budget-check.md skill="make"}}

### Step 6: Write Behavior Tests First

{{xoch-partial:behavior-tests.md}}

When this phase adds or changes testable code behavior:

1. Write the test(s) for that behavior before editing implementation code, per the ownership chosen in Step 4: `[A]` the agent drafts them, `[E]` wait for the engineer to provide them, `[C]` decide together as you go.
2. Run them and confirm they fail for the right reason — the behavior doesn't exist yet, not a broken test or a syntax error.
3. Record the failure as evidence.
4. Stop and ask: {{xoch-partial:accept-or-modify.md artifact="tests"}}. This gate is mandatory and applies no matter who wrote the tests — even engineer-authored tests need an explicit `[A]` before continuing. Do not begin Step 7 until the engineer chooses `[A]`. On `[M]`, revise the tests per the engineer's modifications and re-confirm they still fail for the right reason before asking again.

When this phase backfills coverage for pre-existing, already-correct code (per the plan's coverage-gate work), write and run those tests too. They are expected to pass immediately, not fail — that's expected, and different from the write-first flow above. The accept/modify gate above still applies before continuing to Step 7.

When this phase doesn't add or change testable code behavior — pure documentation, configuration, or research — skip this step and continue to Step 7.

### Step 7: Implement

When editing:

- keep changes scoped to the current phase
- do not edit files solely for a later phase
- avoid unrelated refactors
- preserve user changes already present in the worktree
- use deterministic helpers when available
- update docs only when this phase's work changes documented behavior
- avoid adding QA or PR process ceremony
- never move or copy implementation source between participating repositories
- add proper inline documentation on new code -- JSDoc for JavaScript/TypeScript, docstrings for Python, or the equivalent convention for the language being written
- implement until this phase's behavior tests pass (green), then continue to Step 8

Check `documentation.commentMode` in `~/.xoch/config.json` (default `always` when the file or field is missing) before applying the inline-documentation bullet above. `always` applies it unconditionally; `follow-convention` means matching whatever the target project's file or module already does instead -- including adding no comments, when that's the established convention.

If the job is target-model, append useful implementation notes with:

```bash
node ~/.xoch/bin/xoch-actions.js file write --job "[job-id]" --path "notes/make-[date].md" --append <<'XOCHEOF'
[implementation notes]
XOCHEOF
```

or, when a current phase file already exists (`current_phase_body` from Step 1's `job evidence` call), append to it instead by passing `--path "phases/phase-[N].md"`.

For legacy migration jobs, add notes to the existing legacy job folder when useful.

### Step 8: Validate

Run focused validation that matches the phase. Examples:

- syntax checks for touched shell scripts
- installer smoke tests when install behavior changes
- prompt inventory scans when command files change
- targeted documentation scans when terminology changes
- project test suites when code behavior changes
- this phase's behavior tests now pass (green), and any coverage-backfill tests still pass
- coverage on any file this phase modified with executable code, when the project has coverage tooling

If validation cannot be run, record why.

### Step 9: Record Evidence

Before ending, summarize:

- files changed, grouped by project for multi-project jobs
- acceptance criteria touched
- tests/checks run
- tests/checks not run
- red→green status for each behavior test written this phase
- coverage status for any file this phase modified with executable code
- additional changes, manual checks, skipped checks, or decisions from follow-up back-and-forth
- risks or follow-up notes
- whether docs were updated or intentionally deferred

For target-model jobs, update `state.md`:

```yaml
status: phase_in_progress
current_phase: [N]
current_phase_title: [title]
current_phase_goal: [one-sentence phase goal]
current_phase_files:
  - [path]
current_phase_acceptance_criteria:
  - AC-001
current_phase_validation:
  - [expected or completed check]
last_make_summary: [short summary]
last_validation:
  - [latest check and result]
next_command: xoch-next
last_updated: [today]
```

Keep `last_validation` compact; detailed validation history belongs in phase snapshots or notes.

For legacy migration jobs, record the same information in the legacy job notes or tracker when appropriate.

For a multi-project job, write notes and state through the primary job and sync participant context after the final evidence update. A participant sync failure leaves phase work incomplete for handoff purposes even when source edits succeeded.

## Checkpoint Flow

Follow this instead of Steps 2-8 when the current phase's `current_phase_type` is `checkpoint`.

1. Summarize what the phases since the last checkpoint (or since the start of the job) actually built — their goals and the acceptance criteria they cover. Pull this from `phases.md` and prior snapshots, not from memory alone.
2. Ask the engineer to exercise that work live — in the running app, CLI, or however this job's output is actually used — and report what they find.
3. Collaborate directly on any corrections the engineer surfaces, making the edits in the same conversation as they come up. This is expected workflow, not an out-of-band change: do not invoke `xoch-revise-spec` or `xoch-revise-plan` for it, and do not reopen or amend the snapshots of phases already completed.
4. Once the engineer confirms things look right — with or without corrections along the way — write `checkpoint-[N].md` under `snapshots_dir`, recording what was tested, what was found, and what was corrected.
5. Continue to `xoch-next` as normal; a checkpoint phase advances the same way an implementation phase does.

## Output

End with:

```text
Phase work complete or ready for review.
Job: [job-id]
Current phase: [N] - [title]
{{xoch-partial:next-step.md command="xoch-next"}}
```

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:engineer-git-rule.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Do not start implementation without enough phase context.
- Do not start or complete the next phase during the current `xoch-make` run.
- Do not silently change spec scope; use `xoch-revise-spec`.
- Do not silently reshape remaining phases; use `xoch-revise-plan`.
- Keep phase work focused.
- In multi-project jobs, edit and validate each file from its declared owning project.
- Record validation evidence, including skipped checks.
- Do not move active legacy job folders during the migration.
