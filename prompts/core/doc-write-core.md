---
name: xoch-doc-write-core
description: Full reference workflow for xoch-doc's write phase
---

# Xoch - Doc Write Core

This is the full reference workflow for `xoch-doc`'s write phase. It is rendered to `~/.xoch/prompts/core/doc-write-core.md` and is not installed as a command. It is loaded only by `~/.xoch/prompts/core/doc-check-core.md`, and only once that decision phase has determined documentation writing is actually needed.

Perform the write described below, then return to `doc-check-core.md` to record status and route -- this file has no ending contract of its own.

## Documentation Packets

`.xoch/docs/` packets are modular source chunks for repo-wide root README content. They exist so the root README can be generated or refreshed from smaller, focused documents instead of becoming one huge file.

Packet names are flexible. Choose names that fit the project and the root README structure. Examples include `OVERVIEW.md`, `ARCHITECTURE.md`, `SETUP.md`, `USAGE.md`, `API.md`, `COMPONENTS.md`, `TESTING.md`, `DEPLOYMENT.md`, `CONVENTIONS.md`, `DEPENDENCIES.md`, `RISKS.md`, or other project-specific sections.

Feature-local documentation should usually be a nested `README.md` beside the relevant code, not a `.xoch/docs/` packet. Packets are for repo-level README composition; nested READMEs are for folder or feature documentation.

`.xoch/docs/dependencies.json` is an optional structured dependency declaration, not a README packet. It may record project names, relationship kinds, direction, contracts, and notes, but never absolute machine paths. Confirm dependency project names with the engineer before writing it; `xoch-map` resolves those names locally.

Before creating or reshaping packets, analyze the available project/job context and propose a packet set to the engineer:

- packet filename
- root README section it will feed
- purpose and scope
- source files or docs it should summarize
- whether it is new, refreshed, merged, split, or removed

Ask the engineer to accept or modify the packet set before writing broad packet changes.

After approval, record packet order in `.xoch/docs/readme-packets.json` so root README assembly is deterministic. Suggested shape:

```json
{
  "title": "Project Name",
  "output": "README.md",
  "packets": [
    ".xoch/docs/OVERVIEW.md",
    ".xoch/docs/SETUP.md"
  ]
}
```

## Process

### Step 1: Propose Updates

Summarize proposed documentation changes before editing when the change is broad.

When an active-job documentation proposal needs engineer approval, record the boundary before asking:

```bash
~/.xoch/bin/xoch-actions.js workflow update --job "[job-id]" --name xoch-doc --stage awaiting_confirmation --pending apply_documentation
```

For packet work, propose the packet set first. Use project-specific packet names rather than forcing a fixed schema. The engineer may accept, rename, combine, split, add, or remove packets before writing begins.

Prefer:

- concise current-state descriptions
- stable usage examples
- links or references to nearby docs
- clear "not impacted" notes when docs do not need changes

Avoid:

- historical changelog sections
- duplicate docs that will drift
- speculative design commitments
- company-specific QA or PR ceremony in core Xoch docs

### Step 2: Write Documentation

Update or create the selected docs.

For `.xoch/docs/` packets:

- write the approved packet set
- keep each packet focused on a root README section or companion section
- assemble packet content into the root README with:

  ```bash
  ~/.xoch/bin/readme-actions.js assemble --manifest .xoch/docs/readme-packets.json
  ```

- keep the root README useful as the repo entry point, with links to nested feature READMEs when feature-specific detail belongs there
- do not use `.xoch/docs/` packets as a replacement for nested README files

Use documentation routing and drift helpers when useful:

```bash
~/.xoch/bin/docs-target.js resolve --path "[changed path]" --json
~/.xoch/bin/docs-drift.js check --json
~/.xoch/bin/docs-drift.js baseline
```

Treat drift paths as signals, not proof that documentation must change. Refresh the baseline only after the engineer accepts the resulting documentation state.

## Rules

- For root README packet work, propose the packet set and get engineer approval before broad writes.
- Packet names are examples, not a required schema; choose names that fit the project.
- Return to `doc-check-core.md` once the write is complete -- do not record status, route, or produce final output from here.
