---
name: xoch-foundation-core
description: Core Xoch job model reference for agents unfamiliar with Xoch
---

# Xoch - Foundation Core

This is the recovery reference for agents that do not already know Xoch's job model. It is rendered to `~/.xoch/prompts/core/foundation-core.md` and is not installed as a command.

## Model

Xoch tracks focused software work as jobs. The normal flow is:

```text
open-job -> spec -> plan -> make -> next -> review -> close-job
```

Jobs live under:

```text
.xoch/work/jobs/[job-id]/
```

The active job pointer is:

```text
.xoch/work/current.md
```

Read `.xoch/work/current.md` first. If it is absent, check `.xoch/context/current.md` for legacy migration jobs. Continue legacy jobs in place; do not move them unless the engineer explicitly asks.

## Job Files

- `state.md`: compact working index and durable job status.
- `spec.md`: accepted requirements, acceptance criteria, constraints, current state, proposed changes, and arc fit.
- `plan.md`: accepted implementation approach, risks, files, and acceptance coverage.
- `phases.md`: authoritative phase list.
- `phases/phase-[N].md`: optional detailed phase body.
- `snapshots/phase-[N].md`: completion evidence captured by `xoch-next`.
- `notes/`: implementation, trace, or sidebar notes.
- `revisions/`: spec, plan, or arc revision history.

Use `state.md` first on repeated commands. It should include current phase title, goal, likely files, acceptance criteria, validation expectations, and a short phase index. Read full `spec.md`, `plan.md`, or `phases.md` only when state/prior context is insufficient or exact text is required.

## Arcs

Arcs group related jobs by job ID reference:

```text
.xoch/work/arcs/[arc-id]/
```

Do not nest job folders inside arcs. Use `xoch-open-arc` when work has multiple related jobs under a larger goal.

## Multi-Project Jobs

Standalone jobs need no additional scope file. A job spanning repositories stores optional routing metadata at:

```text
.xoch/work/jobs/[job-id]/projects.json
```

One listed project is primary and owns canonical shared job artifacts. Participant repositories may hold synchronized mirrors of the same job folder. Implementation files and `.xoch/work/current.md` are always repository-local and are never synchronized. Use `project-scope.sh` for routing and `context-sync.sh` after canonical job-context writes.

## Context Economy

Before full-file reads beyond active pointer/state files, run:

```bash
~/.xoch/bin/token-estimator.sh --batch [files...]
```

Prefer search, diffs, file outlines, and targeted snippets before whole-file reads. Do not reread files merely to reacquire background already present in the conversation.

## Deterministic Helpers

Prefer installed helpers for static file and state actions:

```bash
~/.xoch/bin/xoch-actions.sh job current --json
~/.xoch/bin/xoch-actions.sh job open ...
~/.xoch/bin/xoch-actions.sh arc open ...
~/.xoch/bin/xoch-actions.sh state set ...
~/.xoch/bin/xoch-actions.sh pointer clear ...
~/.xoch/bin/xoch-actions.sh snapshot create ...
~/.xoch/bin/xoch-actions.sh phase advance ...
~/.xoch/bin/readme-actions.sh assemble ...
~/.xoch/bin/archive-actions.sh archive ...
~/.xoch/bin/coverage-actions.sh compare ...
~/.xoch/bin/project-commands.sh detect --json
~/.xoch/bin/git-state.sh inspect --json
~/.xoch/bin/docs-drift.sh check --json
~/.xoch/bin/docs-target.sh resolve ...
~/.xoch/bin/gitignore-actions.sh ensure ...
```

Use the LLM for judgment, summaries, specs, plans, reviews, and deciding what evidence means. Use helpers for repeatable filesystem/state mechanics when available.

## Interaction Rules

- Ask before writing foundational artifacts when the prompt requires acceptance.
- Specs require engineer-provided source requirements; never invent a spec from only a job name or project context.
- Use text-game choices exactly when a prompt asks for them.
- Treat phase boundaries as hard stops: `make` implements only the current phase, `next` only reviews/advances it, and neither command starts the next phase.
- Put summaries, files, validation, caveats, and notes before the final command line.
- The final line should be a text-game choice or `Ready for next step: ...`; after that final line, stop instead of executing the next command.
- Do not commit, push, stash, reset, or otherwise manage git history unless the engineer explicitly asks or the active prompt asks and the engineer confirms.
