---
name: xoch-close
description: Close a completed job or an arc, forking on which one applies
---

# Xoch - Close

{{xoch-partial:workflow-boundary.md}}

`xoch-close` replaces `xoch-close-job` and `xoch-close-arc`. Unlike `xoch-build`'s phase cycle or `xoch-open`'s `title`/`spec`/`plan` chain, closing isn't a sequence of steps -- it's exactly one of two modes, chosen once per invocation and never advanced through.

Decide which mode applies from the engineer's message and `job current --json`:

- The engineer names an arc, or explicitly says "arc" -- close an arc. Read:
  ```text
  ~/.xoch/prompts/core/close-arc-core.md
  ```
- The engineer names a job, explicitly says "job", or an active job exists and nothing suggests otherwise -- close a job. Read:
  ```text
  ~/.xoch/prompts/core/close-job-core.md
  ```
- If neither an active job nor the message makes the target clear, ask:

  ```text
  Close the [J]ob or an [A]rc?
  ```

Do not read the core file for the mode you are not closing.

## Output

Follow the chosen mode's own Output section as written.
