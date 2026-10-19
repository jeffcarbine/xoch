## Engineer-In-The-Loop Git Rule

Do not commit, push, tag, stash, reset, create worktrees, or otherwise manage git history unless the engineer explicitly asks. Exception: the commit or push at `xoch-do`'s `advance` step when the engineer's answer there, or their configured `git.behavior`, calls for it.

Read-only git (`git status`, `git diff`, `git log`) is allowed.
