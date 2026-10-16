Read:

- job state, via `xoch state get --job "[job-id]" --json`
- `spec` and `plan` (whichever are returned), and phases via `xoch phase get --job "[job-id]" --json`, only when state does not contain enough current-phase context
- the current phase alone, via `xoch phase get --job "[job-id]" --phase [N] --json`, when exact phase content is needed

For legacy migration jobs, read the equivalent legacy files.
