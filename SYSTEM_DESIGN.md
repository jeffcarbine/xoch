# Xoch System Design

Xoch is a prompt-first workflow system for AI-assisted software development. It keeps durable project knowledge in documentation and local job execution state under `.xoch/`.

## Philosophy

- **Documentation is living specification.** READMEs and Xoch docs describe the system as it exists now.
- **Specs describe change.** Job specs capture what should change before implementation begins.
- **Plans create phases.** Work is broken into small, reviewable phases.
- **Agents assist, engineers decide.** Agents can plan, implement, review, and summarize, but the engineer owns direction and risky operations.
- **State is explicit.** Job files record decisions, current phase, review status, and closure notes.

## Vocabulary

| Concept | Meaning |
|---|---|
| Job | The primary unit of work. |
| Phase | A reviewable implementation slice inside a job. |
| Arc | An optional grouping of related jobs that share a larger goal. |
| Work | Local job and arc execution state under `.xoch/work/`. |
| Docs | Project knowledge packets and README-aligned documentation under `.xoch/docs/`. |
| Glossary | Project terminology under `.xoch/glossaries/`. |

## Lifecycle

```text
start-job -> spec -> plan -> make -> next -> review -> close-job
```

### Start

`xoch-start-job` creates or resumes job work. It records job metadata, optional arc association, and documentation targets when known.

### Spec

`xoch-spec` captures requirements, constraints, acceptance criteria, and job-versus-arc fit. New specs should use explicit AC IDs so plan, make, next, and review can preserve traceability. When the requested work appears too broad for one focused job, `xoch-spec` should recommend `xoch-start-arc` before job planning.

### Plan

`xoch-plan` turns the spec into an implementation approach and phases.

### Make

`xoch-make` implements or guides the current phase. It confirms phase readiness, explains the work, records who owns implementation, keeps edits scoped to the phase, and captures validation evidence before routing to `xoch-next`.

### Next

`xoch-next` reviews phase output, asks about manual or external changes, writes a phase snapshot, and advances to the next phase only after engineer confirmation. When no phases remain, it marks implementation complete and routes to `xoch-review`.

### Review

`xoch-review` checks completed work against acceptance, correctness, quality, security basics, tests, and documentation freshness. Review status is one of `pass`, `pass_with_waivers`, `needs_work`, or `blocked`.

### Close Job

`xoch-close-job` records final job history, handles review or documentation waivers if needed, and clears active work. Closing normally requires `pass` or `pass_with_waivers`; missing or failing review requires an explicit engineer waiver.

## Directory Model

```text
.xoch/
  work/
    current.md
    jobs/
      job-id/
        state.md
        spec.md
        plan.md
        phases.md
        review.md
        closure.md
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
        jobs.md
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

## Job State

Every target-model job should have:

```text
.xoch/work/jobs/[job-id]/state.md
```

Recommended state fields:

- job ID
- title
- status
- optional arc
- current phase
- documentation targets
- key decisions
- risks or unresolved questions
- next command
- review status
- closure status

When a job belongs to an arc, the job state uses:

```yaml
arc: [arc-id]
```

Standalone jobs should use:

```yaml
arc: standalone
```

## Phases

`phases.md` tracks the phase list and the current phase. Individual phase files live under:

```text
.xoch/work/jobs/[job-id]/phases/
```

Each phase should include:

- goal
- implementation steps
- files likely touched
- acceptance criteria covered
- test/check expectations
- completion snapshot

Phase snapshots are written under:

```text
.xoch/work/jobs/[job-id]/snapshots/
```

Snapshots capture files changed, acceptance evidence, validation, manual testing, skipped checks, and the next route.

## Review And Close Job

`review.md` is the job-level quality record. It should include acceptance coverage, validation evidence, documentation freshness, waivers, and the recommended next command.

`closure.md` is the final job history. It should summarize what shipped, review status, documentation status, waivers, files changed, and follow-up work.

Xoch does not add QA or PR handoff commands. Review is intentionally local and lightweight; company-specific release or handoff processes belong outside the core command set.

## Arcs

Arcs are optional job groupings:

```text
.xoch/work/arcs/[arc-id]/
```

Arc folders use this shape:

```text
.xoch/work/arcs/[arc-id]/
  state.md
  jobs.md
  notes.md
  closure.md
  revisions/
```

Arcs reference job IDs in `jobs.md`. Job folders remain under `.xoch/work/jobs/` and are not nested inside arcs.

`state.md` records the arc title, purpose, status, success outcome, documentation targets, risks, dates, and recommended next command. `jobs.md` groups references as active, planned, complete, or parked. `notes.md` captures arc-level rationale that does not belong to one job.

Arc commands must not close, archive, delete, or move job folders. They may update a job's `arc` field only when the engineer confirms that back-reference change.

`xoch-start-arc` checks for an active standalone job before creating a new arc. If one exists, the command can add that job to the new arc's `jobs.md` under `Active` and, with engineer approval, update the job `state.md` with `arc: [arc-id]`. When the active job already has a spec, the command asks whether to infer the arc purpose, success outcome, and candidate job list from that spec or use engineer-provided arc metadata.

## Revisions

Revision commands preserve history when foundational job or arc files change:

- `xoch-revise-spec` updates requirements, acceptance criteria, constraints, scope, or documentation targets.
- `xoch-revise-plan` updates implementation approach, phase order, validation strategy, or remaining phase shape.
- `xoch-revise-arc` updates arc purpose, status, job membership references, risks, or shared notes.

Revision notes live under:

```text
.xoch/work/jobs/[job-id]/revisions/
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

`xoch-map` may update `DEPENDENCIES.json`, `CODEBASE.md`, or `FEATURES.md` when local project/dependency relationships need to be captured. First-pass map support is intentionally local and does not create synchronized multi-project job state.

`xoch-trace` may write investigation notes under job `notes/` when root cause is unclear. Trace notes should separate evidence, hypotheses, confidence, and recommended next steps.

`xoch-patch` may write patch notes under job `notes/` or `.xoch/work/patches/` for small, bounded fixes. Patch work should switch back to the normal lifecycle when scope grows.

## Shared Includes And Helpers

Xoch prompt source files are rendered before installation. Reusable prompt fragments live under:

```text
prompts/partials/
```

Top-level prompts include fragments with:

```text
{{xoch-partial:partial-file.md}}
```

The standard workflow partials are:

- `action-choice.md` for engineer/agent/collaboration decisions.
- `next-step.md` for command routing output.

The installer writes rendered prompts to:

```text
~/.xoch/prompts/
```

Copilot and Codex installs use rendered prompt files, not source prompt files. Partial files are never installed or counted as commands. The installer fails if a partial path is invalid, a required variable is missing, or rendered prompts still contain unresolved partial markers.

Rendered workflow prompts should use concise, command-like language:

```text
How would you like to proceed? [A]gent builds, [E]ngineer builds, or [C]ollaborate?
Ready for next step: `xoch-next`
```

The current helper scripts are:

- `bin/generateJobId.sh`
- `bin/tokenEstimator.sh`

Additional helpers such as README generation, documentation drift checks, project dependency resolution, or job archive/unarchive should be added only when they can stay deterministic, shell-friendly, and easy to smoke test.

## Glossaries

`.xoch/glossaries/` stores project terminology. Glossaries are shared team knowledge and should use concise definitions.

Glossaries are especially relevant for specs, docs, review notes, and user-facing terminology.

## Installer Model

Prompt source files live under `prompts/`. Each installable top-level prompt markdown file becomes an `xoch-*` command for supported AI tools.

The installer must not install:

- `prompts/README.md`
- `prompts/partials/` fragments
- removed/stale command files

Supported install targets:

- GitHub Copilot / Cursor prompt files
- Codex skills

## Helper Scripts

Helper scripts live under `bin/`. They should be deterministic, explicit, and shell-friendly.

## Migration Note

Older Xoch jobs may exist under `.xoch/context/` and use milestone language. New work should use `.xoch/work/` and phase language. Active legacy jobs should not be moved automatically unless the engineer explicitly asks.
