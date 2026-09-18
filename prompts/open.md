---
name: xoch-open
description: Open a new job or arc, reopen a closed job, resume active or archived work, and carry it through spec and plan
---

# Xoch - Open

{{xoch-partial:workflow-boundary.md}}

`xoch-open` replaces `xoch-open-job`, `xoch-open-arc`, `xoch-spec`, `xoch-plan`, and `xoch-resume`. It covers everything from a bare invocation with no context through an accepted implementation plan -- as one command, with position tracked by `current_step` in job state.

The workflow boundary check above already ran `job current --json`. Decide what to do from its result and the engineer's message:

- **No active job.** Figure out the entry mode from the engineer's message and read `open-core.md`'s Entry Modes section:
  - a closed job ID plus new work to do -- reopen it
  - signals that this is really several related jobs -- set up an arc first
  - a bare invocation with no job description at all -- search for something to resume (paused, active-elsewhere, or archived)
  - otherwise -- open a fresh job
- **Active job exists, `current_step` is `title`, `spec`, or `plan`.** If the engineer's message is answering or continuing that step, continue it -- if you already know the flow from this conversation, continue from context; otherwise read:
  - `title` -- `open-core.md`
  - `spec` -- `~/.xoch/prompts/core/spec-core.md`
  - `plan` -- `~/.xoch/prompts/core/plan-core.md`

  If the message instead describes different work entirely, summarize the active job (ID, title, status, current step) and ask whether to keep working on it or set it aside -- recommend `xoch-pause` before starting something else. Do not silently abandon it.
- **Active job exists, `current_step` is anything else** (`implement`, `advance`, `final_review`, or missing/`null` on a job already past planning). This job is past `xoch-open`'s territory. Summarize its state and recommend `xoch-build` (or `xoch-close` if it looks done) instead of continuing here.

Do not read a core file for a step you are not currently on.

## Moving between steps

Unlike `xoch-build`'s phases, `title` -> `spec` -> `plan` happens once per job, not in a repeating loop, and each of `spec`/`plan` already has its own engineer-facing accept/modify gate. So these three steps flow continuously in one `xoch-open` invocation's conversation -- no re-invocation between them:

- `title` -> `spec`: once the job is open (or reopened, or resumed to a point before spec exists), continue straight into gathering source requirements in this same response.
- `spec` -> `plan`: `spec-core.md`'s own ending runs `job step-advance` and continues directly into `plan-core.md`. Follow it as written.
- `plan` -> entering phase 1 (`xoch-build`'s `implement` step): this is the one real stop. `plan-core.md`'s own ending uses `phase advance --phase 0 --next-phase 1 ...` and then prints `Ready for next step: \`xoch-build\`` and stops -- a fresh invocation is required, per `xoch-build`'s own phase boundary.

Every step transition is decided by a deterministic helper (`job step-advance` for `title`->`spec` and `spec`->`plan`; `phase advance` for entering phase 1), never guessed or written directly by the agent.

## Output

Follow each step's own ending as written in its core file. The response only stops when entering phase 1 (see above) or when a step's own gate requires an engineer answer before continuing (the reopen/arc/resume questions in `open-core.md`, the discovery-routing question in `spec-core.md`, or either step's accept/modify gate).
