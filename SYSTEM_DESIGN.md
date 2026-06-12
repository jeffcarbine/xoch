# Xoch System Design

Xoch is a prompt-first workflow system for AI-assisted software development. It keeps durable project knowledge in documentation and local task execution state under `.xoch/`.

## Philosophy

- **Documentation is living specification.** READMEs and Xoch docs describe the system as it exists now.
- **Specs describe change.** Task specs capture what should change before implementation begins.
- **Plans create phases.** Work is broken into small, reviewable phases.
- **Agents assist, engineers decide.** Agents can plan, implement, review, and summarize, but the engineer owns direction and risky operations.
- **State is explicit.** Task files record decisions, current phase, review status, and closure notes.

## Vocabulary

| Concept | Meaning |
|---|---|
| Task | The primary unit of work. |
| Phase | A reviewable implementation slice inside a task. |
| Arc | An optional grouping of related tasks that share a larger goal. |
| Work | Local task and arc execution state under `.xoch/work/`. |
| Docs | Project knowledge packets and README-aligned documentation under `.xoch/docs/`. |
| Glossary | Project terminology under `.xoch/glossaries/`. |

## Lifecycle

```text
open -> spec -> plan -> make -> next -> review -> close
```

### Open

`xoch-open` creates or resumes task work. It records task metadata, optional arc association, and documentation targets when known.

### Spec

`xoch-spec` captures requirements, constraints, and acceptance criteria. New specs should use explicit AC IDs so plan, make, next, and review can preserve traceability.

### Plan

`xoch-plan` turns the spec into an implementation approach and phases.

### Make

`xoch-make` implements or guides the current phase. It confirms phase readiness, explains the work, records who owns implementation, keeps edits scoped to the phase, and captures validation evidence before routing to `xoch-next`.

### Next

`xoch-next` reviews phase output, asks about manual or external changes, writes a phase snapshot, and advances to the next phase only after engineer confirmation. When no phases remain, it marks implementation complete and routes to `xoch-review`.

### Review

`xoch-review` checks completed work against acceptance, correctness, quality, security basics, tests, and documentation freshness. Review status is one of `pass`, `pass_with_waivers`, `needs_work`, or `blocked`.

### Close

`xoch-close` records final task history, handles review or documentation waivers if needed, and clears active work. Closing normally requires `pass` or `pass_with_waivers`; missing or failing review requires an explicit engineer waiver.

## Directory Model

```text
.xoch/
  work/
    current.md
    tasks/
      task-id/
        state.md
        spec.md
        plan.md
        phases.md
        review.md
        close.md
        phases/
          phase-1.md
          phase-2.md
        snapshots/
        notes/
        revisions/
    arcs/
      arc-id/
        state.md
        plan.md
        tasks.md
        notes.md
  docs/
    CODEBASE.md
    PATTERNS.md
    DEPENDENCIES.json
    RISKS.md
    TESTING.md
    FEATURES.md
  glossaries/
    README.md
    quick-reference.md
```

## Task State

Every target-model task should have:

```text
.xoch/work/tasks/[task-id]/state.md
```

Recommended state fields:

- task ID
- title
- status
- optional arc
- current phase
- documentation targets
- key decisions
- risks or open questions
- next command
- review status
- close status

When a task belongs to an arc, the task state uses:

```yaml
arc: [arc-id]
```

Standalone tasks should use:

```yaml
arc: standalone
```

## Phases

`phases.md` tracks the phase list and the current phase. Individual phase files live under:

```text
.xoch/work/tasks/[task-id]/phases/
```

Each phase should include:

- goal
- tasks
- files likely touched
- acceptance criteria covered
- test/check expectations
- completion snapshot

Phase snapshots are written under:

```text
.xoch/work/tasks/[task-id]/snapshots/
```

Snapshots capture files changed, acceptance evidence, validation, manual testing, skipped checks, and the next route.

## Review And Close

`review.md` is the task-level quality record. It should include acceptance coverage, validation evidence, documentation freshness, waivers, and the recommended next command.

`close.md` is the final task history. It should summarize what shipped, review status, documentation status, waivers, files changed, and follow-up work.

Xoch does not add QA or PR handoff commands. Review is intentionally local and lightweight; company-specific release or handoff processes belong outside the core command set.

## Arcs

Arcs are optional task groupings:

```text
.xoch/work/arcs/[arc-id]/
```

Arc folders use this shape:

```text
.xoch/work/arcs/[arc-id]/
  state.md
  tasks.md
  notes.md
  close.md
  revisions/
```

Arcs reference task IDs in `tasks.md`. Task folders remain under `.xoch/work/tasks/` and are not nested inside arcs.

`state.md` records the arc title, purpose, status, success outcome, documentation targets, risks, dates, and recommended next command. `tasks.md` groups references as active, planned, complete, or parked. `notes.md` captures arc-level rationale that does not belong to one task.

Arc commands must not close, archive, delete, or move task folders. They may update a task's `arc` field only when the engineer confirms that back-reference change.

## Revisions

Revision commands preserve history when foundational task or arc files change:

- `xoch-revise-spec` updates requirements, acceptance criteria, constraints, scope, or documentation targets.
- `xoch-revise-plan` updates implementation approach, phase order, validation strategy, or remaining phase shape.
- `xoch-revise-arc` updates arc purpose, status, task membership references, risks, or shared notes.

Revision notes live under:

```text
.xoch/work/tasks/[task-id]/revisions/
.xoch/work/arcs/[arc-id]/revisions/
```

Completed phase snapshots should not be rewritten during plan revisions. If a later revision supersedes completed work, record the supersession in a revision note and create follow-up phases.

## Docs

`.xoch/docs/` stores project knowledge packets that can support README refresh, documentation validation, and agent orientation:

- `CODEBASE.md` - layout, entry points, major modules
- `PATTERNS.md` - coding and architectural patterns
- `DEPENDENCIES.json` - project and service dependencies
- `RISKS.md` - known fragile areas and debt
- `TESTING.md` - test frameworks and validation expectations
- `FEATURES.md` - feature inventory and README targets

`xoch-doc` is responsible for creating, refreshing, repairing, or validating documentation.

`xoch-map` may update `DEPENDENCIES.json`, `CODEBASE.md`, or `FEATURES.md` when local project/dependency relationships need to be captured. First-pass map support is intentionally local and does not create synchronized multi-project task state.

`xoch-trace` may write investigation notes under task `notes/` when root cause is unclear. Trace notes should separate evidence, hypotheses, confidence, and recommended next steps.

`xoch-patch` may write patch notes under task `notes/` or `.xoch/work/patches/` for small, bounded fixes. Patch work should switch back to the normal lifecycle when scope grows.

## Shared Includes And Helpers

Xoch prompt source files are currently installed directly. Shared prompt include rendering is deferred until duplication creates a clear maintenance problem.

The current helper scripts are:

- `bin/generateTaskId.sh`
- `bin/tokenEstimator.sh`

Additional helpers such as README generation, documentation drift checks, project dependency resolution, or task archive/unarchive should be added only when they can stay deterministic, shell-friendly, and easy to smoke test.

## Glossaries

`.xoch/glossaries/` stores project terminology. Glossaries are shared team knowledge and should use concise definitions.

Glossaries are especially relevant for specs, docs, review notes, and user-facing terminology.

## Installer Model

Prompt source files live under `prompts/`. Each installable top-level prompt markdown file becomes an `xoch-*` command for supported AI tools.

The installer must not install:

- `prompts/README.md`
- future `prompts/shared/` fragments
- removed/stale command files

Supported install targets:

- GitHub Copilot / Cursor prompt files
- Codex skills

## Helper Scripts

Helper scripts live under `bin/`. They should be deterministic, explicit, and shell-friendly.

## Migration Note

Older Xoch tasks may exist under `.xoch/context/` and use milestone language. New work should use `.xoch/work/` and phase language. Active legacy tasks should not be moved automatically unless the engineer explicitly asks.
