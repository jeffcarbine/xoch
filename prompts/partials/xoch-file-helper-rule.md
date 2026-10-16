## Xoch File Helper Rule

For job-scoped prose artifacts (`spec.md`, `plan.md`, snapshots, notes, and other markdown files under a job's directory), write and edit through `xoch file write` / `file edit` instead of the Write or Edit tools. This keeps every write to a new `.xoch` path within one already-approved Bash command pattern, instead of re-prompting the engineer for each new file path. Use `file read` when reading that way is more convenient than the Read tool.

Structured job and arc data -- job state, phases, arc state, and arc membership -- is never written with `file write` or `file edit`. Use `xoch state set` / `state update`, `xoch phase write` / `phase advance`, `xoch arc update`, and `xoch arc job-move`; they validate every change before saving it.
