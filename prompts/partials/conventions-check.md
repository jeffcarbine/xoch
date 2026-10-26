Mode: `{{mode}}`

Load the project's documented conventions for the files in scope, never the whole conventions file:

```bash
xoch conventions rules --json --files [files in scope...]
```

- `exists: false` -- the project documents no conventions. Skip this section.
- Non-zero exit -- report the parse error and its line to the engineer. Do not guess at rules.
- Apply each rule only to the files in its `matched` list. Paths in `unmatched` are outside the repository and are not checked.

In `apply` mode, the returned rules constrain the work about to be planned or written: follow `confirmed` rules, follow `inferred` rules unless the surrounding code clearly disagrees, and mention any rule deliberately not followed.

In `check` mode, go rule by rule over each matched file and record every violation as a finding: rule ID, the rule's `status`, file and line, what differs, the fix, and a severity -- `minor` (localized or mechanical: a rename, a swapped call, an edit within one file) or `substantive` (structural, spans files, or changes what the plan said to build). State explicitly that there are no findings when every matched rule holds. Never edit code in `check` mode.
