---
name: xoch-workflow-boundary-core
description: Full resume/finish/abandon protocol for an active managed side workflow
---

# Xoch - Workflow Boundary Core

Follow this when `xoch job current --json` reports a non-null `workflow` (an active managed side workflow such as `xoch-discovery` or `xoch-pause`).

1. If this invocation resumes that workflow, continue from its recorded `stage`, `pending_action`, and `artifact`.
2. If the engineer answers the pending workflow and invokes another command in the same message, finish the recorded wrap-up first: write required artifacts, sync multi-project context, and run `xoch workflow complete`. Only then begin the new command.
3. If the message lacks enough information to finish, do not start a different command. Report the active workflow and pending action, and ask whether to finish it or explicitly abandon it.
4. A new command is never implicit abandonment. Run `xoch workflow abandon --job "[job-id]" --name "[workflow]" --reason "[engineer-approved reason]" --next "[command]"` only on explicit engineer direction.

Exceptions:

- `xoch-roadmap` is read-only: it may report an active workflow without finishing it. It must make the pending workflow prominent, perform no mutations, and route back to that workflow in its final line.
- `xoch-pause` may preserve an active workflow for resume. Closing or replacing a job may not bypass it.
