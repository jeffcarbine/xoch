Resolve arc file paths with `xoch arc evidence --arc "[arc-id]" --json`. Missing files return `null`.

Arc state and membership are helper-owned JSON. Read them with `xoch arc get --arc "[arc-id]" --json`, change membership with `xoch arc job-move`, and change arc state with `xoch arc update --arc "[arc-id]"` (JSON on stdin). Never edit `state.json`/`jobs.json` directly. Read prose artifacts (`notes`, revisions) from the paths `arc evidence` returns.
