---
name: xoch-qa
description: Open a QA job, confirm a safe target and the agent's capabilities, and plan explicit QA phases
---

# Xoch - QA

{{xoch-partial:workflow-boundary.md}}

`xoch-qa` opens a **QA job**: an ordinary Xoch job with `job_type: qa`, so every other command recognizes it as the active job. A QA job observes and records. After each phase, small, well-understood failures can be patched and re-tested on the spot; larger findings are deferred to a follow-up job. Lifecycle:

```text
xoch-qa -> xoch-do (once per QA phase, then the QA report) -> xoch-close
```

`xoch-qa` runs `title` -> `intake` -> `plan`, tracked by `current_step`. `xoch-do` then runs each QA phase and writes the QA report.

Route on the `job current --json` result and the engineer's message:

- **No active job.** Open a fresh QA job (below).
- **Active QA job (`job_type: qa`), `current_step` is `title`, `intake`, or `plan`.** Continue that step. If you already know the flow from this conversation, continue from context; otherwise read:
  - `title` -- the Open A QA Job section below
  - `intake` -- `~/.xoch/prompts/core/qa-intake-core.md`
  - `plan` -- `~/.xoch/prompts/core/qa-plan-core.md`
- **Active QA job past planning** (`implement`, `advance`, `final_review`). Summarize its state and recommend `xoch-do` (or `xoch-close` once its QA report and next-step decision are recorded).
- **Active standard job.** Summarize it (ID, title, status, current step) and ask whether to keep working on it or set it aside -- recommend `xoch-pause` before opening a QA job. Do not silently abandon it, and do not open a second job over it.

Do not read a core file for a step you are not on.

## Open A QA Job

1. Ask only for what is missing: a job identifier (a slug or a human phrase) and, if the engineer has not said, whether it belongs to an arc (default standalone).
2. Derive the ID and title exactly as `xoch-open` does:

   ```bash
   xoch generate-id --id "[identifier]"
   ```

   If the cleaned slug differs from the raw identifier, use the identifier verbatim as `title` and the slug as `id`; otherwise derive a title by replacing hyphens with spaces and title-casing each word. Confirm:

   ```text
   Use ID `[id]` and title `[title]`? [Y]es or [N]o, I'll adjust
   ```

3. Create the job:

   ```bash
   xoch job open --type qa --id "[job-id]" --title "[title]" --arc "[arc-id or standalone]"
   ```

   This writes `job_type: qa`, `current_step: title`, and `next_command: xoch-qa`.

4. Report `QA job opened.`, then run `xoch job step-advance --job "[job-id]"` (`title` -> `intake`) and continue directly into `qa-intake-core.md` in this same response.

## Moving Between Steps

`title` -> `intake` -> `plan` run continuously in one invocation. Each step's core defines its own ending and helper call (`job step-advance` for `title` -> `intake` and `intake` -> `plan`; `phase advance --phase 0` for entering phase 1, which refuses unless intake confirmed the environment). Follow it as written; never write `current_step` directly.

## Output

The response stops only at the ID confirmation, the intake environment gate, an accept/modify gate, or after entering phase 1 with `Ready for next step: \`xoch-do\``.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:engineer-git-rule.md}}

- QA jobs change source only to patch failures accepted as patch-now during a phase's triage. Deferred findings are routed to `xoch-patch` or `xoch-open` from the QA report.
- Never send test input at a target the engineer has not confirmed as dev or staging.
