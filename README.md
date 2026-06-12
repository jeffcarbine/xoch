# Xoch - Spec-Driven Development

**Open-source, prompt-first development workflow**

Xoch is a lightweight workflow system for AI-assisted software work. It keeps durable project knowledge in readable documentation, tracks focused task work in local Xoch state, and guides engineers through a clear lifecycle from opening a task to closing it.

---

## Core Ideas

- **Docs describe now** - READMEs and Xoch docs explain the current system.
- **Specs describe change** - Task specs capture what should change and why.
- **Plans create phases** - Work is broken into reviewable implementation phases.
- **Tasks stay focused** - Each task owns its spec, plan, phases, snapshots, review, and closure notes.
- **Arcs group tasks** - Optional arcs reference related tasks without nesting task folders.
- **Engineers stay in control** - Agents guide, implement, and review, but destructive actions and release choices remain engineer-owned.

---

## Quick Start

```bash
git clone https://github.com/jeffcarbine/xoch.git
cd xoch
./install.sh
```

Verify installation:

```text
#xoch-meow
```

In Codex:

```text
$xoch-meow
```

---

## Core Workflow

```text
open -> spec -> plan -> make -> next -> review -> close
```

| Step | Command | Purpose |
|---|---|---|
| 1 | `xoch-open` | Open or resume a task. |
| 2 | `xoch-spec` | Capture requirements and acceptance criteria. |
| 3 | `xoch-plan` | Create the implementation approach and phases. |
| 4 | `xoch-make` | Implement or guide the current phase. |
| 5 | `xoch-next` | Review the current phase and advance. |
| 6 | `xoch-review` | Verify acceptance, quality, tests, and docs. |
| 7 | `xoch-close` | Close the task and clear active work. |

Use `xoch-make` and `xoch-next` repeatedly until all phases are complete.

### Phase Rhythm

`xoch-make` is where implementation happens. It loads the current phase, confirms ownership, performs or guides the work, and records validation evidence.

`xoch-next` is the phase checkpoint. It compares the phase plan to the working tree, asks about manual or external changes, writes a phase snapshot, and advances only after engineer confirmation.

After the final phase, `xoch-review` checks acceptance coverage, quality, risk, test evidence, and documentation freshness. `xoch-close` expects a passing review, but the engineer may explicitly waive review or documentation gaps for lightweight work; waivers are recorded in task state and closure notes.

---

## Supporting Commands

| Command | Purpose |
|---|---|
| `xoch-open-arc` | Open an optional arc grouping related tasks. |
| `xoch-revise-arc` | Revise arc purpose, notes, or task membership. |
| `xoch-close-arc` | Close an arc when its related tasks are complete. |
| `xoch-revise-spec` | Revise a task's foundational requirements. |
| `xoch-revise-plan` | Revise a task's implementation plan or remaining phases. |
| `xoch-doc` | Create, refresh, or repair project and feature documentation. |
| `xoch-map` | Maintain lightweight local project/dependency map context. |
| `xoch-trace` | Investigate root cause for bugs or unclear symptoms before changing code. |
| `xoch-patch` | Use a focused path for small or urgent fixes. |
| `xoch-pause` | Pause the active task. |
| `xoch-resume` | Resume paused or archived work. |
| `xoch-sidebar` | Explore a related question without advancing task state. |
| `xoch-glossary` | Add or update project terminology. |
| `xoch-meow` | Verify installation. |

---

## Project Structure

Xoch uses `.xoch/` for workflow state and project knowledge:

```text
your-project/
  README.md
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

### Tasks, Phases, And Arcs

- A **task** is the primary unit of work.
- A **phase** is an implementation slice inside a task.
- An **arc** is an optional grouping of related tasks.

Tasks live under `.xoch/work/tasks/`. Arcs live under `.xoch/work/arcs/` and reference task IDs; task folders are not nested inside arc folders.

Arc files are intentionally small:

```text
.xoch/work/arcs/[arc-id]/
  state.md
  tasks.md
  notes.md
  close.md
  revisions/
```

`tasks.md` is the membership list. It can group task IDs as active, planned, complete, or parked. If a task belongs to an arc, its task `state.md` should use `arc: [arc-id]`, but the task folder still stays under `.xoch/work/tasks/`.

### Task State

Each task has a `state.md` file that records the active workflow state:

```text
.xoch/work/tasks/[task-id]/state.md
```

Typical state includes the task ID, title, optional arc, current status, current phase, documentation targets, key decisions, risks, and the recommended next command.

New work should use `.xoch/work/`. Older migration-era tasks may still exist under `.xoch/context/`; Xoch prompts should not move those legacy tasks unless the engineer explicitly asks.

### Revision Commands

Use revision commands when foundational work changes:

- `xoch-revise-spec` changes what success means: requirements, acceptance criteria, scope, constraints, or documentation targets.
- `xoch-revise-plan` changes how the work will proceed: implementation approach, phase order, validation, or remaining phase scope.
- `xoch-revise-arc` changes the larger grouping: purpose, task membership, arc status, or shared arc notes.

Revision notes live under each task or arc `revisions/` folder and explain why the foundational artifact changed.

---

## Gitignore Choices

Choose what your team wants to share:

```gitignore
# Local-only Xoch state
/.xoch/work/

# Share project docs and glossaries
!.xoch/docs/
!.xoch/glossaries/
```

For solo work, ignoring all of `.xoch/` is also valid.

---

## Token Management

Xoch prompts estimate file reads with:

```bash
bin/tokenEstimator.sh --batch file1 file2
```

Prompts use token budgets to keep context intentional. Engineers may override budgets when doing so is worth the extra context.

## Support Workflows

`xoch-doc` is the unified documentation command. It can create missing docs, refresh stale docs, validate docs before review/close, or maintain `.xoch/docs/` packets such as `CODEBASE.md`, `PATTERNS.md`, `DEPENDENCIES.json`, `RISKS.md`, `TESTING.md`, and `FEATURES.md`.

`xoch-map` records local project and dependency relationships without creating synchronized multi-project task state. Use it for lightweight orientation: local paths, package names, service relationships, validation commands, and docs targets.

`xoch-trace` investigates unclear symptoms before implementation. It records evidence, hypotheses, confidence, root cause, and the recommended next command.

`xoch-patch` is for small, bounded fixes. If the patch grows beyond a narrow change, switch to `xoch-open` or revise the active task.

---

## Documentation

- [prompts/README.md](prompts/README.md) - Command inventory and prompt behavior.
- [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) - System model and workflow design.
- [docs/XOCH_REPFLOW_EVOLUTION_PLAN.md](docs/XOCH_REPFLOW_EVOLUTION_PLAN.md) - Reference plan for this workflow evolution.
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidance.

---

## Troubleshooting

**Prompt not found:** Run `./install.sh` and restart the AI tool.

**No current task:** Run `xoch-open`.

**Docs feel stale:** Run `xoch-doc`.

---

## License

MIT License - See [LICENSE](LICENSE).
