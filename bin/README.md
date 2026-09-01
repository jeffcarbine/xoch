# Xoch Helper Scripts

Deterministic, dependency-free Node scripts that Xoch prompts shell out to for static file and
state mechanics -- job/arc bookkeeping, git/coverage inspection, documentation routing, and repo
setup. Prompts prefer these over free-form edits so routine mechanics are consistent and
testable; agents still use judgment for specs, plans, reviews, summaries, and scope decisions.

All filenames use kebab-case. During installation, everything under `bin/` (including `bin/lib/`)
is copied to `~/.xoch/bin/`, so installed prompts invoke helpers from there rather than depending
on a project containing Xoch's own source tree. Every script supports `-h`/`--help`.

## Job, Arc, And Phase Mechanics

### `xoch-actions.js`

Job, arc, pointer, state, snapshot, and phase mechanics -- the helper prompts reach for most.

```text
xoch-actions.js job current [--json]
xoch-actions.js job open --id ID --title TITLE [--description TEXT] [--arc ARC] [--doc-scope SCOPE] [--doc-path PATH]
xoch-actions.js job set-current --job ID
xoch-actions.js state set --job ID --field FIELD --value VALUE
xoch-actions.js pointer clear --job ID
xoch-actions.js workflow begin --job ID --name NAME [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
xoch-actions.js workflow update --job ID [--name NAME] [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
xoch-actions.js workflow complete --job ID [--name NAME] [--next COMMAND]
xoch-actions.js workflow abandon --job ID [--name NAME] --reason TEXT [--next COMMAND]
xoch-actions.js arc open --id ID --title TITLE [--purpose TEXT] [--success TEXT] [--doc-scope SCOPE] [--doc-path PATH] [--adopt-active]
xoch-actions.js snapshot create --job ID --phase N --title TITLE [--status STATUS] [--next NEXT] [--body-file FILE]
xoch-actions.js phase advance --job ID --phase N [--next-phase N] [--next-title TITLE] [--next-goal TEXT] [--next-type implementation|checkpoint] [--next-files CSV] [--next-ac CSV] [--next-validation CSV]
xoch-actions.js config root
xoch-actions.js job evidence --job ID [--json]
xoch-actions.js arc evidence --arc ID [--json]
xoch-actions.js file write --job ID --path PATH [--append]
xoch-actions.js file read --job ID --path PATH
xoch-actions.js file edit --job ID --path PATH [--replace-all]
```

`phase advance`'s `--next-type` marks the phase being advanced *into* as `implementation`
(default) or `checkpoint` -- a checkpoint phase carries no implementation of its own; it's where
the engineer verifies everything built so far live and collaborates on corrections. The type is
persisted as `current_phase_type` in `state.md` and, when the target phase's own `phases.md` entry
declares `**Type**: Checkpoint`, echoed into that phase's `phase_index` entry too.

`file write`/`file read`/`file edit` operate only on paths inside the given job's directory --
they reject path traversal outside it.

### `generate-job-id.js`

Normalize a human-readable identifier into a slug, or generate a fresh one.

```text
generate-job-id.js [--id ID]
```

### `coverage-actions.js`

Compare acceptance-criteria (AC) IDs across a job's spec, plan, snapshots, and review to find
missing or orphaned references, and generate a review skeleton.

```text
coverage-actions.js compare --job ID [--root ROOT] [--require plan|snapshots|review|all] [--json]
coverage-actions.js create-review --job ID [--root ROOT] [--force]
```

## Configuration

### `config.js`

Not under `bin/` -- it lives at the repo root, run from a clone of this repo (`node config.js` or
`./config.js`), since it's an engineer-facing setup tool rather than something prompts shell out
to at runtime. Prompts that need a config value read `~/.xoch/config.json` directly instead.

```text
node config.js                          Interactive mode
node config.js show                     Print resolved config
node config.js get storage.mode         Print current storage.mode
node config.js set storage.mode VALUE   Set storage.mode (in-repo|centralized)
node config.js get documentation.commentMode       Print documentation.commentMode
node config.js set documentation.commentMode VALUE Set documentation.commentMode (always|follow-convention)
node config.js get tokenBudgets.SKILL       Print SKILL's resolved read budget
node config.js set tokenBudgets.SKILL VALUE Set SKILL's read budget (positive integer)
node config.js budgets                      Interactively review/update token budgets
```

Keys:

- **`storage.mode`** (`in-repo` default | `centralized`) -- where job/arc state lives. See
  [Storage Location](../README.md#storage-location) in the root README.
- **`documentation.commentMode`** (`always` default | `follow-convention`) -- whether `xoch-make`
  always adds inline documentation (JSDoc, docstrings, or the equivalent per language) to new
  code, or instead follows whatever convention the target project's file/module already has,
  including having none.
- **`tokenBudgets.<skill>`** -- per-skill read-budget override in tokens (built-in defaults: spec
  5,000, plan 7,000; 5,000 for anything unlisted).

All three are stored in `~/.xoch/config.json`, which can be edited by hand if `config.js` isn't
available:

```json
{
  "version": 1,
  "storage": { "mode": "centralized" },
  "documentation": { "commentMode": "follow-convention" },
  "tokenBudgets": { "spec": 6000 }
}
```

Missing or invalid values fall back to their defaults.

## Context And Budgets

### `token-estimator.js`

Estimate context cost before broad reads, and check/record reads against per-skill budgets.

```text
token-estimator.js <file_path> [mode]
token-estimator.js --batch <file1> <file2> ...
token-estimator.js budget check --skill NAME [--json] --files <file1> <file2> ...
token-estimator.js budget record --skill NAME --job ID [--arc ID] [--root ROOT] [--waiver TEXT] [--json] --files <file1> <file2> ...
```

A `budget check` `FAIL` is a hard stop: reading past budget needs an explicit engineer waiver, not
agent judgment.

### `context-tracker.js`

Track whether a previously-read file has changed since a job last recorded reading it, to avoid
needless rereads.

```text
context-tracker.js check --file PATH --job ID [--root ROOT] [--json]
context-tracker.js record --file PATH --job ID [--root ROOT] [--json]
```

## Discovery

### `help-actions.js`

List every top-level command with its description, read from each prompt's own frontmatter.

```text
help-actions.js list [--root ROOT] [--json]
```

### `project-commands.js`

Detect likely test, lint, typecheck, and build commands for the current project without running
them -- an advisory candidate list, not a guarantee.

```text
project-commands.js detect [--root ROOT] [--json]
```

## Git

### `git-state.js`

Report branch, upstream, dirty, ahead/behind, and conflict state without mutating anything.

```text
git-state.js inspect [--root ROOT] [--json]
```

## Documentation

### `readme-actions.js`

Assemble approved root-README packets (from `.xoch/docs/`) in manifest order into the actual
`README.md`.

```text
readme-actions.js assemble [options] [packet.md ...]

Options:
  --root ROOT         Project root. Default: current directory.
  --manifest FILE     JSON manifest containing title, output, and ordered packets.
  --output FILE       README output path, relative to root. Default: README.md.
  --title TITLE       Top-level README title.
  --stdout            Print assembled markdown instead of writing it.
  --dry-run           Validate and report the assembly without writing.
```

Manifest shape:

```json
{
  "title": "Project Name",
  "output": "README.md",
  "packets": [
    ".xoch/docs/OVERVIEW.md",
    { "path": ".xoch/docs/SETUP.md", "enabled": true }
  ]
}
```

### `docs-drift.js`

Report changed source paths that may affect durable docs, against a recorded baseline. A signal
means "worth a look," not "documentation is definitely stale."

```text
docs-drift.js baseline [--root ROOT] [--baseline FILE]
docs-drift.js check [--root ROOT] [--baseline FILE] [--since REF] [--json]
```

### `docs-target.js`

Route a changed path to the nearest nested `README.md`, or the approved root-packet manifest when
no nested README applies.

```text
docs-target.js resolve --path PATH [--root ROOT] [--manifest FILE] [--json]
```

The JSON result's `sibling` field is `true` only when the resolved README sits directly beside the
changed path -- `xoch-doc` asks the engineer to confirm before writing whenever it's `false`
(an ancestor-directory match or a root-manifest fallback).

### `prompt-check.js`

Validate every helper script's syntax/naming and render all prompts end-to-end in an isolated
`HOME`, failing on any unresolved `{{xoch-partial:...}}`/`{{VAR}}` marker. Run after any prompt or
helper change.

```text
node prompt-check.js run [--root XOCH_REPO]
```

## Repo Hygiene

### `gitignore-actions.js`

Maintain explicit ignore rules for local-only Xoch state vs. shareable docs.

```text
gitignore-actions.js ensure [--root ROOT] [--mode shared-docs|local-all] [--repair] [--dry-run]
```

### `archive-actions.js`

Dry-run, archive, and restore Xoch jobs or arcs safely (moves them out of active `.xoch/work/`
without deleting anything).

```text
archive-actions.js archive --kind job|arc --id ID [--root ROOT] [--dry-run]
archive-actions.js restore --kind job|arc [--id ID | --archive PATH] [--root ROOT] [--dry-run]
```

## Multi-Project Jobs

These only matter for a job with a `projects.json` -- standalone jobs never need them.

### `project-scope.js`

Create, validate, and query a multi-project job's canonical primary/participant repository scope.

```text
project-scope.js create --job ID --primary NAME=PATH --participant NAME=PATH [--participant NAME=PATH ...]
project-scope.js validate --scope PATH [--json]
project-scope.js role --scope PATH [--cwd PATH] [--json]
project-scope.js primary-job --scope PATH
project-scope.js projects --scope PATH [--json]
```

### `context-sync.js`

Mirror canonical Xoch job artifacts (never source files or `current.json`) from the primary
repository to participant repositories.

```text
context-sync.js sync --scope PATH [--dry-run]
context-sync.js check --scope PATH
```

### `dependency-actions.js`

Resolve a job's shareable dependency declarations (`.xoch/docs/dependencies.json`) against the
local, machine-only workspace map, printing JSON and exiting 1 when a declared project can't be
resolved.

```text
dependency-actions.js resolve [--dependencies PATH] [--map PATH] [--scope PATH]
```

Defaults: `dependencies` is `.xoch/docs/dependencies.json`; `map` is `~/.xoch/workspace-map.json`.

### `workspace-actions.js`

Maintain the machine-local project-name-to-repository-path map that `dependency-actions.js` and
multi-project routing resolve names against.

```text
workspace-actions.js list [--map PATH] [--json]
workspace-actions.js add --name NAME --path PATH [--map PATH] [--replace]
workspace-actions.js remove --name NAME [--map PATH]
workspace-actions.js validate [--map PATH] [--json]
```

Default map path: `~/.xoch/workspace-map.json`.
