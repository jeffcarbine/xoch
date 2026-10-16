---
name: xoch-doc-write-core
description: Full reference workflow for xoch-doc's write phase
---

# Xoch - Doc Write Core

This is the full reference workflow for `xoch-doc`'s write phase. It is rendered to `~/.xoch/prompts/core/doc-write-core.md` and is not installed as a command. It is loaded only by `~/.xoch/prompts/core/doc-check-core.md`, and only once that decision phase has determined documentation writing is actually needed.

Perform the write described below, then return to `doc-check-core.md` to record status and route -- this file has no ending contract of its own.

## Where Documentation Lives

Repo-wide documentation lives in the root `README.md`, edited directly. Feature-local documentation belongs in a nested `README.md` beside the relevant code; the root README links to those rather than repeating them.

`.xoch/docs/dependencies.json` is an optional structured dependency declaration. It may record project names, relationship kinds, direction, contracts, and notes, but never absolute machine paths. Confirm dependency project names with the engineer before writing it; `xoch-map` resolves those names locally.

## Process

### Step 1: Propose Updates

Summarize proposed documentation changes before editing when the change is broad.

When an active-job documentation proposal needs engineer approval, record the boundary before asking:

```bash
xoch workflow update --job "[job-id]" --name xoch-doc --stage awaiting_confirmation --pending apply_documentation
```

Prefer:

- concise current-state descriptions
- stable usage examples
- links or references to nearby docs
- clear "not impacted" notes when docs do not need changes

Avoid:

- historical changelog sections inside READMEs (version history belongs only in the project's changelog file, when it has one)
- duplicate docs that will drift
- speculative design commitments
- company-specific QA or PR ceremony in core Xoch docs

### Step 2: Write Documentation

Update or create the selected docs.

Keep the root README useful as the repo entry point, with links to nested feature READMEs when feature-specific detail belongs there.

Use documentation routing and drift helpers when useful:

```bash
xoch docs-target resolve --path "[changed path]" --json
xoch docs-drift check --json
xoch docs-drift baseline
```

Treat drift paths as signals, not proof that documentation must change. Refresh the baseline only after the engineer accepts the resulting documentation state.

## Rules

- For broad root README restructuring, propose the outline and get engineer approval before writing.
- Return to `doc-check-core.md` once the write is complete -- do not record status, route, or produce final output from here.
