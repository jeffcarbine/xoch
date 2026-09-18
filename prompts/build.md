---
name: xoch-build
description: Implement, review, and advance through the current Xoch phase, and run the final review once every phase is done
---

# Xoch - Build

{{xoch-partial:workflow-boundary.md}}

`xoch-build` replaces `xoch-make`, `xoch-next`, and `xoch-review`. It carries a job through implementation phase by phase and, once every phase is done, through the final quality-gate review -- all as one command. Position is tracked by `current_step` in job state, not by which command was last typed.

The workflow boundary check above already ran `job current --json`. Read its `current_step` and act accordingly:

- `implement` -- brief the phase and get the ownership choice, then implement it. If you already know this flow from this conversation, continue from context; otherwise read:
  ```text
  ~/.xoch/prompts/core/implement-core.md
  ```
- `advance` -- review the phase and get the advance choice. If you already know this flow, continue from context; otherwise read:
  ```text
  ~/.xoch/prompts/core/advance-core.md
  ```
- `final_review` -- run the job-level quality gate. If you already know this flow, continue from context; otherwise read:
  ```text
  ~/.xoch/prompts/core/review-core.md
  ```
- missing, `null`, or any other value -- do not guess. Report the job's actual state to the engineer and ask how to proceed.

Do not read a core file for a step you are not currently on.

{{xoch-partial:phase-boundary.md}}

## Moving between steps

Every transition is decided by a deterministic helper, never guessed or written directly by the agent:

- Right when phase implementation is accepted as complete -- before asking the advance question -- run `xoch job step-advance --job "[job-id]"` to move `implement` -> `advance`, then continue straight into the advance flow (`advance-core.md`'s own Step 1 onward) in this same response. Do not ask the engineer to invoke `xoch-build` again for this transition; that defeats the point of bundling these two together.
- Crossing a phase boundary -- entering phase 1, moving `advance` -> `implement` for the next phase, or falling through `advance` -> `final_review` once every phase is done -- is `phase advance`'s job, exactly as `advance-core.md` documents; it also sets `current_step`. This still ends the response and asks for a fresh `xoch-build` invocation, per the phase boundary above -- entering review is a new step, not a continuation of the phase that just finished.
- Leaving `final_review` is judgment-dependent, not mechanical: a passing review routes to `xoch-doc`, a failing one routes back into implementation. `review-core.md`'s own `state.md` update sets `current_step` directly as part of recording that outcome, rather than asking a generic helper to guess it.

`implement-core.md`, `advance-core.md`, and `review-core.md` already document their own endings in these terms -- follow each one's own Output section as written.

## Output

Each step ends with that step's own adventure-style choice: `[E]/[A]/[C]` for `implement`, `[Y]/[N]` then the git commit/push choice for `advance`, and `final_review`'s own accept/findings choice. The response only truly stops -- printing `Ready for next step: \`xoch-build\`` or `` `xoch-doc` `` and waiting for a fresh invocation -- at an actual phase boundary or when review's outcome is decided; the `implement` -> `advance` transition within one phase never stops early.
