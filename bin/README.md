# Xoch Helper Scripts

Deterministic, dependency-free Node scripts that Xoch prompts shell out to for static file and
state mechanics -- job/arc bookkeeping, git/coverage inspection, documentation routing, and repo
setup. Prompts prefer these over free-form edits so routine mechanics are consistent and
testable; agents still use judgment for specs, plans, reviews, summaries, and scope decisions.

All filenames use kebab-case. Once installed via npm, `bin/xoch.js` (the package's `bin` entry)
imports its sibling modules in-process and forwards `xoch <namespace> <command> ...` to each
one's own exported `main(argv)`/`run(argv)` -- no scripts are copied anywhere, so installed
prompts invoke helpers through the `xoch` CLI rather than depending on a project containing
Xoch's own source tree. Command examples below show that `xoch <namespace>` form; every script
also still supports `-h`/`--help` when run directly (e.g. `node bin/xoch-actions.js --help` from
a clone of this repo).

## Package Lifecycle

### `init.js`

Renders `prompts/` (resolving `{{xoch-partial:...}}` references) into `~/.xoch/prompts`, seeds
`~/.xoch/config.json` with default token budgets, and installs the rendered top-level commands
into every supported AI tool's directory (Copilot, Codex, Claude Code, Kiro), removing any stale
`xoch-*` entry whose source prompt no longer exists.

```text
xoch init
```

### `remove.js`

Reverses `init.js`: removes every installed `xoch-*` entry from all four tool directories and
deletes `~/.xoch` outright (rendered prompts, `config.json`, and any leftover `~/.xoch/bin` from a
pre-migration install), without touching unrelated files in any tool's directory. `npm uninstall -g`
alone can't do this, since it only cleans `node_modules`.

Also home to `verify()` -- the check the `xoch-meow` prompt runs to confirm both the CLI and
rendered prompts are correctly in place, reporting exactly which is missing when either fails.

```text
xoch remove
xoch verify
```

## Job, Arc, And Phase Mechanics

### `xoch-actions.js`

Job, arc, pointer, state, snapshot, and phase mechanics -- the helper prompts reach for most.

```text
xoch job current [--json]
xoch job open --id ID --title TITLE [--description TEXT] [--arc ARC] [--doc-scope SCOPE] [--doc-path PATH]
xoch job set-current --job ID
xoch state set --job ID --field FIELD --value VALUE
xoch pointer clear --job ID
xoch workflow begin --job ID --name NAME [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
xoch workflow update --job ID [--name NAME] [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
xoch workflow complete --job ID [--name NAME] [--next COMMAND]
xoch workflow abandon --job ID [--name NAME] --reason TEXT [--next COMMAND]
xoch arc open --id ID --title TITLE [--purpose TEXT] [--success TEXT] [--doc-scope SCOPE] [--doc-path PATH] [--adopt-active]
xoch snapshot create --job ID --phase N --title TITLE [--status STATUS] [--next NEXT] [--body-file FILE]
xoch phase advance --job ID --phase N [--next-phase N] [--next-title TITLE] [--next-goal TEXT] [--next-type implementation|checkpoint] [--next-files CSV] [--next-ac CSV] [--next-validation CSV]
xoch job step-advance --job ID
xoch config root
xoch job evidence --job ID [--json]
xoch arc evidence --arc ID [--json]
xoch file write --job ID --path PATH [--append]
xoch file read --job ID --path PATH
xoch file edit --job ID --path PATH [--replace-all]
xoch discovery write --topic TOPIC
xoch discovery read --path PATH
```

`phase advance`'s `--next-type` marks the phase being advanced *into* as `implementation`
(default) or `checkpoint` -- a checkpoint phase carries no implementation of its own; it's where
the engineer verifies everything built so far live and collaborates on corrections. The type is
persisted as `current_phase_type` in `state.md` and, when the target phase's own `phases.md` entry
declares `**Type**: Checkpoint`, echoed into that phase's `phase_index` entry too.

`file write`/`file read`/`file edit` operate only on paths inside the given job's directory --
they reject path traversal outside it. `discovery write`/`discovery read` are the one exception to
job-scoping in this file: they read and write `[xoch-root]/discoveries/`, a directory shared
across every job (and reachable with no job active at all), so accepted discovery findings stay
findable by a later, unrelated job instead of disappearing inside whichever job happened to be
active when the research ran. `discovery write` derives its own filename
(`[date]-[topic-slug]-discovery.md`) from `--topic` and prints the path it wrote; a same-day
rewrite of the same topic gets a numeric suffix rather than overwriting the earlier finding.

`job current`/`job set-current` project a job's `next_command` and `current_step` into
`current.json` alongside `workflow`, self-healing on every `job current` read so a bundled
multi-step command (`xoch-open`, `xoch-build`) can tell exactly where it is from that one call.
`job step-advance` moves `current_step` forward for a transition with no phase-index bookkeeping
and no outcome to judge (`title`->`spec`, `spec`->`plan`, `implement`->`advance`) -- it refuses to
move past `plan` or `advance` (those cross a phase boundary; use `phase advance`, which sets
`current_step` too) or past `final_review` (leaving it depends on the review's own pass/fail
outcome, not a fixed lookup).

### `generate-job-id.js`

Normalize a human-readable identifier into a slug, or generate a fresh one.

```text
xoch generate-id [--id ID]
```

### `coverage-actions.js`

Compare acceptance-criteria (AC) IDs across a job's spec, plan, snapshots, and review to find
missing or orphaned references, and generate a review skeleton.

```text
xoch coverage compare --job ID [--root ROOT] [--require plan|snapshots|review|all] [--json]
xoch coverage create-review --job ID [--root ROOT] [--force]
```

## Configuration

### `config.js`

Not under `bin/` -- it lives at the repo root, since it's an engineer-facing setup tool rather
than something prompts shell out to at runtime. `xoch config` forwards to it (except `xoch config
root`, which is `xoch-actions.js`'s own `config:root` storage-root lookup, merged under the same
namespace). Contributors working from a clone of this repo may also run it directly (`node
config.js` or `./config.js`).

```text
xoch config                          Interactive mode
xoch config show                     Print resolved config
xoch config get storage.mode         Print current storage.mode
xoch config set storage.mode VALUE   Set storage.mode (in-repo|centralized)
xoch config get documentation.commentMode       Print documentation.commentMode
xoch config set documentation.commentMode VALUE Set documentation.commentMode (always|follow-convention)
xoch config get coverage.strictness       Print coverage.strictness
xoch config set coverage.strictness VALUE Set coverage.strictness (required|recommended)
xoch config get tokenBudgets.SKILL       Print SKILL's resolved read budget
xoch config set tokenBudgets.SKILL VALUE Set SKILL's read budget (positive integer)
xoch config budgets                      Interactively review/update token budgets
```

Keys:

- **`storage.mode`** (`in-repo` default | `centralized`) -- where job/arc state lives. See
  [Storage Location](../README.md#storage-location) in the root README.
- **`documentation.commentMode`** (`always` default | `follow-convention`) -- whether `xoch-build`'s
  `implement` step always adds inline documentation (JSDoc, docstrings, or the equivalent per language) to new
  code, or instead follows whatever convention the target project's file/module already has,
  including having none.
- **`coverage.strictness`** (`required` default | `recommended`) -- whether the 100%-coverage gate
  (`bin/init.js#coverage-gate`) is unwaivable before a job can close, or instead reports a gap and
  asks the engineer live whether to close it now or accept it and proceed.
- **`tokenBudgets.<skill>`** -- per-skill read-budget override in tokens (built-in defaults: spec
  5,000, plan 7,000; 5,000 for anything unlisted).

All four are stored in `~/.xoch/config.json`, which can be edited by hand if `config.js` isn't
available:

```json
{
  "version": 1,
  "storage": { "mode": "centralized" },
  "documentation": { "commentMode": "follow-convention" },
  "coverage": { "strictness": "recommended" },
  "tokenBudgets": { "spec": 6000 }
}
```

Missing or invalid values fall back to their defaults.

Prompts never read `~/.xoch/config.json` themselves. A prompt source file that needs config-dependent
text uses a `{{xoch-config:key value1="..." value2="..." default="..."}}` marker (see
[Partials](../prompts/README.md#partials) in the prompts README); `init.js` resolves it once, at
render time, into the installed prompt. Every config-writing command in `config.js` finishes by
calling `init.js`'s `reinstall()` (render + reinstall to all four tool targets), so installed
prompts never drift from the config that produced them.

## Context And Budgets

### `token-estimator.js`

Estimate context cost before broad reads, and check/record reads against per-skill budgets.

```text
xoch token-estimator <file_path> [mode]
xoch token-estimator --batch <file1> <file2> ...
xoch token-estimator budget check --skill NAME [--json] --files <file1> <file2> ...
xoch token-estimator budget record --skill NAME --job ID [--arc ID] [--root ROOT] [--waiver TEXT] [--json] --files <file1> <file2> ...
```

A `budget check` `FAIL` is a hard stop: reading past budget needs an explicit engineer waiver, not
agent judgment.

### `context-tracker.js`

Track whether a previously-read file has changed since a job last recorded reading it, to avoid
needless rereads. Not wired into the `xoch` CLI dispatcher (no prompt currently invokes it), so
it's still run directly:

```text
node bin/context-tracker.js check --file PATH --job ID [--root ROOT] [--json]
node bin/context-tracker.js record --file PATH --job ID [--root ROOT] [--json]
```

## Discovery

### `help-actions.js`

List every top-level command with its description, read from each prompt's own frontmatter.

```text
xoch help list [--root ROOT] [--json]
```

### `project-commands.js`

Detect likely test, lint, typecheck, and build commands for the current project without running
them -- an advisory candidate list, not a guarantee.

```text
xoch project-commands detect [--root ROOT] [--json]
```

## Git

### `git-state.js`

Report branch, upstream, dirty, ahead/behind, and conflict state without mutating anything.

```text
xoch git-state inspect [--root ROOT] [--json]
```

## Documentation

### `readme-actions.js`

Assemble approved root-README packets (from `.xoch/docs/`) in manifest order into the actual
`README.md`.

```text
xoch readme assemble [options] [packet.md ...]

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
xoch docs-drift baseline [--root ROOT] [--baseline FILE]
xoch docs-drift check [--root ROOT] [--baseline FILE] [--since REF] [--json]
```

### `docs-target.js`

Route a changed path to the nearest nested `README.md`, or the approved root-packet manifest when
no nested README applies.

```text
xoch docs-target resolve --path PATH [--root ROOT] [--manifest FILE] [--json]
```

The JSON result's `sibling` field is `true` only when the resolved README sits directly beside the
changed path -- `xoch-doc` asks the engineer to confirm before writing whenever it's `false`
(an ancestor-directory match or a root-manifest fallback).

### `prompt-check.js`

Validate every helper script's syntax/naming and render all prompts end-to-end in an isolated
`HOME`, failing on any unresolved `{{xoch-partial:...}}`/`{{VAR}}` marker. Run after any prompt or
helper change. Contributor-only tooling, not wired into the `xoch` CLI dispatcher -- run directly:

```text
bin/prompt-check.js run [--root XOCH_REPO]
```

## Repo Hygiene

### `gitignore-actions.js`

Maintain explicit ignore rules for local-only Xoch state vs. shareable docs.

```text
xoch gitignore ensure [--root ROOT] [--mode shared-docs|local-all] [--repair] [--dry-run]
```

### `archive-actions.js`

Dry-run, archive, and restore Xoch jobs or arcs safely (moves them out of active `.xoch/work/`
without deleting anything).

```text
xoch archive archive --kind job|arc --id ID [--root ROOT] [--dry-run]
xoch archive restore --kind job|arc [--id ID | --archive PATH] [--root ROOT] [--dry-run]
```

## Multi-Project Jobs

These only matter for a job with a `projects.json` -- standalone jobs never need them.

### `project-scope.js`

Create, validate, and query a multi-project job's canonical primary/participant repository scope.

```text
xoch project-scope create --job ID --primary NAME=PATH --participant NAME=PATH [--participant NAME=PATH ...]
xoch project-scope validate --scope PATH [--json]
xoch project-scope role --scope PATH [--cwd PATH] [--json]
xoch project-scope primary-job --scope PATH
xoch project-scope projects --scope PATH [--json]
```

### `context-sync.js`

Mirror canonical Xoch job artifacts (never source files or `current.json`) from the primary
repository to participant repositories.

```text
xoch context-sync sync --scope PATH [--dry-run]
xoch context-sync check --scope PATH
```

### `dependency-actions.js`

Resolve a job's shareable dependency declarations (`.xoch/docs/dependencies.json`) against the
local, machine-only workspace map, printing JSON and exiting 1 when a declared project can't be
resolved.

```text
xoch dependency resolve [--dependencies PATH] [--map PATH] [--scope PATH]
```

Defaults: `dependencies` is `.xoch/docs/dependencies.json`; `map` is `~/.xoch/workspace-map.json`.

### `workspace-actions.js`

Maintain the machine-local project-name-to-repository-path map that `xoch dependency` and
multi-project routing resolve names against.

```text
xoch workspace list [--map PATH] [--json]
xoch workspace add --name NAME --path PATH [--map PATH] [--replace]
xoch workspace remove --name NAME [--map PATH]
xoch workspace validate [--map PATH] [--json]
```

Default map path: `~/.xoch/workspace-map.json`.
