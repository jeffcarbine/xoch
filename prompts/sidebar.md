---
name: xoch-sidebar
description: Explore a related question without advancing Xoch job state
---

# Xoch - Sidebar

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-sidebar" pending="continue_sidebar"}}

Explore a related question or tangent with enough job context to orient the discussion, leaving job and phase progress unchanged.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Detect Current Job

Use the `xoch job current --json` result from the workflow boundary. If no job is active, continue without Xoch job context.

### Step 2: Load Context

{{xoch-partial:context-economy.md}}

{{xoch-partial:job-evidence.md}}

Read job state, `spec`, `plan`, and phases (`xoch phase get --job "[job-id]" --json`) as the question needs.

### Step 3: Summarize Current Work

Summarize the job ID and title, arc (if any), current phase, goal, progress, and next command. Make clear that the sidebar does not advance phase state.

### Step 4: Explore The Question

Ask what the engineer wants to explore, then answer normally.

{{xoch-partial:budget-check.md skill="sidebar"}}

### Step 5: Return Guidance

When the sidebar appears complete, remind the engineer of the likely return command:

- `xoch-do` to continue implementation or review/advance the current phase
- `xoch-revise` if the sidebar changed the spec or plan

Before the final output or an explicitly chained command, complete the sidebar workflow:

```bash
xoch workflow complete --job "[job-id]" --name xoch-sidebar --next "[recommended or explicitly invoked command]"
```

End with:

```text
Sidebar complete.
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Do not change job progress or mark phases complete.
- If the sidebar changes requirements or implementation structure, route to `xoch-revise`.
