---
name: xoch-standard-job-core
description: Step routing for xoch-do on a standard (non-QA) job
---

# Xoch - Standard Job Core

`xoch-do`'s step routing for a standard job (`job_type: standard`, or no `job_type`). Route on `current_step` from the router's `job current --json` result. If you already know the step's flow from this conversation, continue from context; otherwise read its core:

- `implement` -- brief the phase, get the ownership choice, and implement it: `~/.xoch/prompts/core/implement-core.md`
- `advance` -- review the phase and get the advance choice: `~/.xoch/prompts/core/advance-core.md`
- `final_review` -- run the job-level quality gate: `~/.xoch/prompts/core/review-core.md`
- missing, `null`, or any other value -- do not guess. Report the job's actual state and ask how to proceed.

Do not read a core for a step you are not on.

{{xoch-partial:phase-boundary.md}}

## Moving Between Steps

Transitions are made by helpers or by review's recorded outcome, never guessed or written by hand:

- `implement` -> `advance`: `xoch job step-advance --job "[job-id]"`, then continue into `advance` in the same response. Never ask for a fresh invocation here.
- Crossing a phase boundary (the next phase's `implement`, or `final_review` after the last phase): `xoch phase advance --job "[job-id]" --phase "[N]"`, then stop for a fresh `xoch-do` invocation.
- Leaving `final_review`: `review-core.md` sets `current_step` directly from the review outcome.

Each core's Output section gives the exact commands; follow it as written.
