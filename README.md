# Xoch - Spec-Driven Development

**Open-source, prompt-first development workflow**

Xoch is a lightweight workflow system for AI-assisted software work[^1]. It keeps durable project knowledge in readable documentation, tracks focused job work in local Xoch state, and guides engineers through a clear lifecycle from opening a job to closing it.

---

## Core Ideas

- **Docs describe now** - READMEs and Xoch docs explain the current system.
- **Specs describe change** - Job specs capture what should change and why.
- **Plans create phases** - Work is broken into reviewable implementation phases.
- **Jobs stay focused** - Each job owns its spec, plan, phases, snapshots, review, and closure notes.
- **Arcs group jobs** - Optional arcs reference related jobs without nesting job folders.
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
open-job -> spec -> plan -> make -> next -> review -> close-job
```

| Step | Command | Purpose |
|---|---|---|
| 1 | `xoch-open-job` | Open or resume a job. |
| 2 | `xoch-spec` | Capture requirements, acceptance criteria, and job-versus-arc fit. |
| 3 | `xoch-plan` | Create the implementation approach and phases after confirming the spec shape. |
| 4 | `xoch-make` | Implement or guide the current phase. |
| 5 | `xoch-next` | Review the current phase and advance. |
| 6 | `xoch-review` | Verify acceptance, quality, tests, and docs. |
| 7 | `xoch-close-job` | Close the job and clear active work. |

Use `xoch-make` and `xoch-next` repeatedly until all phases are complete.

### Phase Rhythm

`xoch-make` is where implementation happens. It loads the current phase, confirms ownership, performs or guides the work, and records validation evidence.

`xoch-next` is the phase checkpoint. It compares the phase plan to the working tree, asks about manual or external changes, writes a phase snapshot, and advances only after engineer confirmation.

After the final phase, `xoch-review` checks acceptance coverage, quality, risk, test evidence, and documentation freshness. `xoch-close-job` expects a passing review, but the engineer may explicitly waive review or documentation gaps for lightweight work; waivers are recorded in job state and closure notes.

---

## Supporting Commands

| Command | Purpose |
|---|---|
| `xoch-open-arc` | Open an optional arc grouping related jobs, optionally adopting the active standalone job. |
| `xoch-revise-arc` | Revise arc purpose, notes, or job membership. |
| `xoch-close-arc` | Close an arc when its related jobs are complete. |
| `xoch-revise-spec` | Revise a job's foundational requirements. |
| `xoch-revise-plan` | Revise a job's implementation plan or remaining phases. |
| `xoch-doc` | Create, refresh, or repair project and feature documentation. |
| `xoch-map` | Maintain lightweight local project/dependency map context. |
| `xoch-trace` | Investigate root cause for bugs or unclear symptoms before changing code. |
| `xoch-patch` | Use a focused path for small or urgent fixes. |
| `xoch-pause` | Pause the active job. |
| `xoch-resume` | Resume paused or archived work. |
| `xoch-sidebar` | Explore a related question without advancing job state. |
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

Prompt source files can also use reusable partials:

```text
xoch/
  prompts/
    partials/
      action-choice.md
      engineer-git-rule.md
      next-step.md
```

During installation, Xoch renders top-level prompt files into `~/.xoch/prompts/` and installs from that rendered prompt cache. Files under `prompts/partials/` are fragments only; they are not installed as commands. `action-choice.md` standardizes engineer ownership choices, and `next-step.md` standardizes next-command routing.

### Jobs, Phases, And Arcs

- A **job** is the primary unit of work.
- A **phase** is an implementation slice inside a job.
- An **arc** is an optional grouping of related jobs.

Jobs live under `.xoch/work/jobs/`. Arcs live under `.xoch/work/arcs/` and reference job IDs; job folders are not nested inside arc folders.

Arc files are intentionally small:

```text
.xoch/work/arcs/[arc-id]/
  state.md
  jobs.md
  notes.md
  closure.md
  revisions/
```

`jobs.md` is the membership list. It can group job IDs as active, planned, complete, or parked. If a job belongs to an arc, its job `state.md` should use `arc: [arc-id]`, but the job folder still stays under `.xoch/work/jobs/`.

`xoch-spec` should call out whether the work looks like one focused job or an arc candidate. If the work appears arc-sized, the agent should recommend `xoch-open-arc` before job planning. `xoch-open-arc` checks for an active standalone job and can add it to the new arc by reference; if that job already has a spec, the agent asks whether to infer the arc spec from the job spec or use engineer-provided arc metadata.

### Job State

Each job has a `state.md` file that records the active workflow state:

```text
.xoch/work/jobs/[job-id]/state.md
```

Typical state includes the job ID, title, optional arc, current status, current phase, documentation targets, key decisions, risks, and the recommended next command.

New work should use `.xoch/work/`. Older migration-era jobs may still exist under `.xoch/context/`; Xoch prompts should not move those legacy jobs unless the engineer explicitly asks.

### Revision Commands

Use revision commands when foundational work changes:

- `xoch-revise-spec` changes what success means: requirements, acceptance criteria, scope, constraints, or documentation targets.
- `xoch-revise-plan` changes how the work will proceed: implementation approach, phase order, validation, or remaining phase scope.
- `xoch-revise-arc` changes the larger grouping: purpose, job membership, arc status, or shared arc notes.

Revision notes live under each job or arc `revisions/` folder and explain why the foundational artifact changed.

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
~/.xoch/bin/tokenEstimator.sh --batch file1 file2
```

Prompts use installed helper scripts under `~/.xoch/bin/` so they do not depend on the current project containing Xoch's source `bin/` directory. Engineers may override budgets when doing so is worth the extra context.

Default budgets are intentionally modest: spec work uses about 5,000 tokens, plan work uses about 7,000 tokens, and glossary work uses about 5,000 tokens unless the engineer approves more. Xoch should not reread files when this conversation already contains enough current context; it should prefer search, diffs, symbol snippets, and targeted line ranges before full-file reads.

For repeated phase work, `state.md` should act as the compact index: current phase title, goal, likely files, acceptance criteria, validation expectations, and a short phase index. Full `phases.md`, `plan.md`, and `spec.md` remain authoritative, but prompts should read them by section or only when state/prior context is insufficient.

## Prompt Partials

Xoch prompts can include reusable fragments with:

```text
{{xoch-partial:engineer-git-rule.md}}
```

Partials live in `prompts/partials/`. The installer renders them into top-level prompts, validates that all partial markers are resolved, and keeps partial files out of the command inventory.

Workflow prompts use standard next-action language:

```text
How would you like to proceed? [E]ngineer builds, [A]gent builds, or [C]ollaborate?
Ready for next step: `xoch-next`
```

## Support Workflows

`xoch-doc` is the unified documentation command. It can create missing docs, refresh stale docs, validate docs before `xoch-review` or `xoch-close-job`, or maintain `.xoch/docs/` packets such as `CODEBASE.md`, `PATTERNS.md`, `DEPENDENCIES.json`, `RISKS.md`, `TESTING.md`, and `FEATURES.md`.

`xoch-map` records local project and dependency relationships without creating synchronized multi-project job state. Use it for lightweight orientation: local paths, package names, service relationships, validation commands, and docs targets.

`xoch-trace` investigates unclear symptoms before implementation. It records evidence, hypotheses, confidence, root cause, and the recommended next command.

`xoch-patch` is for small, bounded fixes. If the patch grows beyond a narrow change, switch to `xoch-open-job` or revise the active job.

---

## Documentation

- [prompts/README.md](prompts/README.md) - Command inventory and prompt behavior.
- [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) - System model and workflow design.
- [docs/XOCH_REPFLOW_EVOLUTION_PLAN.md](docs/XOCH_REPFLOW_EVOLUTION_PLAN.md) - Reference plan for this workflow evolution.
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidance.

---

## Troubleshooting

**Prompt not found:** Run `./install.sh` and restart the AI tool.

**No current job:** Run `xoch-open-job`.

**Docs feel stale:** Run `xoch-doc`.

---

## License

MIT License - See [LICENSE](LICENSE).

[^1]: It is also the name of my cat, which is short for Xochi which is in turn short for Xochitl which means "flower" in Nahuatl. She's a little shadow and will just appear next to you from out of the blue, so it seemed like the perfect name for an assistant who follows you around while you work.