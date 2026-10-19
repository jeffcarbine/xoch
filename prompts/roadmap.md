---
name: xoch-roadmap
description: Show current Xoch job progress and upcoming phase contents
---

# Xoch - Roadmap

{{xoch-partial:workflow-boundary.md}}

Show where the active job stands and what remains without changing job, phase, workflow, git, or documentation state.

## Process

### Step 1: Identify Current Work

Use the workflow boundary's `xoch job current --json` result. If no job is active, say so and route to `xoch-open`.

If a managed workflow is active, report its name, stage, pending action, artifact, and return command before phase information. Do not finish or abandon it.

{{xoch-partial:project-routing.md}}

### Step 2: Load Compact Job State

{{xoch-partial:job-evidence.md}}

Read `state` first. Use its phase index, current-phase fields, status, risks, unresolved questions, and next command when they are sufficient.

{{xoch-partial:context-economy.md}}

### Step 3: Load Remaining Phase Details

Read only the current and upcoming phases, one at a time with `xoch phase get --job "[job-id]" --phase [N] --json`. Do not reread completed snapshots, the full spec, or the full plan unless compact state and phase sections cannot explain the roadmap accurately.

For each remaining phase, capture its number and title, status, goal, owning project (multi-project), files or areas, acceptance criteria, validation expectations, and dependencies or blockers. Keep completed phases to number, title, and status.

### Step 4: Present Roadmap

Use this shape:

```markdown
## Job

- **Job:** [id] - [title]
- **Status:** [status]
- **Progress:** [completed]/[total] phases
- **Next command:** [command]

## Active Workflow

[Name, stage, pending action, and artifact, or "None"]

## Current Phase

### Phase [N] - [Title]

- **Goal:** [goal]
- **Projects:** [project names]
- **Files/areas:** [paths or areas]
- **Acceptance:** [AC IDs]
- **Validation:** [checks]
- **Blockers:** [blockers or none]

## Upcoming

| Phase | Status | Goal | Main Scope | Acceptance |
|---|---|---|---|---|
| [N+1] | Not started | [goal] | [files/areas] | [AC IDs] |

## Completed

- Phase [N-1] - [Title]

## Risks And Open Questions

- [risk/question or "None recorded"]
```

Omit empty sections and adapt naturally when implementation is complete, no phases exist, or the job is ready for review/closure.

## Output

End with the command that genuinely owns the next action. If a managed workflow is active, route back to that workflow; otherwise use job `next_command`:

```text
Ready for next step: `[command]`
```

## Rules

{{xoch-partial:response-ending.md}}

- Do not edit job files, pointers, workflow state, source, docs, or git, and do not mark phases complete or advance them.
- Never hide an active managed workflow behind phase status.
