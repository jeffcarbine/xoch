---
name: xoch-roadmap
description: Show current Xoch job progress and upcoming phase contents
---

# Xoch - Roadmap

{{xoch-partial:workflow-boundary.md}}

Show where the active job stands and what remains without changing job, phase, workflow, git, or documentation state.

## Process

### Step 1: Identify Current Work

Use the result already returned by:

```bash
~/.xoch/bin/xoch-actions.sh job current --json
```

If no job is active, say so and route to `xoch-open-job` or `xoch-resume`.

If a managed workflow is active, report its name, stage, pending action, artifact, and return command before phase information. Roadmap is read-only and does not finish or abandon that workflow.

{{xoch-partial:project-routing.md}}

### Step 2: Load Compact Job State

{{xoch-partial:job-evidence.md}}

For target-model jobs, read `state` first. Use its phase index, current-phase fields, status, risks, unresolved questions, and next command when they are sufficient.

For legacy jobs, use the existing tracker and milestone files in place without migrating them.

{{xoch-partial:context-economy.md}}

### Step 3: Load Remaining Phase Details

Read only the current and upcoming sections of `phases` (from Step 2's `job evidence` call) or `current_phase_body`. Do not reread completed snapshots, the full spec, or the full plan unless compact state and phase sections cannot explain the roadmap accurately.

For each remaining phase, capture:

- phase number and title
- status
- goal or description
- owning project when multi-project
- files or areas marked for work
- acceptance criteria
- validation expectations
- dependencies or blockers

Keep completed phases compact: number, title, and completion status are usually enough.

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

- Roadmap is observational only.
- Do not edit job files, pointers, workflow state, source, docs, or git.
- Do not mark phases complete or advance them.
- Prefer compact state and targeted phase sections over broad rereads.
- Never hide an active managed workflow behind phase status.
