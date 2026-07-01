## State Phase Index

Use `state.md` as the lightweight working index for repeated commands. It should carry enough current-phase information for `xoch-make`, `xoch-next`, `xoch-resume`, and similar commands to orient without rereading full `spec.md`, `plan.md`, or `phases.md`:

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
  - phase: 1, title: [title], status: [not_started | in_progress | complete | deferred]
```

Keep `state.md` compact. Detailed phase bodies belong in `phases.md`; detailed evidence belongs in snapshots or notes. Read `phases.md` only when the state index is missing, stale, contradictory, or exact phase text is required. Prefer the current phase section or `phases/phase-[N].md` over full-file reads.
