## Pending Workflow Boundary

Before starting this command, run `~/.xoch/bin/xoch-actions.sh job current --json`. This reads the canonical `.xoch/work/current.json` pointer and migrates a target-model `.xoch/work/current.md` pointer when encountered.

If `workflow` is `null`, continue normally. If a workflow is active:

1. If this invocation resumes that workflow, continue from its recorded `stage`, `pending_action`, and `artifact`.
2. If the engineer explicitly answers the pending workflow and invokes another command in the same message, finish the recorded wrap-up first. Write required artifacts, synchronize multi-project context, and run `xoch-actions.sh workflow complete`; only then begin the newly invoked command.
3. If the message does not contain enough information to finish, do not start a different command. Report the active workflow and pending action, then ask whether to finish it or explicitly abandon it.
4. Never treat a new command as implicit abandonment. Use `xoch-actions.sh workflow abandon --job "[job-id]" --name "[workflow]" --reason "[engineer-approved reason]" --next "[command]"` only after explicit engineer direction.

`xoch-roadmap` is the read-only exception: it may inspect and report an active workflow without finishing it. It must make the pending workflow prominent, perform no mutations, and route back to that workflow in its final line.

The explicit chained-command case above is not automatic rollover: the engineer already requested the next command. All pending workflow completion actions still happen before that command begins. `xoch-pause` may preserve an active workflow for resume; closing or replacing a job may not bypass it.
