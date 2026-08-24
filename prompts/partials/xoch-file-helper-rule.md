## Xoch File Helper Rule

For job-scoped `.xoch` artifacts (`spec.md`, `plan.md`, `phases.md`, and other files under a job's directory), write and edit through `node ~/.xoch/bin/xoch-actions.js file write` / `file edit` instead of the Write or Edit tools. This keeps every write to a new `.xoch` path within one already-approved Bash command pattern, instead of re-prompting the engineer for each new file path. Use `file read` when reading that way is more convenient than the Read tool.
