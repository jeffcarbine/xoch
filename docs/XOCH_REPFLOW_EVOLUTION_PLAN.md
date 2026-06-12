# Xoch RepFlow Evolution Reference

## Purpose

This document records the decisions behind Xoch's RepFlow-inspired workflow evolution. It is a design reference for why the current Xoch command vocabulary, lifecycle, and directory model look the way they do.

Xoch imports selected workflow strengths from RepFlow while keeping Xoch's own identity, command vocabulary, and README-first philosophy.

## Goals

- Adopt a stronger lifecycle rhythm while using Xoch-native command names.
- Replace old milestone/wave language with `phase`.
- Keep jobs as first-class units of work.
- Use arcs as optional groupings that reference job IDs.
- Use `.xoch/work/` for job and arc execution state.
- Use `.xoch/docs/` for lightweight project knowledge packets.
- Drop RepFlow-specific company handoff commands such as QA and PR generation from the core workflow.
- Preserve Xoch's lightweight, personal, README-driven character.

## Non-Goals

- No backwards-compatible aliases for removed command names.
- No wholesale copy of RepFlow terminology.
- No QA or PR commands in core Xoch.
- No nested job folders inside arc folders.
- No required arcs for normal job work.
- No synchronized multi-project job state in the first pass.
- No general-purpose prompt templating beyond small, deterministic partials.

## Core Flow

```text
xoch-start-job -> xoch-spec -> xoch-plan -> xoch-make -> xoch-next -> xoch-review -> xoch-close-job
```

Use `xoch-make` and `xoch-next` repeatedly until all phases are complete.

## Command Inventory

Core:

```text
xoch-start-job
xoch-spec
xoch-plan
xoch-make
xoch-next
xoch-review
xoch-close-job
```

Arcs:

```text
xoch-start-arc
xoch-revise-arc
xoch-close-arc
```

Revision:

```text
xoch-revise-spec
xoch-revise-plan
```

Support:

```text
xoch-doc
xoch-map
xoch-trace
xoch-patch
xoch-pause
xoch-resume
xoch-sidebar
xoch-glossary
xoch-meow
```

## Rename Map

| RepFlow / Old Term | Xoch Term | Notes |
|---|---|---|
| `wave` / `milestone` | `phase` | Implementation slice inside a job. |
| `start` | `start-job` | Opens or resumes job work. |
| `build` | `make` | Implements or guides the current phase. |
| `next` | `next` | Reviews the current phase and advances. |
| `audit` | `review` | Verifies acceptance, quality, tests, risk, and docs. |
| `ship` / `finalize` | `close-job` | Records closure and clears active work. |
| `context` | `doc` | Documentation refresh and validation command. |
| `workspace` | `map` | Lightweight local project/dependency mapping. |
| `debug` | `trace` | Root-cause investigation. |
| `hotfix` | `patch` | Focused small or urgent fix workflow. |
| `respec` | `revise-spec` | Revises foundational requirements. |
| `replan` | `revise-plan` | Revises implementation approach or phases. |
| new | `revise-arc` | Revises arc purpose or job membership. |
| `epic` | `arc` | Optional grouping of related jobs. |

## Core Concepts

### Job

A job is the primary unit of work. It owns its spec, plan, phases, state, notes, snapshots, review, and closure records.

Jobs may be standalone or associated with an arc.

### Phase

A phase is a reviewable implementation slice inside a job. Each phase should describe:

- goal
- implementation steps
- files likely touched
- acceptance criteria covered
- test/check expectations
- completion evidence

### Arc

An arc is an optional grouping of jobs that share a larger goal.

Arcs reference job IDs in `jobs.md`. They do not own or nest job folders.

### Work

`.xoch/work/` stores local job and arc execution state:

- current job pointer
- jobs
- arcs
- notes
- snapshots
- revisions
- review and closure records

### Docs

`.xoch/docs/` stores project knowledge packets that support README refresh, validation, and agent orientation.

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
        jobs.md
        notes.md
        closure.md
        revisions/
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

## Job And Arc Relationship

Jobs stay in:

```text
.xoch/work/jobs/[job-id]/
```

Arcs stay in:

```text
.xoch/work/arcs/[arc-id]/
```

An arc references its jobs in `jobs.md`:

```markdown
# Arc Jobs - auth-refresh

## Active

- `job-001-login` - Add login phase flow

## Complete

- `job-000-auth-docs` - Refresh auth docs

## Parked

- `job-003-mfa` - Waiting on provider decision
```

Each job can point back to its arc in `state.md`:

```yaml
job_id: job-001-login
arc: auth-refresh
status: phase_ready
current_phase: 2
```

## Lifecycle Decisions

- `xoch-start-job` is the normal entry point for creating or resuming job work.
- `xoch-spec` records requirements with explicit acceptance criteria IDs.
- `xoch-plan` creates implementation phases and acceptance coverage.
- `xoch-make` implements or guides the current phase.
- `xoch-next` reviews phase output, writes snapshots, and advances with engineer confirmation.
- `xoch-review` is the expected gate before close-job.
- `xoch-close-job` may proceed with explicit review or documentation waivers, and records those waivers.

## Support Decisions

- `xoch-doc` is the unified documentation command for README, feature, and `.xoch/docs/` work.
- `xoch-map` is a lightweight local mapping command and does not create synchronized multi-project job state.
- `xoch-trace` investigates unclear symptoms before code changes.
- `xoch-patch` handles small, bounded fixes and routes back to normal job flow if scope grows.
- Shared prompt partials live under `prompts/partials/` and render into installable prompts.
- New helper scripts are deferred until they provide deterministic value and remain easy to smoke test.

## Installer Decisions

The installer should:

- install only top-level prompt markdown files that are commands
- skip `prompts/README.md`
- skip `prompts/partials/` fragments
- render prompt partials before installing prompts
- fail when rendered prompts contain unresolved partial markers
- remove stale installed `xoch-*` commands whose source prompt no longer exists
- install the same command inventory for Copilot/Cursor and Codex

## Migration Boundary

New job guidance targets `.xoch/work/`.

Older migration jobs may still live under `.xoch/context/`. Xoch prompts should continue those legacy jobs in place and should not move them unless the engineer explicitly asks.
