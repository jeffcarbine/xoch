## State Phase Index

Use `state.md` as the lightweight working index for repeated commands.

State should carry enough current-phase information for `xoch-make`, `xoch-next`, `xoch-resume`, and similar commands to orient without reading all of `spec.md`, `plan.md`, and `phases.md` every time:

```yaml
phase_count: [number]
current_phase_title: [title or null]
current_phase_goal: [one-sentence goal or null]
current_phase_files:
  - [path]
current_phase_acceptance_criteria:
  - AC-001
current_phase_validation:
  - [expected check]
phase_index:
  - phase: 1
    title: [title]
    status: [not_started | in_progress | complete | deferred]
```

Keep `state.md` compact. Store detailed phase bodies in `phases.md`, detailed evidence in snapshots or notes, and only the latest useful validation summary in state. Prefer updating the state index when advancing or revising phases instead of rereading full phase documents later.

Read `phases.md` only when the state index is missing, stale, contradictory, or when exact phase text is required. When possible, read only the current phase section or the relevant phase file under `phases/`.
