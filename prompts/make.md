---
name: xoch-make
description: Implement or guide implementation for the current Xoch phase
---

# Xoch - Make

Implement, guide, or collaborate on the current phase of the open task.

`make` is Xoch's implementation command. It replaces the old `start` command and uses phase language instead of milestone language.

## Purpose

Load the active task, understand the current phase, choose an ownership mode with the engineer, perform the work when appropriate, record useful evidence, and route to `xoch-next`.

Target flow:

```text
open -> spec -> plan -> make -> next -> review -> close
```

## Work Model

Target-model task files live under:

```text
.xoch/work/tasks/[task-id]/
```

Read active task pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration tasks

Legacy migration tasks may still live under `.xoch/context/`. Continue them in place and do not move their files automatically.

## Process

### Step 1: Identify Current Task

Read the active task pointer. For target-model tasks, load:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md`
- `phases/phase-[N].md` when present

For legacy migration tasks, load the equivalent legacy files such as `spec.md`, `plan.md`, and `milestones.md`.

If there is no active task, ask the engineer to run `xoch-open` or provide the task ID.

### Step 2: Validate Readiness

Before implementation, confirm:

- the task has a spec
- the task has a plan
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

Give the engineer a concise phase briefing:

- phase title and goal
- why this phase matters
- files likely touched
- acceptance criteria covered
- expected validation
- risks or constraints
- likely next command

Keep this practical. The engineer should know what will happen before edits begin.

### Step 4: Choose Ownership

Ask how to proceed:

1. Agent implements this phase
2. Engineer implements this phase
3. Agent and engineer collaborate

If the engineer has already made the choice, proceed with that choice and record it in task state or phase notes.

### Step 5: Prepare Implementation

For agent-owned or collaborative work:

1. Inspect only the files needed for the current phase.
2. Prefer existing project patterns over new abstractions.
3. Identify focused tests/checks before editing.
4. Note any risky operations that need engineer approval.

Use token estimates for large reads when helpful:

```bash
bin/tokenEstimator.sh --batch [files...]
```

### Step 6: Implement

When editing:

- keep changes scoped to the current phase
- avoid unrelated refactors
- preserve user changes already present in the worktree
- use deterministic helpers when available
- update docs only when this phase's work changes documented behavior
- avoid adding QA or PR process ceremony

If the task is target-model, append useful implementation notes to:

```text
.xoch/work/tasks/[task-id]/notes/
```

or the current phase file when it exists.

For legacy migration tasks, add notes to the existing legacy task folder when useful.

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

For target-model tasks, update `state.md`:

```yaml
status: phase_in_progress
current_phase: [N]
last_make_summary: [short summary]
last_validation:
  - [check and result]
next_command: xoch-next
last_updated: [today]
```

For legacy migration tasks, record the same information in the legacy task notes or tracker when appropriate.

## Output

End with:

```text
Phase work complete or ready for review.
Task: [task-id]
Current phase: [N] - [title]
Next: xoch-next
```

## Rules

- Do not start implementation without enough phase context.
- Do not silently change spec scope; use `xoch-revise-spec`.
- Do not silently reshape remaining phases; use `xoch-revise-plan`.
- Keep phase work focused.
- Record validation evidence, including skipped checks.
- Do not move active legacy task folders during the migration.
