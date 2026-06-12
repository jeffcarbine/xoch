---
name: xoch-sidebar
description: Explore a related question without advancing Xoch task state
---

# Xoch - Sidebar

Explore a related question or tangent while preserving the current task state.

## Purpose

Load enough task context to orient the discussion, answer the engineer's question, and leave phase/task progress unchanged.

## Process

### Step 1: Detect Current Task

Read:

```text
.xoch/work/current.md
```

If absent, check `.xoch/context/current.md` for a legacy migration task.

If no active task exists, continue without Xoch task context.

### Step 2: Load Context

For target-model tasks, read:

- `state.md`
- `spec.md`
- `plan.md`
- `phases.md`

For legacy tasks, read the matching legacy files.

### Step 3: Summarize Current Work

Summarize:

- task ID and title
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
bin/tokenEstimator.sh --batch [files...]
```

### Step 5: Return Guidance

When the sidebar appears complete, remind the engineer of the likely return command:

- `xoch-make` to continue implementation
- `xoch-next` to review/advance the current phase
- `xoch-revise-plan` if the sidebar changed the plan

## Rules

- Do not change task progress.
- Do not mark phases complete.
- If the sidebar changes requirements, route to `xoch-revise-spec`.
- If the sidebar changes implementation structure, route to `xoch-revise-plan`.
