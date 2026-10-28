## Xoch File Helper Rule

Write and edit job-scoped prose artifacts (`spec.md`, `plan.md`, snapshots, notes, and other markdown under a job directory) with `xoch file write` / `file edit`, not the Write or Edit tools. `file read` may be used for reading.

Never write structured job or arc data (job state, phases, arc state, arc membership) with `file write` / `file edit`. Use `xoch state set` / `state update`, `xoch phase write` / `phase advance`, `xoch arc update`, and `xoch arc job-move`, which validate changes before saving.
