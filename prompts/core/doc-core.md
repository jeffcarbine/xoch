---
name: xoch-doc-core
description: Full reference workflow for xoch-doc
---

# Xoch - Doc Core

This is the full reference workflow for `xoch-doc`. It is rendered to `~/.xoch/prompts/core/doc-core.md` and is not installed as a command.

Create, refresh, repair, or validate documentation.

`doc` is Xoch's documentation command. It replaces the old split between app initialization, feature initialization, and validation prompts. It is also a required stop after a passing `xoch-review`, not only an on-demand command.

## Purpose

Keep README and Xoch documentation current-state oriented. `xoch-doc` may create missing docs, refresh stale docs, repair inaccurate docs, validate documentation freshness before `xoch-review` or `xoch-close-job`, or maintain lightweight `.xoch/docs/` packets that compose into the root README.

## Scope

`xoch-doc` may work with:

- root `README.md`
- feature READMEs
- `.xoch/docs/` packets
- job documentation targets from the `state` file returned by `job evidence`

It should not turn documentation into an append-only changelog.

## Work Model

When a job is active:

{{xoch-partial:job-evidence.md}}

For target-model jobs, documentation targets may appear in the `state`, `spec`, and `review` files it returns.

{{xoch-partial:project-routing.md}}

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

### Step 1: Identify Documentation Goal

Ask or infer whether the engineer wants to:

- create missing project or feature docs
- refresh docs after implementation
- validate docs before `xoch-review` or `xoch-close-job`
- repair stale or inaccurate docs
- create or refresh `.xoch/docs/` packets and merge them into the root README

If the goal is unclear, ask for the documentation target.

### Step 2: Load Existing Context

{{xoch-partial:context-economy.md}}

Read only what is needed:

- relevant README files
- job state/spec/plan/review when active
- docs packets related to the target
- source files needed to verify current behavior

Use token estimates for large reads:

```bash
~/.xoch/bin/token-estimator.js --batch [files...]
```

### Step 3: Validate Current State

Compare documentation against source and job evidence:

- what exists now
- what changed
- what docs claim
- what docs omit
- terminology mismatches
- stale setup, command, or workflow references
- risks that should be documented

### Step 4: Propose Updates

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

### Step 5: Write Documentation

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

### Step 6: Record Documentation Status

When a job is active, record one of:

- current
- updated
- not impacted
- stale
- waived
- unknown

For target-model jobs, update or append to the relevant job file returned by `job evidence`: `notes_dir`, `review`, `closure`.

For legacy migration jobs, record equivalent notes in the legacy job folder when useful.

### Step 7: Route

Recommend:

- `xoch-pr` when a pull request draft is needed next
- `xoch-close-job` when docs are ready for closure and no PR draft is needed
- `xoch-review` when docs were requested ahead of an upcoming review
- `xoch-make` when stale docs reveal implementation gaps
- `xoch-map` when docs need local dependency/project mapping

After documentation writes, status notes, accepted baselines, and multi-project synchronization are complete, finish the managed workflow before final output or an explicitly chained command:

```bash
~/.xoch/bin/xoch-actions.js workflow complete --job "[job-id]" --name xoch-doc --next "[recommended or explicitly invoked command]"
```

## Output

End with:

```text
Documentation status: [current | updated | not impacted | stale | waived | unknown]
Targets: [paths]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Docs describe the system as it works now.
- Prefer updating the narrowest useful documentation target.
- For root README packet work, propose the packet set and get engineer approval before broad writes.
- Packet names are examples, not a required schema; choose names that fit the project.
- Use nested `README.md` files for feature-local documentation.
- Do not invent source behavior that was not verified.
- Do not move active legacy job folders during the migration.
