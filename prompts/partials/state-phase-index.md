## State Phase Index

Job state (`xoch state get --job "[job-id]" --json`) is the working index for repeated commands. Its `phase_count`, `current_phase_title`, `current_phase_goal`, `current_phase_type`, `current_phase_files`, `current_phase_acceptance_criteria`, `current_phase_validation`, and `phase_index` (each phase's number, title, status, and type) are usually enough to orient without rereading `spec.md`, `plan.md`, or the phases document.

`phase advance` maintains these fields; never hand-edit them. Read phases only when the index is missing, stale, or contradictory, or when exact phase content is needed, and prefer `xoch phase get --job "[job-id]" --phase [N] --json` over reading every phase. Detailed evidence belongs in snapshots or notes.
