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

## Context Economy

Before full-file reads beyond active pointer/state files, run:

```bash
~/.xoch/bin/tokenEstimator.sh --batch [files...]
```

Prefer search, diffs, file outlines, and targeted snippets before whole-file reads. Do not reread files merely to reacquire background already present in the conversation.

## Interaction Rules

- Ask before writing foundational artifacts when the prompt requires acceptance.
- Use text-game choices exactly when a prompt asks for them.
- Put summaries, files, validation, caveats, and notes before the final command line.
- The final line should be a text-game choice or `Ready for next step: ...`.
- Do not commit, push, stash, reset, or otherwise manage git history unless the engineer explicitly asks or the active prompt asks and the engineer confirms.
