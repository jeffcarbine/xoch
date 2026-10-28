---
name: xoch-open
description: Open a new job or arc, reopen a closed job, resume active or archived work, and carry it through spec and plan
---

# Xoch - Open

{{xoch-partial:workflow-boundary.md}}

`xoch-open` carries a job from no context through an accepted plan. Position is tracked by `current_step` in job state.

Route on the `job current --json` result and the engineer's message:

- **No active job.** Pick the entry mode from `~/.xoch/prompts/core/open-core.md`'s Entry Modes section:
  - closed job ID plus new work -- reopen it
  - several related jobs -- set up an arc first
  - bare invocation with no job description -- search for work to resume (paused, active elsewhere, or archived)
  - otherwise -- open a fresh job
- **Active QA job (`job_type: qa`) at `title`, `intake`, or `plan`.** Its open sequence belongs to `xoch-qa`. Summarize its state and end with `Ready for next step: \`xoch-qa\``. Do not run its steps here.
- **Active job at `title`, `spec`, or `plan`.** If the message continues that step, continue it from conversation context, or read the step's core:
  - `title` -- `~/.xoch/prompts/core/open-core.md`
  - `spec` -- `~/.xoch/prompts/core/spec-core.md`
  - `plan` -- `~/.xoch/prompts/core/plan-core.md`

  If the message describes different work, summarize the active job (ID, title, status, current step) and ask whether to keep working on it or set it aside; recommend `xoch-pause` before starting something else. Do not silently abandon it.
- **Active job at any other step** (`implement`, `advance`, `final_review`, or missing/`null` past planning). Summarize its state and recommend `xoch-do` (or `xoch-close` if it looks done). Do not continue here.

Do not read a core file for a step you are not on.

## Moving Between Steps

`title` -> `spec` -> `plan` run continuously in one invocation. Each step's core defines its own ending and helper call (`job step-advance` for `title` -> `spec` and `spec` -> `plan`; `phase advance --phase 0` for entering phase 1). Follow it as written; never write `current_step` directly.

## Output

The response stops only when:

- `plan` enters phase 1 and prints `Ready for next step: \`xoch-do\``; a fresh invocation is required
- a gate needs an engineer answer: the reopen/arc/resume questions or ID/title confirmation in `open-core.md`, the discovery question in `spec-core.md`, or either step's accept/modify gate
