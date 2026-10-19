---
name: xoch-qa-job-core
description: Step routing for xoch-do on a QA job
---

# Xoch - QA Job Core

`xoch-do`'s step routing for a QA job (`job_type: qa`). Each invocation runs one QA phase (executing or handing off its planned cases and recording results); once every phase is done, it writes the QA report and asks what happens next. The only source a QA job changes is small patches for failures the engineer chose to fix and re-test during a phase.

Route on `current_step` from the router's `job current --json` result. If you already know the step's flow from this conversation, continue from context; otherwise read its core:

- `implement` -- brief the QA phase, get the ownership choice, and run or hand off its cases: `~/.xoch/prompts/core/qa-execute-core.md`
- `advance` -- review the phase's results and get the advance choice, following the **QA jobs** branches of `~/.xoch/prompts/core/advance-core.md`
- `final_review` -- write the QA report and get the next-step decision: `~/.xoch/prompts/core/qa-report-core.md`
- missing, `null`, or any other value -- do not guess. Report the job's actual state and ask how to proceed.

Do not read a core for a step you are not on.

{{xoch-partial:phase-boundary.md}}

## Moving Between Steps

Transitions are made by helpers or by the engineer's recorded decision, never guessed or written by hand:

- `implement` -> `advance`: once the phase's results are recorded, `xoch job step-advance --job "[job-id]"`, then continue into `advance` in the same response.
- Crossing a phase boundary (the next phase's `implement`, or `final_review` after the last phase): `xoch phase advance --job "[job-id]" --phase "[N]"`, then stop for a fresh `xoch-do` invocation.
- Leaving `final_review`: `qa-report-core.md` records the engineer's next-step decision. A QA job never routes to `xoch-doc`; its patches correct behavior to match what was expected, not what is documented.

Each core's Output section gives the exact commands; follow it as written.

## Rules

- Change source only in `qa-execute-core.md`'s triage step, only for failures the engineer accepted as patch-now, and re-test each patch before counting it fixed. Every other failure is recorded and deferred.
- Only send test input to the target recorded by `qa confirm-env`.
