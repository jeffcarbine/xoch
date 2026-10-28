# Contributing to Xoch

Thank you for improving Xoch. Xoch is a prompt-first workflow package, so most contributions are prompt, documentation, or helper-script changes.

---

## Workflow

Use Xoch to work on Xoch:

```text
xoch-open -> xoch-do -> xoch-doc -> xoch-close
```

Job guidance should target the resolved Xoch storage root's `work/` directory — `~/.xoch/projects/<slug>/work/` by default (centralized storage), or `.xoch/work/` when `storage.mode` is `in-repo` (`xoch config set storage.mode in-repo`, or hand-edit `~/.xoch/config.json`). Resolve it with `xoch config root`.

---

## Prompt Files

Prompt source files live in:

```text
prompts/
```

Each installable top-level markdown file becomes an `xoch-*` command. `prompts/README.md` is documentation only.

Prompt files use this shape:

```markdown
---
name: xoch-[name]
description: One-line description
---

# Xoch - [Title]

[Prompt body]
```

When adding or changing prompts:

- keep the prompt readable as plain Markdown
- use Xoch vocabulary: job, phase, arc, work, docs
- route to current command names
- avoid QA or PR handoff ceremony in the core workflow
- update `prompts/README.md` and `README.md` when behavior changes

---

## Work Files

Target-model job files live under the resolved Xoch storage root:

```text
[xoch-root]/work/jobs/[job-id]/
```

`[xoch-root]` is `~/.xoch/projects/<slug>` by default (centralized), or `.xoch` inside the repo when `storage.mode` is `in-repo` — see `bin/lib/storage-root.js`, which every helper uses to resolve it (never build `<project>/.xoch` paths by hand), and the `config root` subcommand. When writing or editing prompts, never hardcode `.xoch/work/...` as if it were literally relative to the repo; refer to `[xoch-root]` and include `{{xoch-partial:storage-root.md}}`, which renders the configured location at install time.

Common files:

| File | Purpose | Created By |
|---|---|---|
| `[xoch-root]/work/current.json` | Active job pointer | `open` (`title` step) |
| `state.json` | Job status and routing (helper-owned: `xoch state get/set/update`) | `open` (`title` step) |
| `spec.md` | Requirements and ACs | `open` (`spec` step) |
| `plan.md` | Implementation approach | `open` (`plan` step) |
| `phases.json` | Ordered phases; a phase's number is its position (helper-owned: `xoch phase write/get/show/advance`) | `open` (`plan` step) |
| `snapshots/phase-[N].md` | Phase completion snapshot | `do` (`advance` step) |
| `review.md` | Acceptance and quality review | `do` (`final_review` step) |
| `closure.md` | Closure notes | `close` (or `next`) |
| `revisions/` | Spec/plan/arc revision notes | `revise` |

Arcs live under:

```text
[xoch-root]/work/arcs/[arc-id]/
```

Arcs keep their state in `state.json` and reference job IDs in `jobs.json` (both helper-owned: `xoch arc get/update/job-move`); they do not contain job folders.

Structured files (`state.json`, `phases.json`, an arc's `state.json`/`jobs.json`) are read and validated through the shape classes in `bin/lib/` (`JobState`, `Phases`, `ArcState`, `ArcJobs`, `CurrentPointer`). Prompts must reach them only through `xoch` helpers -- never tell the agent to open or edit them directly. Prose artifacts stay markdown.

---

## Documentation

Xoch docs should describe the current system, not a historical changelog.

Update docs when behavior changes:

- `README.md` for user-facing workflow and installation guidance
- `prompts/README.md` for command inventory and prompt behavior
- `CONTRIBUTING.md` for contributor workflow

Use `xoch-doc` when documentation freshness is the work.

---

## Helper Scripts

Helper scripts live under:

```text
bin/
```

Helpers should be deterministic, explicit, shell-friendly, and easy to smoke test. Do not add network-dependent helper behavior to `xoch init`.

The canonical helper inventory and purpose of each command live in the root `README.md`. Do not duplicate that inventory here; this document defines contributor-facing helper conventions.

Once installed via npm, `bin/xoch.js` (the package's `bin` entry) requires its sibling `bin/*.js` modules in-process and forwards `xoch <namespace> <command> ...` to each one's own exported `main(argv)`/`run(argv)` -- no scripts are copied anywhere. Prompt files should call helpers through the installed `xoch` CLI, such as `xoch token-estimator`, so agents do not look for Xoch helpers inside the project currently being worked on. Helper filenames must use kebab-case.

Prompts that plan or write code include `partials/conventions-check.md` in `apply` mode, and prompts that judge finished code include it in `check` mode; never have a prompt read `[xoch-root]/docs/conventions.md` whole. See [Partials](prompts/README.md#partials).

Treat `[xoch-root]/work/current.json` as helper-owned runtime state. Prompt changes must query it through `xoch job current --json` and use workflow helper actions rather than instructing agents to edit the pointer directly.

---

## Installer

`xoch init` (`bin/init.js`) renders and installs top-level prompt files for supported AI tools.

Installer expectations:

- install top-level `prompts/*.md` command files
- skip `prompts/README.md`
- skip `prompts/partials/` fragments
- render prompt partials before installing prompts
- fail when rendered prompts contain unresolved partial markers
- remove stale installed `xoch-*` commands whose source prompt no longer exists
- install Claude Code commands as personal skills under `~/.claude/skills/`
- keep command inventory aligned with `prompts/README.md`

### Install Targets

Every AI tool `xoch init` installs into is one entry in `bin/lib/install-targets.js`, and the tools actually used are the single `INSTALL_TARGETS = [...]` line in that file. `init.js`, `remove.js`, `prompt-check.js`, and the `xoch`/`config` help text all loop over that list instead of naming tools themselves.

To add a tool, define its entry next to the others -- folder (`homeDir`), installed-entry naming (`suffix`, `isEntry`, `removeEntry`), `install()`, its `usage` lines, and an optional `verify()` for `prompt-check` -- then add it to `INSTALL_TARGETS`. To drop one (for example, a downstream build that only ships Kiro), remove it from that line only; leave its entry defined.

Keep `INSTALL_TARGETS` on one line so a downstream build can replace it with a single literal find/replace. Tests that check one tool's specific install shape only run when that tool is listed, so a shortened list still passes `npm test`.

Prompt partials live under `prompts/partials/` and use `{{xoch-partial:...}}` include syntax. Keep partials small, deterministic, and documented in `prompts/README.md`.

---

## Validation

Run focused checks for your change:

```bash
bin/prompt-check.js run
git diff --check
```

When installer behavior changes, run a temporary-HOME install smoke test.

### Tests And Coverage

Every `bin/*.js` script, `bin/lib/*.js` module, `scripts/*.js` release tool (not shipped in the package), and `config.js` has a matching `test/*.test.js` file using the shared harness (`test/lib/runner.js`'s `test()`/`run()`, `test/lib/cli.js`'s `scratch()`/`cleanup()`/`runScript()` for isolated-`$HOME` subprocess spawns). Run the full suite:

```bash
npm test
```

This runs `node --test --experimental-test-coverage test/*.test.js` and prints a per-file coverage table. Any file a change modifies with executable code must reach 100% line, branch, and function coverage before that change is done — not just the lines touched, the whole file. This is not waivable outside an `xoch-patch` session. If a target file isn't already at 100%, add coverage-backfill test cases for its existing behavior alongside the change.

The rule above is unwaivable in this repository regardless of `coverage.strictness`. That setting is global to your machine and now defaults to `recommended`, so set `xoch config set coverage.strictness required` while working on Xoch itself (see `bin/README.md#configjs`) so the rendered prompts enforce it too.

To run a subset while iterating:

```bash
node --test --experimental-test-coverage test/some-file.test.js
```

A shared library module's own file (e.g. `bin/lib/ruby-json.js`) may show partial coverage when its test file runs alone if other files also exercise it indirectly — run it alongside its own dedicated test file (or the full suite) for the true picture.

Check command inventory:

```bash
find prompts -maxdepth 1 -type f -name '*.md' ! -name README.md -print | sort
```

Check rendered prompts after install:

```bash
rg "\\{\\{xoch-partial:" "$HOME/.xoch/prompts"
```

---

## Releasing

Releases are published from `main` by `.github/workflows/release.yml`. Pull requests to `main` run `npm test` on Node 20 and the current LTS (`.github/workflows/ci.yml`).

To release:

1. Bump `version` in `package.json`. In a Xoch job, `xoch-doc` applies the spec's Version Impact.
2. Add a matching `## [x.y.z] - YYYY-MM-DD` entry to `CHANGELOG.md`. Its notes become the GitHub Release notes.
3. Merge to `main`.

On every push to `main`, the workflow runs the tests, publishes the version to npm if it isn't published yet, and creates the `vX.Y.Z` tag and GitHub Release if the tag is missing. A merge that doesn't bump the version publishes nothing. If the version is unpublished and `CHANGELOG.md` has no entry for it, the workflow fails before publishing.

Every pull request to `main` also runs the Release workflow as a dry run. To exercise it on `main` without releasing, run the Release workflow from the repository's Actions tab with `dry-run` checked (the default). It runs every check and `npm publish --dry-run`, and skips the tag and GitHub Release.

### One-Time npm Setup

The workflow authenticates with npm trusted publishing, so no npm token is stored in the repository. On npmjs.com, add a trusted publisher to `@jeffcarbine/xoch` under the package's settings: GitHub Actions, repository `jeffcarbine/xoch`, workflow `release.yml`.

---

## Contribution Principles

- Keep changes scoped to the job.
- Prefer existing Xoch patterns.
- Preserve user changes in the worktree.
- Record why foundational job artifacts changed.
- Keep Xoch lightweight and personal.
- Do not add aliases for removed commands unless a future job explicitly decides to.
