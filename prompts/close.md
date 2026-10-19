---
name: xoch-close
description: Close a completed job or an arc, forking on which one applies
---

# Xoch - Close

{{xoch-partial:workflow-boundary.md}}

- If the engineer names an arc, close it with `xoch arc close --arc "[arc-id]"`.
- Otherwise close the named or active job with `xoch job close --job "[job-id]"`.
- Ask `Close the [J]ob or an [A]rc?` only when neither is clear.

The helper checks every closing gate itself. It either closes (writing `closure.md`, clearing the pointer, and updating the arc) or refuses with a list of unmet conditions. Relay that list as-is and route to whatever fixes it: `xoch-do` for unfinished phases or review, `xoch-doc` for documentation status, the QA report step for a QA job.

Report the helper's output, mention any uncommitted changes from `git status --short` without requiring a commit, and end with `Ready for next step: \`xoch-open\`` (or the arc's next planned job via `xoch-next`).
