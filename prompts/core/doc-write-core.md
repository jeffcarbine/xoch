---
name: xoch-doc-write-core
description: Full reference workflow for xoch-doc's write phase
---

# Xoch - Doc Write Core

The write phase of `xoch-doc`, loaded only by `~/.xoch/prompts/core/doc-check-core.md` once it decides writing is needed. Perform the write, then return to `doc-check-core.md` to record status and route. Do not record status, route, or produce final output from here.

## Where Documentation Lives

Repo-wide documentation lives in the root `README.md`, edited directly. Feature-local documentation belongs in a nested `README.md` beside the relevant code; the root README links to those rather than repeating them.

`.xoch/docs/dependencies.json` is an optional structured dependency declaration: project names, relationship kinds, direction, contracts, and notes, never absolute machine paths. Confirm dependency project names with the engineer before writing it; `xoch-map` resolves those names locally.

## Process

### Step 1: Propose Updates

Summarize proposed changes before editing when the change is broad. For broad root README restructuring, propose the outline and get engineer approval before writing.

When an active-job proposal needs engineer approval, record the boundary before asking:

```bash
xoch workflow update --job "[job-id]" --name xoch-doc --stage awaiting_confirmation --pending apply_documentation
```

Prefer:

- concise current-state descriptions
- stable usage examples
- links or references to nearby docs
- clear "not impacted" notes when docs do not need changes

Avoid:

- changelog sections inside READMEs (version history belongs only in the project's changelog file, when it has one)
- duplicate docs that will drift
- speculative design commitments

### Step 2: Write Documentation

Update or create the selected docs, keeping the root README useful as the repo entry point with links to nested feature READMEs.

Use documentation routing and drift helpers when useful:

```bash
xoch docs-target resolve --path "[changed path]" --json
xoch docs-drift check --json
```

Drift paths are signals, not proof that documentation must change. `doc-check-core.md` writes the new baseline after status is recorded.
