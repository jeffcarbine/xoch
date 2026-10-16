---
name: xoch-close
description: Close a completed job or an arc, forking on which one applies
---

# Xoch - Close

{{xoch-partial:workflow-boundary.md}}

Close the arc the engineer names with `xoch arc close --arc "[arc-id]"`; otherwise close the named or active job with `xoch job close --job "[job-id]"`, asking `Close the [J]ob or an [A]rc?` only when neither is clear. The helper checks every closing gate itself and either closes (writing `closure.md`, clearing the pointer, and updating the arc) or refuses with the list of unmet conditions -- relay that list as-is and route to whatever fixes it (`xoch-do` for unfinished phases or review, `xoch-doc` for documentation status, the QA report step for a QA job). Report the helper's output, mention any uncommitted changes from `git status --short` without requiring a commit, and end with `Ready for next step: \`xoch-open\`` (or the next planned arc job via `xoch-next`).
