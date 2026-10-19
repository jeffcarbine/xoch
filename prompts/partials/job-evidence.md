Resolve job file paths with `xoch job evidence --job "[job-id]" --json`. Missing files return `null`.

Read job state and phases only through `xoch state get --job "[job-id]" --json` and `xoch phase get --job "[job-id]" [--phase N] --json` (or `xoch phase show` for readable text), never by opening `state.json`/`phases.json`. Read prose artifacts (`spec`, `plan`, snapshots, review, notes) from the paths `job evidence` returns.
