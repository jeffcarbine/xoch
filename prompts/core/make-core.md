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

Read active job pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

Legacy migration jobs may still live under `.xoch/context/`. Continue them in place and do not move their files automatically.

## Process

### Step 1: Identify Current Job

Read the active job pointer. For target-model jobs, load:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md`
- `phases/phase-[N].md` when present

For legacy migration jobs, load the equivalent legacy files such as `spec.md`, `plan.md`, and `milestones.md`.

If there is no active job, ask the engineer to run `xoch-open-job` or provide the job ID.

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
- source context already known from the plan/spec
- acceptance criteria covered
- expected validation
- risks or constraints
- likely next command

Keep this practical and specific. The engineer should understand what needs to be done, where the work is expected to happen, and how success will be checked before edits begin.

### Step 4: Ask How To Proceed

After the briefing, stop and ask:

{{xoch-partial:action-choice.md agent_action="builds" engineer_action="builds"}}

Do not begin implementation until the engineer chooses one of these paths, unless they already made a clear choice in the same message that invoked `xoch-make`.

Interpret the choices as:

- `[A]` Agent builds: inspect the needed files, implement the phase, validate, and record evidence.
- `[E]` Engineer builds: do not edit; provide a focused implementation checklist, validation checklist, and likely files to inspect.
- `[C]` Collaborate: work interactively, making only the changes the engineer confirms.

Record the chosen path in job state or phase notes when useful.

### Step 5: Prepare Implementation

For agent-owned or collaborative work:

1. Inspect only the files needed for the current phase.
2. Prefer existing project patterns over new abstractions.
3. Identify focused tests/checks before editing.
4. Note any risky operations that need engineer approval.

Use token estimates for large reads when helpful:

```bash
~/.xoch/bin/tokenEstimator.sh --batch [files...]
```

### Step 6: Implement

When editing:

- keep changes scoped to the current phase
- avoid unrelated refactors
- preserve user changes already present in the worktree
- use deterministic helpers when available
- update docs only when this phase's work changes documented behavior
- avoid adding QA or PR process ceremony

If the job is target-model, append useful implementation notes to:

```text
.xoch/work/jobs/[job-id]/notes/
```

or the current phase file when it exists.

For legacy migration jobs, add notes to the existing legacy job folder when useful.

### Step 7: Validate

Run focused validation that matches the phase. Examples:

- syntax checks for touched shell scripts
- installer smoke tests when install behavior changes
- prompt inventory scans when command files change
- targeted documentation scans when terminology changes
- project test suites when code behavior changes

If validation cannot be run, record why.

### Step 8: Record Evidence

Before ending, summarize:

- files changed
- acceptance criteria touched
- tests/checks run
- tests/checks not run
- risks or follow-up notes
- whether docs were updated or intentionally deferred

For target-model jobs, update `state.md`:

```yaml
status: phase_in_progress
current_phase: [N]
last_make_summary: [short summary]
last_validation:
  - [check and result]
next_command: xoch-next
last_updated: [today]
```

For legacy migration jobs, record the same information in the legacy job notes or tracker when appropriate.

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

- Do not start implementation without enough phase context.
- Do not silently change spec scope; use `xoch-revise-spec`.
- Do not silently reshape remaining phases; use `xoch-revise-plan`.
- Keep phase work focused.
- Record validation evidence, including skipped checks.
- Do not move active legacy job folders during the migration.
