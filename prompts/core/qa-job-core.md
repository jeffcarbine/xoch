---
name: xoch-qa-job-core
description: Step routing for xoch-do on a QA job
---

# Xoch - QA Job Core

This is `xoch-do`'s step routing for a QA job (`job_type: qa`). It is rendered to `~/.xoch/prompts/core/qa-job-core.md` and is not installed as a command; `xoch-do` reads it after routing on `job_type`.

On a QA job, `xoch-do` runs one QA phase per invocation -- executing or handing off that phase's planned cases and recording the results -- and, once every phase is done, writes the QA report and asks the engineer what happens next. A QA job observes and records; the only source it changes is small patches for failures the engineer chose to fix and re-test during the phase. Larger findings are deferred to a follow-up job.

The `xoch-do` router already ran `job current --json`. Read its `current_step` and act accordingly:

- `implement` -- brief the QA phase, get the ownership choice, and run or hand off its cases. If you already know this flow from this conversation, continue from context; otherwise read:
  ```text
  ~/.xoch/prompts/core/qa-execute-core.md
  ```
- `advance` -- review the phase's results and get the advance choice. If you already know this flow, continue from context; otherwise read `advance-core.md` and follow its **QA jobs** branches:
  ```text
  ~/.xoch/prompts/core/advance-core.md
  ```
- `final_review` -- write the QA report and get the next-step decision. If you already know this flow, continue from context; otherwise read:
  ```text
  ~/.xoch/prompts/core/qa-report-core.md
  ```
- missing, `null`, or any other value -- do not guess. Report the job's actual state to the engineer and ask how to proceed.

Do not read a core file for a step you are not currently on.

{{xoch-partial:phase-boundary.md}}

## Moving between steps

Every transition is decided by a deterministic helper, never guessed or written directly by the agent:

- Right when a QA phase's results are recorded -- before asking the advance question -- run `xoch job step-advance --job "[job-id]"` to move `implement` -> `advance`, then continue straight into the advance flow in this same response.
- Crossing a phase boundary -- `advance` -> the next phase's `implement`, or falling through to `final_review` once every phase is done -- is `phase advance`'s job, exactly as `advance-core.md` documents. This ends the response and asks for a fresh `xoch-do` invocation.
- Leaving `final_review` is the engineer's next-step decision, recorded by `qa-report-core.md` itself. A QA job never routes to `xoch-doc`: its patches correct behavior to match what was expected, not change what is documented.

## Output

Each step ends with its own choice: `[E]/[A]/[C]` (limited to the phase's allowed owners) for `implement`, `[Y]/[N]` then the git choice for `advance`, and `[P]atch / [O]pen a job / [N]othing needed` for `final_review`. The response only truly stops at a phase boundary or once the next-step decision is recorded.

## Rules

- Change source only in `qa-execute-core.md`'s triage step, only for failures the engineer accepted as patch-now, and re-test each patch before counting it fixed. Every other failure is recorded and deferred.
- Only send test input to the target recorded by `qa confirm-env`.
