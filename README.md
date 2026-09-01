# Xoch

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
./install.js
```

Verify installation:

```text
#xoch-meow
```

In Codex:

```text
$xoch-meow
```

In Claude Code:

```text
/xoch-meow
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

After the final phase, `xoch-review` checks acceptance coverage, quality, risk, test evidence, and documentation freshness. A passing review always routes to `xoch-doc` next — documentation is a required stop, not an optional detour — which routes onward to `xoch-pr` or directly to `xoch-close-job`. `xoch-close-job` confirms `xoch-doc` has run before proceeding; a documentation waiver may still exist, but only as something `xoch-doc` itself recorded. `xoch-close-job` expects a passing review, but the engineer may explicitly waive review for lightweight work; waivers are recorded in job state and closure notes.

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
| `xoch-pr` | Generate an evidence-backed pull request title and body for the active job. |
| `xoch-map` | Maintain the local workspace map and resolve project dependencies. |
| `xoch-roadmap` | Show current progress and the contents of remaining phases. |
| `xoch-discovery` | Resolve material unknowns before specification or implementation. |
| `xoch-trace` | Investigate root cause for bugs or unclear symptoms before changing code. |
| `xoch-patch` | Use a focused path for small or urgent fixes. |
| `xoch-pause` | Pause the active job. |
| `xoch-resume` | Resume paused or archived work. |
| `xoch-sidebar` | Explore a related question without advancing job state. |
| `xoch-help` | List every Xoch command with its description. |
| `xoch-meow` | Verify installation. |

---

## Project Structure

Xoch uses `.xoch/` for workflow state and project knowledge:

```text
your-project/
  README.md
  .xoch/
    work/
      current.json
      jobs/
        job-id/
          state.md
          projects.json        # multi-project jobs only
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
      dependencies.json        # optional project-name contracts
      OVERVIEW.md
      ARCHITECTURE.md
      SETUP.md
      TESTING.md
      CONVENTIONS.md
```

Prompt source files can also use reusable partials:

```text
xoch/
  prompts/
    partials/
      action-choice.md
      engineer-git-rule.md
      next-step.md
      project-routing.md
      workflow-boundary.md
      managed-workflow.md
```

During installation, Xoch renders top-level prompt files into `~/.xoch/prompts/` and installs from that rendered prompt cache. Files under `prompts/partials/` are fragments only; they are not installed as commands. `action-choice.md` standardizes engineer ownership choices, and `next-step.md` standardizes next-command routing.

### Jobs, Phases, And Arcs

- A **job** is the primary unit of work.
- A **phase** is an implementation slice inside a job.
- An **arc** is an optional grouping of related jobs.

Jobs live under `.xoch/work/jobs/`. Arcs live under `.xoch/work/arcs/` and reference job IDs; job folders are not nested inside arc folders.

### Storage Location

By default, Xoch job/arc state lives inside the repository under `.xoch/work/`. Set `storage.mode` to `centralized` to move it entirely outside the repository instead, under `~/.xoch/projects/<project-slug>/work/` (the slug is derived from the repository's directory name). See [bin/README.md](bin/README.md#configjs) for the `config.js` commands that set it, and for `~/.xoch/config.json`'s full shape.

Centralized mode leaves zero files in the repo — not even a gitignored `.xoch/` folder. The setting is global and applies to every project; there is no per-project override, and no automatic migration when switching modes. Missing or invalid config falls back to the default in-repo behavior.

Resolve the active root directly with `~/.xoch/bin/xoch-actions.js config root`, or read the `directory` field from `job current --json` for a specific job's location. Every `.xoch/work/...` path shown elsewhere in this document is relative to that resolved root, not necessarily the repository.

### Active Pointer And Workflows

`.xoch/work/current.json` is machine-owned runtime state. It identifies the active job and, when present, one managed side workflow with its stage, pending wrap-up action, artifact, and return command. Agents query it through:

```bash
~/.xoch/bin/xoch-actions.js job current --json
```

Do not edit the pointer manually. `state.md` keeps durable phase and workflow fields; the helper projects active workflow state into `current.json` and migrates older target-model `current.md` pointers when encountered.

Discovery, sidebar, trace, documentation, and map work use managed workflow actions. A new command cannot silently replace unfinished wrap-up work. An explicitly chained command may continue only after the pending workflow artifact/state is finalized and `workflow complete` succeeds.

### Multi-Project Jobs

A job may span multiple repositories. `projects.json` is created only for those jobs and records one primary project plus one or more participants. The primary job folder owns canonical specs, plans, phases, snapshots, notes, review, and closure state. Participant repositories receive guarded mirrors of those job artifacts.

Source code, git history, validation, and the active pointer remain project-specific and are never synchronized between repositories. Xoch never copies implementation source between projects. Participant context synchronization refuses to overwrite independently modified mirrors.

Machine-local project paths live in `~/.xoch/workspace-map.json`. Shareable dependency names and contracts may live in `.xoch/docs/dependencies.json`; absolute paths must not.

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

New work should use the resolved Xoch storage root's `work/` directory (see [Storage Location](#storage-location)). Older migration-era jobs may still exist under `.xoch/context/` (always repository-local, unaffected by the storage-location setting); Xoch prompts should not move those legacy jobs unless the engineer explicitly asks.

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

# Share project docs
!.xoch/docs/
```

For solo work, ignoring all of `.xoch/` is also valid.

If `storage.mode` is set to `centralized` (see [Storage Location](#storage-location)), none of this is needed — job/arc state lives entirely under `~/.xoch/projects/<project-slug>/`, so there's nothing under `.xoch/work/` in the repo to ignore in the first place.

---

## Token Management

Xoch prompts estimate file reads with:

```bash
~/.xoch/bin/token-estimator.js --batch file1 file2
```

Prompts use installed helper scripts under `~/.xoch/bin/` so they do not depend on the current project containing Xoch's source `bin/` directory. Engineers may override budgets when doing so is worth the extra context.

Deterministic workflow actions live in:

```bash
~/.xoch/bin/xoch-actions.js
```

Prompts prefer this helper for static file and state operations such as opening jobs/arcs, reading the current job, setting state fields, clearing pointers, creating snapshots, and advancing phase state. Agents should still use judgment for specs, plans, reviews, summaries, and scope decisions.

All helper filenames use kebab-case. See [bin/README.md](bin/README.md) for every installed helper's full usage, including `config.js`, which lives at the repo root alongside them conceptually.

Per-skill read budgets live in `~/.xoch/config.json`'s `tokenBudgets` map (default: spec 5,000 tokens, plan 7,000 tokens, 5,000 for anything else unlisted), seeded on install and editable with `node config.js budgets` or `node config.js set tokenBudgets.<skill> <value>`. Xoch should not reread files when this conversation already contains enough current context; it should prefer search, diffs, symbol snippets, and targeted line ranges before full-file reads.

Before full-file reads beyond active Xoch pointer/state files, Xoch should run `token-estimator.js budget check --skill <skill> --files [files...]` against the candidate files and report the estimate. A FAIL result is a hard stop: reading past budget is not a judgment call the agent makes on its own -- it requires an explicit waiver from the engineer.

For repeated phase work, `state.md` should act as the compact index: current phase title, goal, likely files, acceptance criteria, validation expectations, and a short phase index. Full `phases.md`, `plan.md`, and `spec.md` remain authoritative, but prompts should read them by section or only when state/prior context is insufficient.

Long workflow explanations live in `~/.xoch/prompts/core/`. Command prompts stay short and should only load core references when the current agent lacks Xoch context or exact artifact/rule details.

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

`xoch-doc` is the unified documentation command. It can create missing docs, refresh stale docs, validate docs before `xoch-review` or `xoch-close-job`, or maintain `.xoch/docs/` packets. Packets are flexible, project-shaped source chunks for the root README; examples include `OVERVIEW.md`, `ARCHITECTURE.md`, `SETUP.md`, `TESTING.md`, `CONVENTIONS.md`, `RISKS.md`, or whatever packet set the engineer approves. Feature-local documentation should usually live in a nested `README.md` beside the relevant code.

`xoch-map` maintains the machine-local workspace map and resolves repo-owned dependency declarations. `xoch-open-job` uses confirmed map entries when creating an optional multi-project `projects.json` scope.

`xoch-roadmap` is a read-only progress view. It summarizes the active workflow, current phase, completed phases, upcoming phase goals/files/acceptance, risks, and the actual next command without modifying state.

`xoch-discovery` combines engineer knowledge, local resources, external documentation, targeted research, and clearly labeled model background knowledge to resolve unknowns before they become requirements. Accepted findings live in job `notes/` and normally route back to `xoch-spec` or `xoch-revise-spec`.

`xoch-trace` investigates unclear symptoms before implementation. It records evidence, hypotheses, confidence, root cause, and the recommended next command.

`xoch-patch` is for small, bounded fixes. If the patch grows beyond a narrow change, switch to `xoch-open-job` or revise the active job.

---

## Documentation

- [prompts/README.md](prompts/README.md) - Command inventory and prompt behavior.
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidance.

---

## Troubleshooting

**Prompt not found:** Run `./install.js` and restart the AI tool.

**No current job:** Run `xoch-open-job`.

**Docs feel stale:** Run `xoch-doc`.

---

## License

MIT License - See [LICENSE](LICENSE).

[^1]: It is also the name of my cat, which is short for Xochi which is in turn short for Xochitl which means "flower" in Nahuatl. She's a little shadow and will just appear next to you from out of the blue, so it seemed like the perfect name for an assistant who follows you around while you work.
