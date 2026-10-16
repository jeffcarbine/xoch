## State Phase Index

Use job state (`xoch state get --job "[job-id]" --json`) as the lightweight working index for repeated commands. It carries enough current-phase information for `xoch-do`, `xoch-open`, and similar commands to orient without rereading full `spec.md`, `plan.md`, or the phases document:

```json
{
  "phase_count": 3,
  "current_phase_title": "[title or null]",
  "current_phase_goal": "[one-sentence goal or null]",
  "current_phase_files": ["[path]"],
  "current_phase_acceptance_criteria": ["AC-001"],
  "current_phase_validation": ["[expected check]"],
  "phase_index": [
    { "phase": 1, "title": "[title]", "status": "not_started | in_progress | complete | deferred", "type": "implementation | checkpoint" }
  ]
}
```

`phase advance` maintains these fields from the phases document; do not hand-edit them. Detailed phase content lives in the phases document; detailed evidence belongs in snapshots or notes. Read phases only when the state index is missing, stale, contradictory, or exact phase content is required, and prefer `xoch phase get --job "[job-id]" --phase [N] --json` over reading every phase.
