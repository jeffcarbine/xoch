---
name: xoch-doc
description: Create, refresh, repair, or validate Xoch project and feature documentation
---

# Xoch - Doc

Create, refresh, repair, or validate documentation.

`doc` is Xoch's documentation command. It replaces the old split between app initialization, feature initialization, and validation prompts.

## Purpose

Keep README and Xoch documentation current-state oriented. `xoch-doc` may create missing docs, refresh stale docs, repair inaccurate docs, validate documentation freshness before `xoch-review` or `xoch-close-job`, or maintain lightweight `.xoch/docs/` packets.

## Scope

`xoch-doc` may work with:

- root `README.md`
- feature READMEs
- `.xoch/docs/` packets
- `.xoch/glossaries/`
- job documentation targets from `.xoch/work/jobs/[job-id]/state.md`

It should not turn documentation into an append-only changelog.

## Work Model

When a job is active, read job pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

For target-model jobs, documentation targets may appear in:

```text
.xoch/work/jobs/[job-id]/state.md
.xoch/work/jobs/[job-id]/spec.md
.xoch/work/jobs/[job-id]/review.md
```

Legacy migration jobs may still use `.xoch/context/`. Continue them in place and do not move them automatically.

## Documentation Packets

When useful, `.xoch/docs/` may contain:

```text
.xoch/docs/CODEBASE.md
.xoch/docs/PATTERNS.md
.xoch/docs/DEPENDENCIES.json
.xoch/docs/RISKS.md
.xoch/docs/TESTING.md
.xoch/docs/FEATURES.md
```

Create only the packets needed for the current documentation goal.

## Process

### Step 1: Identify Documentation Goal

Ask or infer whether the engineer wants to:

- create missing project or feature docs
- refresh docs after implementation
- validate docs before `xoch-review` or `xoch-close-job`
- repair stale or inaccurate docs
- create or refresh `.xoch/docs/` packets
- update glossary terminology

If the goal is unclear, ask for the documentation target.

### Step 2: Load Existing Context

Read only what is needed:

- relevant README files
- job state/spec/plan/review when active
- docs packets related to the target
- glossary index and quick reference when present
- source files needed to verify current behavior

Use token estimates for large reads:

```bash
bin/tokenEstimator.sh --batch [files...]
```

### Step 3: Validate Current State

Compare documentation against source and job evidence:

- what exists now
- what changed
- what docs claim
- what docs omit
- terminology mismatches
- stale setup, command, or workflow references
- risks that should be documented

### Step 4: Propose Updates

Summarize proposed documentation changes before editing when the change is broad.

Prefer:

- concise current-state descriptions
- stable usage examples
- links or references to nearby docs
- glossary-approved terms
- clear "not impacted" notes when docs do not need changes

Avoid:

- historical changelog sections
- duplicate docs that will drift
- speculative design commitments
- company-specific QA or PR ceremony in core Xoch docs

### Step 5: Write Documentation

Update or create the selected docs.

For `.xoch/docs/` packets, use these roles:

- `CODEBASE.md` - layout, entry points, major modules
- `PATTERNS.md` - coding and architectural patterns
- `DEPENDENCIES.json` - local projects, services, packages, or external systems
- `RISKS.md` - fragile areas, debt, migration notes, or operational risks
- `TESTING.md` - test frameworks, validation commands, and manual checks
- `FEATURES.md` - feature inventory and documentation targets

### Step 6: Record Documentation Status

When a job is active, record one of:

- current
- updated
- not impacted
- stale
- waived
- unknown

For target-model jobs, update or append to the relevant job file:

```text
.xoch/work/jobs/[job-id]/notes/
.xoch/work/jobs/[job-id]/review.md
.xoch/work/jobs/[job-id]/closure.md
```

For legacy migration jobs, record equivalent notes in the legacy job folder when useful.

### Step 7: Route

Recommend:

- `xoch-review` when docs are ready for review
- `xoch-close-job` when docs are ready for closure
- `xoch-make` when stale docs reveal implementation gaps
- `xoch-glossary` when terminology needs formal definition
- `xoch-map` when docs need local dependency/project mapping

## Output

End with:

```text
Documentation status: [current | updated | not impacted | stale | waived | unknown]
Targets: [paths]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

- Docs describe the system as it works now.
- Prefer updating the narrowest useful documentation target.
- Use glossary terminology when available.
- Do not invent source behavior that was not verified.
- Do not move active legacy job folders during the migration.
