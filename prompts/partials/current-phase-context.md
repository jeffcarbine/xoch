Read:

- `state`
- `spec`, `plan`, and `phases` (whichever are returned) only when `state` does not contain enough current-phase context
- the current phase section from `phases` or `current_phase_body` when exact phase text is needed

For legacy migration jobs, read the equivalent legacy files.
