---
name: xoch-sidebar
description: Explore a related question without advancing Xoch job state
---

# Xoch - Sidebar

Explore a related question or tangent while preserving the current job state.

## Purpose

Load enough job context to orient the discussion, answer the engineer's question, and leave phase/job progress unchanged.

## Process

### Step 1: Detect Current Job

Read:

```text
.xoch/work/current.md
```

If absent, check `.xoch/context/current.md` for a legacy migration job.

If no active job exists, continue without Xoch job context.

### Step 2: Load Context

{{xoch-partial:context-economy.md}}

For target-model jobs, read:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md`

For legacy jobs, read the matching legacy files.

### Step 3: Summarize Current Work

Summarize:

- job ID and title
- optional arc
- current phase
- goal
- progress
- next command

Make clear that sidebar does not advance phase state.

### Step 4: Explore The Question

Ask what the engineer wants to explore, then answer normally.

For code or documentation reads, use token estimation when the read is broad:

```bash
~/.xoch/bin/token-estimator.sh --batch [files...]
```

### Step 5: Return Guidance

When the sidebar appears complete, remind the engineer of the likely return command:

- `xoch-make` to continue implementation
- `xoch-next` to review/advance the current phase
- `xoch-revise-plan` if the sidebar changed the plan

End with:

```text
Sidebar complete.
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Do not change job progress.
- Do not mark phases complete.
- If the sidebar changes requirements, route to `xoch-revise-spec`.
- If the sidebar changes implementation structure, route to `xoch-revise-plan`.
