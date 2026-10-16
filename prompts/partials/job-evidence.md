Use `xoch job evidence --job "[job-id]" --json` to resolve paths — it existence-checks each file and returns `null` for anything missing.

Job state and phases are JSON owned by Xoch's helpers. Read them with `xoch state get --job "[job-id]" --json` and `xoch phase get --job "[job-id]" [--phase N] --json` (or `xoch phase show` for readable text), never by opening `state.json`/`phases.json` directly. Prose artifacts (`spec`, `plan`, snapshots, review, notes) are still read from the paths `job evidence` returns.
