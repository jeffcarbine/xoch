---
name: xoch-map
description: Maintain local project and dependency map context for Xoch
---

# Xoch - Map

Maintain lightweight local project and dependency map context.

## Purpose

Help Xoch understand related local projects, repository paths, package names, services, and dependency relationships without requiring synchronized multi-project job context.

First-pass `xoch-map` is intentionally local and lightweight. Full synchronized multi-project jobs are deferred.

## Scope

`xoch-map` may record:

- local project names and paths
- package or module names
- service names and ports
- dependency direction
- related docs and README targets
- commands useful for local validation
- risks or coupling notes

## Storage

Prefer project-local docs when the map helps the project:

```text
.xoch/docs/DEPENDENCIES.json
.xoch/docs/CODEBASE.md
.xoch/docs/FEATURES.md
```

For machine-local path hints that should not be committed, use `.xoch/work/notes/` or another ignored local file only after confirming the repo's ignore strategy.

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

Ask for or infer local roots. Examples:

- current repo root
- sibling project directories
- monorepo packages
- service directories

Do not scan broad home directories. Keep discovery scoped to paths the engineer names or the current repository.

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

### Step 4: Model Relationships

Capture:

- project or package ID
- local path
- role
- depends on
- depended on by
- docs target
- validation commands
- notes or risks

For JSON dependency packets, prefer this shape:

```json
{
  "projects": [
    {
      "id": "project-id",
      "path": ".",
      "role": "app|library|service|docs|unknown",
      "depends_on": [],
      "depended_on_by": [],
      "docs": [],
      "validation": [],
      "notes": []
    }
  ]
}
```

### Step 5: Write Or Update Map

Write only the selected map target:

- `.xoch/docs/DEPENDENCIES.json` for structured dependency data
- `.xoch/docs/CODEBASE.md` for codebase orientation
- `.xoch/docs/FEATURES.md` for feature/docs inventory
- job/arc notes when the map is temporary to a job

### Step 6: Route

Recommend:

- `xoch-doc` when docs need updates from the map
- `xoch-open-job` when the map reveals a job
- `xoch-revise-plan` when dependency discoveries affect active phases
- `xoch-trace` when the map was created for investigation

## Output

End with:

```text
Map updated.
Targets: [paths]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

- Keep map data local and minimal.
- Do not create synchronized multi-project job state in this first-pass workflow.
- Do not scan unrelated directories.
- Do not record secrets.
- Prefer structured data for dependencies when practical.
