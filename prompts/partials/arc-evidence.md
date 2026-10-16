Use `xoch arc evidence --arc "[arc-id]" --json` to resolve paths — it existence-checks each file and returns `null` for anything missing.

Arc state and membership are JSON owned by Xoch's helpers. Read them with `xoch arc get --arc "[arc-id]" --json`, change membership with `xoch arc job-move`, and change arc state with `xoch arc update --arc "[arc-id]"` (a JSON object on stdin) -- never by editing `state.json`/`jobs.json` directly. Prose artifacts (`notes`, revisions) are still read from the paths `arc evidence` returns.
