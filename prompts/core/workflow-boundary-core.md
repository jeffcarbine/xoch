---
name: xoch-workflow-boundary-core
description: Full resume/finish/abandon protocol for an active managed side workflow
---

# Xoch - Workflow Boundary Core

This is the full reference protocol for handling an active managed side workflow (e.g. `xoch-discovery`, `xoch-pause`). It is rendered to `~/.xoch/prompts/core/workflow-boundary-core.md` and is not installed as a command. Every command's `workflow-boundary.md` partial reads this only when `xoch-actions.js job current --json` reports a non-null `workflow` -- the common case (no active workflow) never pays for it.

A workflow is active:

1. If this invocation resumes that workflow, continue from its recorded `stage`, `pending_action`, and `artifact`.
2. If the engineer explicitly answers the pending workflow and invokes another command in the same message, finish the recorded wrap-up first. Write required artifacts, synchronize multi-project context, and run `xoch-actions.js workflow complete`; only then begin the newly invoked command.
3. If the message does not contain enough information to finish, do not start a different command. Report the active workflow and pending action, then ask whether to finish it or explicitly abandon it.
4. Never treat a new command as implicit abandonment. Use `xoch-actions.js workflow abandon --job "[job-id]" --name "[workflow]" --reason "[engineer-approved reason]" --next "[command]"` only after explicit engineer direction.

`xoch-roadmap` is the read-only exception: it may inspect and report an active workflow without finishing it. It must make the pending workflow prominent, perform no mutations, and route back to that workflow in its final line.

The explicit chained-command case above is not automatic rollover: the engineer already requested the next command. All pending workflow completion actions still happen before that command begins. `xoch-pause` may preserve an active workflow for resume; closing or replacing a job may not bypass it.
