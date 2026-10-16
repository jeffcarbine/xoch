---
name: xoch-foundation-core
description: Core Xoch job model reference for agents unfamiliar with Xoch
---

# Xoch - Foundation Core

This is the recovery reference for agents that do not already know Xoch's job model. It is rendered to `~/.xoch/prompts/core/foundation-core.md` and is not installed as a command.

## Model

Xoch tracks focused software work as jobs. The normal flow is:

```text
xoch-open -> xoch-do -> xoch-doc -> xoch-close
```

`xoch-do` covers implementation, phase review/advance, and the final job-level review as three internal steps (`implement`, `advance`, `final_review`) rather than three separate commands -- see Step Tracking below.

When a material unknown blocks honest specification, use the optional loop:

```text
spec -> discovery -> spec
```

Jobs live under:

```text
.xoch/work/jobs/[job-id]/
```

The active job pointer is:

```text
.xoch/work/current.json
```

Query the active pointer with `xoch job current --json`; do not read or edit `current.json` directly unless the helper is unavailable. The helper migrates target-model `current.md` pointers and reports legacy `.xoch/context/current.md` metadata without moving legacy jobs.

Every `.xoch/work/...` path shown in Xoch's prompts is relative to the project's resolved Xoch storage root, not literally `<repo>/.xoch`. By default the root is `~/.xoch/projects/<project-slug>/`, entirely outside the repository — nothing gets written under the repo in that mode. When `~/.xoch/config.json` sets `storage.mode` to `in-repo`, the root is `.xoch` inside the repository instead. Get the active job's real directory from `job current --json`'s `directory` field; get the root directly (e.g. before any job exists) with `xoch config root`. Never assume `.xoch/work/...` is literally relative to the repo root.

## Job Files

- `state.json`: compact working index and durable job status. Read it with `xoch state get`; change it only with `xoch state set`, `state update`, `phase advance`, and the other state helpers.
- `spec.md`: accepted requirements, acceptance criteria, constraints, current state, proposed changes, and arc fit.
- `plan.md`: accepted implementation approach, risks, files, and acceptance coverage.
- `phases.json`: authoritative, ordered phase list with each phase's full content. A phase's number is its position in the list. Read it with `xoch phase get` or `xoch phase show`; write it only with `xoch phase write` and `xoch phase advance`.
- `snapshots/phase-[N].md`: completion evidence captured by `xoch-do`'s `advance` step.
- `notes/`: implementation, trace, or sidebar notes.
- `revisions/`: spec, plan, or arc revision history.

Discovery notes are not job files: `[xoch-root]/discoveries/*-discovery.md` sits outside every job's own directory, shared across jobs and reachable even before any job exists.

Job state also preserves managed side-workflow fields when one is active: `active_workflow`, `workflow_stage`, `pending_action`, `workflow_artifact`, `return_command`, and `workflow_started_at`. `current.json` is the machine-readable runtime projection used for command routing.

Use job state (`xoch state get --job ID --json`) first on repeated commands. It includes current phase title, goal, likely files, acceptance criteria, validation expectations, and a short phase index. Read full `spec.md`, `plan.md`, or phases only when state/prior context is insufficient or exact text is required.

Structured job and arc files are JSON owned by the helpers: never open, edit, or write `state.json`, `phases.json`, or an arc's `state.json`/`jobs.json` directly. Prose artifacts (spec, plan, snapshots, review, notes, revisions) stay markdown.

## Step Tracking

A bundled multi-step command (`xoch-open`, `xoch-do`) can span several internal steps across one or more invocations without a fresh command each time. Job state's `next_command` and `current_step` track exactly where a job is; `current.json` projects both, so `job current --json` -- the call every command already makes for the workflow boundary -- is enough to know the current step without a separate state read.

These two fields are distinct from the managed side-workflow fields above (`active_workflow`, `workflow_stage`, ...): a side workflow is a temporary diversion from the main flow that returns to it when done (`xoch-discovery`, `xoch-pause`); `next_command`/`current_step` describe position in the main flow itself.

Step vocabulary:

- `xoch-open`: `title` -> `spec` -> `plan`
- `xoch-do`: `implement` -> `advance` -> (loops to `implement` for the next phase, or falls through to `final_review` once every phase is done)
- `xoch-close`: `job` or `arc`, chosen by argument or context, not advanced through

A bundled skill never decides or writes a step name itself for a mechanical transition. It invokes the right deterministic helper and reports whatever step came back:

- `xoch job step-advance --job ID` for a step-only transition with no phase-index bookkeeping and no outcome to judge: `title`->`spec`, `spec`->`plan`, `implement`->`advance`.
- `xoch phase advance --job ID --phase N` for any transition that crosses a phase boundary (entering phase 1 from `plan`, moving `advance`->`implement` into the next phase, or `advance`->`final_review` once `current_phase` reaches `phase_count`) -- it takes the next phase's details from the phases document and also sets `current_step` as part of updating phase state. `job step-advance` refuses to move past `plan` or `advance` for this reason; use `phase advance` there instead.
- Leaving `final_review` is not mechanical -- it depends on the review's outcome (pass routes to `xoch-doc`, a failing review routes back into implementation), so `job step-advance` refuses it too. `review-core.md`'s own state update sets `current_step` directly as part of recording that judgment.

## Arcs

Arcs group related jobs by job ID reference:

```text
.xoch/work/arcs/[arc-id]/
```

An arc holds `state.json` (purpose, success outcome, status), `jobs.json` (Active/Planned/Complete/Parked membership), `notes.md`, and `revisions/`. Read arc state and membership with `xoch arc get`; change them only with `xoch arc update` and `xoch arc job-move`.

Do not nest job folders inside arcs. `xoch-open` sets one up when work has multiple related jobs under a larger goal.

## Multi-Project Jobs

Standalone jobs need no additional scope file. A job spanning repositories stores optional routing metadata at:

```text
.xoch/work/jobs/[job-id]/projects.json
```

One listed project is primary and owns canonical shared job artifacts. Participant repositories may hold synchronized mirrors of the same job folder. Implementation files and the active pointer are always project-specific and are never synchronized. Use `xoch project-scope` for routing and `xoch context-sync` after canonical job-context writes.

{{xoch-partial:context-economy.md}}

## Deterministic Helpers

Prefer installed helpers for static file and state actions:

```bash
xoch job current --json
xoch job open ...
xoch job evidence --job ID --json
xoch arc open ...
xoch arc evidence --arc ID --json
xoch state get --job ID --json
xoch state set ...
xoch state update --job ID
xoch phase get --job ID [--phase N] --json
xoch phase show --job ID [--phase N]
xoch phase write --job ID
xoch phase start --job ID
xoch arc get --arc ID --json
xoch arc update --arc ID
xoch job close --job ID
xoch arc close --arc ID
xoch handoff write|list|get|claim ...
xoch pointer clear ...
xoch workflow begin ...
xoch workflow update ...
xoch workflow complete ...
xoch workflow abandon ...
xoch snapshot create ...
xoch phase advance ...
xoch job step-advance --job ID
xoch readme assemble ...
xoch archive archive ...
xoch coverage compare ...
xoch project-commands detect --json
xoch git-state inspect --json
xoch docs-drift check --json
xoch docs-target resolve ...
xoch gitignore ensure ...
```

Prefer `job evidence`/`arc evidence` over hand-listing which job/arc files to read — they resolve the storage root and existence-check each file, returning `null` for anything that doesn't exist yet. Still decide which of the returned files are actually worth reading; the helper finds paths, it does not make that judgment for you.

Use the LLM for judgment, summaries, specs, plans, reviews, and deciding what evidence means. Use helpers for repeatable filesystem/state mechanics when available.

Before every stateful Xoch command, enforce the shared workflow boundary. Finish an accepted pending wrap-up before an explicitly chained command; otherwise resume or explicitly abandon the active workflow before starting different work.

## Interaction Rules

- Ask before writing foundational artifacts when the prompt requires acceptance.
- Specs require engineer-provided source requirements; never invent a spec from only a job name or project context.
- Whenever you need a decision or selection from the engineer, ask it in text-game style — bracketed single-letter options, e.g. `[Y]es`/`[N]o`, `[A]ccept`/`[M]odify`. This applies to every engineer-input request, including ad hoc questions you construct yourself, not only choices a prompt already spells out verbatim.
- Treat phase boundaries as hard stops: `make` implements only the current phase, `next` only reviews/advances it, and neither command starts the next phase.
- Put summaries, files, validation, caveats, and notes before the final command line.
- The final line should be a text-game choice or `Ready for next step: ...`; after that final line, stop instead of executing the next command.
- Do not commit, push, stash, reset, or otherwise manage git history unless the engineer explicitly asks or the active prompt asks and the engineer confirms.
