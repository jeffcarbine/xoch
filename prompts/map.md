---
name: xoch-map
description: Maintain local project and dependency map context for Xoch
---

# Xoch - Map

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-map" pending="continue_mapping"}}

Maintain lightweight local project and dependency map context.

## Purpose

Help Xoch resolve project names to local repositories, record machine-independent dependency relationships, and prepare repositories for multi-project jobs.

## Scope

`xoch-map` may record:

- local project names and paths
- package or module names
- service names and ports
- dependency direction
- related docs and README targets
- commands useful for local validation
- risks or coupling notes

The machine-local workspace map lives at `~/.xoch/workspace-map.json`. Repo-owned dependency declarations may live at `.xoch/docs/dependencies.json` when the engineer approves that structured documentation artifact.

## Storage

Keep local paths in the machine-owned workspace map:

```text
~/.xoch/workspace-map.json
```

Keep shareable dependency names and contracts in project documentation. A structured declaration may use:

```json
{
  "project": "web-app",
  "dependencies": [
    {
      "name": "billing-api",
      "kind": "service",
      "direction": "consumes",
      "contract": "Invoice and payment endpoints"
    }
  ]
}
```

Do not store secrets, credentials, tokens, or private machine details that the engineer does not want captured.

## Process

### Step 1: Identify Map Goal

Ask whether the map should cover:

- one project
- related local repositories
- feature dependencies
- service/process dependencies
- documentation targets
- a job or arc dependency view

### Step 2: Identify Roots

Ask for or infer local roots. Scan only the current root, explicitly named roots, immediate children, or immediate siblings. Examples:

- current repo root
- sibling project directories
- monorepo packages
- service directories

Do not scan broad home directories. Infer candidate names from an approved dependency declaration, package/build manifests, git remote names, or folder names. Show additions, changed paths, and ambiguous names before writing.

When proposed map changes require confirmation for an active job, update the managed workflow before asking:

```bash
~/.xoch/bin/xoch-actions.js workflow update --job "[job-id]" --name xoch-map --stage awaiting_confirmation --pending apply_workspace_map
```

### Step 3: Inspect Lightly

Read only useful orientation files:

- `README.md`
- package/build files
- config manifests
- `.xoch/docs/` packets
- job or arc state when active

Use focused shell commands such as:

```bash
find . -maxdepth 2 -name README.md -o -name package.json
rg -n "localhost|PORT|dependency|service" README.md .xoch/docs
```

Adjust commands to the project. Do not run network-dependent discovery unless explicitly requested.

### Step 4: Update The Machine Map

After engineer confirmation, use:

```bash
~/.xoch/bin/workspace-actions.js add --name "[project]" --path "[absolute path]"
~/.xoch/bin/workspace-actions.js remove --name "[project]"
~/.xoch/bin/workspace-actions.js validate
~/.xoch/bin/workspace-actions.js list --json
```

Do not replace an existing name with a different path unless the engineer confirms it; pass `--replace` only after that confirmation.

### Step 5: Model Relationships

Capture:

- project or package ID
- local path
- role
- depends on
- depended on by
- docs target
- validation commands
- notes or risks

Never put absolute local paths in shareable dependency documentation.

### Step 6: Resolve Dependencies

If `.xoch/docs/dependencies.json` exists, resolve it with:

```bash
~/.xoch/bin/dependency-actions.js resolve
```

When a multi-project job is active, pass `--scope [primary job]/projects.json` so output identifies dependencies already participating in the job. Load only relevant README or `.xoch/docs/` context from resolved repositories.

### Step 7: Route

Recommend:

- `xoch-doc` when docs need updates from the map
- `xoch-open-job` when resolved repositories should participate in one multi-project job
- `xoch-revise-plan` when dependency discoveries affect active phases
- `xoch-trace` when the map was created for investigation

After confirmed map changes, validation, dependency resolution, and any job notes are complete, finish the managed workflow before final output or an explicitly chained command:

```bash
~/.xoch/bin/xoch-actions.js workflow complete --job "[job-id]" --name xoch-map --next "[recommended or explicitly invoked command]"
```

## Output

End with:

```text
Workspace map updated.
Map: ~/.xoch/workspace-map.json
Resolved dependencies: [count]
Missing dependencies: [count]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Keep machine paths local and dependency declarations shareable.
- Do not scan unrelated directories.
- Do not record secrets.
- Prefer structured data for dependencies when practical.
- Do not create a multi-project job without engineer confirmation; route that work to `xoch-open-job`.
