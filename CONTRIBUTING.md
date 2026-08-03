# Contributing to Xoch

Thank you for improving Xoch. Xoch is a prompt-first workflow package, so most contributions are prompt, documentation, or helper-script changes.

---

## Workflow

Use Xoch to work on Xoch:

```text
xoch-open-job -> xoch-spec -> xoch-plan -> xoch-make -> xoch-next -> xoch-review -> xoch-close-job
```

For this repository, older migration jobs may still live under `.xoch/context/`. New job guidance should target the resolved Xoch storage root's `work/` directory — `.xoch/work/` by default, or `~/.xoch/projects/<slug>/work/` when `storage.mode` is set to `centralized` (`./config.sh set storage.mode centralized`, or hand-edit `~/.xoch/config.json`). Resolve it with `~/.xoch/bin/xoch-actions.sh config root`.

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
- preserve legacy `.xoch/context/` only as a migration fallback
- avoid QA or PR handoff ceremony in the core workflow
- update `prompts/README.md`, `README.md`, and `SYSTEM_DESIGN.md` when behavior changes

---

## Work Files

Target-model job files live under the resolved Xoch storage root:

```text
[xoch-root]/work/jobs/[job-id]/
```

`[xoch-root]` is `.xoch` by default (in-repo), or `~/.xoch/projects/<slug>` when centralized storage is enabled — see `bin/xoch-actions.sh`'s `xoch_root()` and `config root` subcommand. When writing or editing prompts, never hardcode `.xoch/work/...` as if it were literally relative to the repo; resolve it from `job current --json`'s `directory` field or `xoch-actions.sh config root` instead.

Common files:

| File | Purpose | Created By |
|---|---|---|
| `[xoch-root]/work/current.json` | Active job pointer | `open-job` |
| `state.md` | Job status and routing | `open-job` |
| `spec.md` | Requirements and ACs | `spec` |
| `plan.md` | Implementation approach | `plan` |
| `phases.md` | Phase tracker | `plan` |
| `snapshots/phase-[N].md` | Phase completion snapshot | `next` |
| `review.md` | Acceptance and quality review | `review` |
| `closure.md` | Closure notes | `close-job` |
| `revisions/` | Spec/plan revision notes | `revise-*` |

Arcs live under:

```text
[xoch-root]/work/arcs/[arc-id]/
```

Arcs reference job IDs in `jobs.md`; they do not contain job folders.

---

## Documentation

Xoch docs should describe the current system, not a historical changelog.

Update docs when behavior changes:

- `README.md` for user-facing workflow and installation guidance
- `SYSTEM_DESIGN.md` for architecture and state model
- `prompts/README.md` for command inventory and prompt behavior
- `CONTRIBUTING.md` for contributor workflow
- `.xoch/docs/` packet examples when relevant

Use `xoch-doc` when documentation freshness is the work.

---

## Helper Scripts

Helper scripts live under:

```text
bin/
```

Helpers should be deterministic, explicit, shell-friendly, and easy to smoke test. Do not add network-dependent helper behavior to the installer.

The canonical helper inventory and purpose of each command live in the root `README.md`. Do not duplicate that inventory here; this document defines contributor-facing helper conventions.

During install, helper scripts are copied to:

```text
~/.xoch/bin/
```

Prompt files should call helpers from the installed path, such as `~/.xoch/bin/token-estimator.sh`, so agents do not look for Xoch helpers inside the project currently being worked on. Helper filenames must use kebab-case.

Treat `[xoch-root]/work/current.json` as helper-owned runtime state. Prompt changes must query it through `xoch-actions.sh job current --json` and use workflow helper actions rather than instructing agents to edit the pointer directly.

---

## Installer

`install.sh` installs top-level prompt files for supported AI tools.

Installer expectations:

- install top-level `prompts/*.md` command files
- skip `prompts/README.md`
- skip `prompts/partials/` fragments
- render prompt partials before installing prompts
- copy `bin/*.sh` helpers to `~/.xoch/bin/`
- fail when rendered prompts contain unresolved partial markers
- remove stale installed `xoch-*` commands whose source prompt no longer exists
- install Claude Code commands as personal skills under `~/.claude/skills/`
- keep command inventory aligned with `prompts/README.md`

Prompt partials live under `prompts/partials/` and use `{{xoch-partial:...}}` include syntax. Keep partials small, deterministic, and documented in `prompts/README.md`.

---

## Validation

Run focused checks for your change:

```bash
bash -n install.sh
bin/prompt-check.sh run
git diff --check
```

When installer behavior changes, run a temporary-HOME install smoke test.

Check command inventory:

```bash
find prompts -maxdepth 1 -type f -name '*.md' ! -name README.md -print | sort
```

Check rendered prompts after install:

```bash
rg "\\{\\{xoch-partial:" "$HOME/.xoch/prompts"
```

---

## Contribution Principles

- Keep changes scoped to the job.
- Prefer existing Xoch patterns.
- Preserve user changes in the worktree.
- Record why foundational job artifacts changed.
- Keep Xoch lightweight and personal.
- Do not add aliases for removed commands unless a future job explicitly decides to.
