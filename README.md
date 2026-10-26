```
  :-=-:                                       _
  =@@@@@+                                    | |
    :*@@@*                    __  _____   ___| |__
      :%@@*                   \ \/ / _ \ / __| '_ \
       .%@@*                   >  < (_) | (__| | | |
        :@@@*                 /_/\_\___/ \___|_| |_|
         :%@@%=
           *@@@#-                                                      .+:=..
            =%@@@#-                                                   -#@@#
             .+@@@@%+-:..  ...                              ==++++*##%@@@@%+++++
                =%@@@@@@@@@@@@@%%%#*++==-:::..     .::=**#**#+*##%@@@@@@@@@@#:::
                  -@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*.
                  .@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+:
                  *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#-.
                 :@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%*=:
                 -@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+
                 #@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@=
                +@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#.
              .%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*
             =%@@@@@@@@%#@@@@@@@@@=:-+=++*=:.......:@@@@@@@@@@@#
           -%@@@@@@%*=: :@@@@@@@+.                  +@@@@@@@@@@@#
         :*@@@@%*=:     :@@@@@%.                     %@@@-:+#@@@@@+.
         #@@@%-         =@@@@#.                      -@@@:   .-+%@@%.
         #@@+           %@@@@.                       .@@@:      .*@@%:
         #@@   ...::...:=@@@@*:::..:::::::::..::::::::%@@=.:::::..#@@@=:::::..:
         %@@= .:.:-=-----=#@@@%*+---=-=---=---=--=-=-==@@@*+==---.=%@@%:-::-:..:
         -%@@*:.:=-=-=====-+#@@@@@%*==-=-=--=-=-=--===-*@@@@%****:=+*@@-=:---:..
            .-.:++**#**=+=+==+##%%%#+=+====+==++=****===+:++**+*+=:*=**=*+++-=..
            ::.-##+==+****************************--****+.-+++++++:-*********+::
           .::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
```

# Xoch

**Open-source, AI-assisted development workflow**

Xoch is a lightweight workflow system for AI-assisted development work[^1]. It keeps durable project knowledge in readable documentation, tracks focused job work in local state files, and guides engineers through a clear lifecycle from opening a job to closing it.

---

## Quick Start

**Installing**

```bash
npm i -g @jeffcarbine/xoch
xoch config #optional
xoch init
```
`npm i -g @jeffcarbine/xoch` will install the package globally, but you need to run `xoch init` in order to copy the skills into your AI tool's directory. Optionally, `xoch config` will let you modify the configuration values from the defaults.

**Uninstalling:**

```bash
xoch remove
npm uninstall -g @jeffcarbine/xoch
```

`npm uninstall -g @jeffcarbine/xoch` alone won't clean up the skill files `xoch init` copied into each AI tool's directory or `~/.xoch`'s runtime state -- run `xoch remove` first to remove those too.

---

## Core Workflow

```text
xoch-open -> xoch-do -> xoch-doc -> xoch-close
```

| Step | Command | Purpose |
|---|---|---|
| 1 | `xoch-open` `xoch-qa` | Open a new job or arc, reopen a closed job, or resume paused/archived work, through an accepted plan. |
| 2 | `xoch-do` | Do whatever the current step calls for: implement, review, and advance each phase; once every phase is done, run the final review. |
| 3 | `xoch-doc` | Verify or refresh documentation freshness. |
| 4 | `xoch-close` `xoch-next` | Close the job (or an arc) through `xoch job close` / `xoch arc close`, which check every closing gate and refuse with the list of anything unmet. Alternatively, `xoch-next` closes the current job *and* advances to the next planned job in an arc, if applicable. |

### Phase Rhythm

`xoch-do` carries a job through phase work as three internal steps, tracked by `current_step` in job state rather than by which command was last typed:

- **`implement`** is where implementation happens. It marks the phase started (`xoch phase start`, recording the commit work begins from), loads the current phase, confirms ownership, performs or guides the work, and records validation evidence.
- **`advance`** is the phase checkpoint, reached automatically right after `implement` in the same response. It compares the phase plan to the working tree, handles git changes per `git.behavior` (by default asking: [G]enerate a commit message, [C]ommit, commit and [P]ush, or [N]othing), writes a phase snapshot, and advances only after engineer confirmation. Crossing into the next phase's `implement` step still requires a fresh `xoch-do` invocation.
- **`final_review`**, reached once every phase is complete, checks acceptance coverage, quality, risk, test evidence, and documentation freshness. A passing review always routes to `xoch-doc` next, which routes onward to `xoch-pr` or directly to `xoch-close`. `xoch job close` refuses until every phase is complete, the review status is `pass` or `pass_with_waivers`, and `xoch-doc` has recorded a documentation status; it then writes `closure.md`, clears the pointer, and completes the job in its arc.

### QA Jobs

A QA job exercises a running feature against a planned set of test cases instead of building one. It is an ordinary job with `job_type: qa`, opened by `xoch-qa` rather than `xoch-open`:

```text
xoch-qa -> xoch-do (once per QA phase, then the QA report) -> xoch-close
```

- **Open (`xoch-qa`).** `title` -> `intake` -> `plan`. Intake records what is being QA'd, requires the engineer to confirm the target is `dev` or `staging` (production is refused, and phase 1 cannot start without this confirmation), and records which capabilities the agent actually has: browser, HTTP requests, shell. The plan lays out ordered phases of cases, each with an ID (`QA-P[n]-[nnn]`), the exact input values, the expected result, and why the case is worth running. Phases that need a capability the agent lacks can only be run by the engineer or collaboratively, with step-by-step instructions.
- **Each phase (`xoch-do`).** The agent runs or hands off every case exactly as planned and records `pass`, `fail`, `blocked`, or `skipped` with evidence in `notes/qa-phase-[N].md`. It then sorts the failures into **patch now** (narrow, clearly understood fixes) and **defer** (anything larger), and the engineer confirms the grouping. Patch-now failures are fixed and re-tested on the spot by re-running the original case with the same input; the original failure stays on record. `advance` refuses to move on if any source change is not tied to a recorded patch.
- **Report (`xoch-do`'s `final_review`).** The agent writes `qa-report.md`: results per phase, failures patched during QA, deferred failures with reproduction steps and severity, and coverage gaps. It then asks `[P]atch`, `[O]pen a job`, or `[N]othing needed` for the deferred failures. A QA job never routes to `xoch-doc`.
- **Close (`xoch-close`).** Requires `qa-report.md` and the recorded decision, and skips the review, coverage, and documentation gates. A `[P]` decision hands the deferred failures to `xoch-patch`; an `[O]` decision leaves them as a pending handoff that the next `xoch-open` offers as its starting requirements, so the follow-up never overlaps an open QA job.

---

## Supporting Commands

| Command | Purpose |
|---|---|
| `xoch-revise` | Revise a job's spec, its plan, both, or an arc. |
| `xoch-doc` | Create, refresh, or repair project and feature documentation. |
| `xoch-pr` | Generate an evidence-backed pull request title and body for the active job. |
| `xoch-map` | Maintain the local workspace map and resolve project dependencies. |
| `xoch-roadmap` | Show current progress and the contents of remaining phases. |
| `xoch-discovery` | Resolve material unknowns before specification or implementation. |
| `xoch-trace` | Investigate root cause for bugs or unclear symptoms before changing code. |
| `xoch-patch` | Use a focused path for small or urgent fixes. |
| `xoch-pause` | Pause the active job. |
| `xoch-sidebar` | Explore a related question without advancing job state. |
| `xoch-help` | List every Xoch command with its description. |

---

## Project Structure

Xoch keeps workflow state and project knowledge in its storage root, `[xoch-root]` -- `~/.xoch/projects/<project-slug>/` by default, or `.xoch/` inside the repository with in-repo storage (see [Storage Location](#storage-location)):

```text
[xoch-root]/                 # ~/.xoch/projects/<project-slug>/ by default; <repo>/.xoch/ in-repo
  work/
    current.json
    jobs/
      job-id/
        state.json           # helper-owned: xoch state get/set/update
        phases.json          # helper-owned: xoch phase get/show/write/advance
        projects.json        # multi-project jobs only
        spec.md
        plan.md
        review.md
        closure.md
        snapshots/
        notes/
    arcs/
      arc-id/
        state.json           # helper-owned: xoch arc get/update
        jobs.json            # helper-owned: xoch arc get/job-move
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

During installation, Xoch renders top-level prompt files into `~/.xoch/prompts/` and installs from that rendered prompt cache. Files under `prompts/partials/` are fragments only; they are not installed as commands.

### Jobs, Phases, And Arcs

- A **job** is the primary unit of work.
- A **phase** is an implementation slice inside a job.
- An **arc** is an optional grouping of related jobs.

Jobs live under `[xoch-root]/work/jobs/`. Arcs live under `[xoch-root]/work/arcs/` and reference job IDs; job folders are not nested inside arc folders.

### Storage Location

By default, Xoch keeps job/arc state outside the repository, under `~/.xoch/projects/<project-slug>/` (the slug is derived from the repository's directory name, and the root records its repo in `repo.json`). Set `storage.mode` to `in-repo` to keep it inside each repository under `.xoch/` instead. See [bin/README.md](bin/README.md#configjs) for the `xoch config` commands that set it, and for `~/.xoch/config.json`'s full shape.

Switching modes with `xoch config set storage.mode` moves every known repo's Xoch data to where the new mode looks for it: repos from the workspace map, from centralized roots' `repo.json`, and from `--scan DIR`. It previews every move, refuses (changing nothing) on any collision, asks before moving unless `--yes`, undoes a move that fails partway, and changes the setting only once every move succeeded.

Resolve the active root directly with `xoch config root`, or read the `directory` field from `job current --json` for a specific job's location. Every `.xoch/work/...` path shown elsewhere in this document is relative to that resolved root, not necessarily the repository.

### Active Pointer And Workflows

`[xoch-root]/work/current.json` is machine-owned runtime state. It identifies the active job and, when present, one managed side workflow with its stage, pending wrap-up action, artifact, and return command. Agents query it through:

```bash
xoch job current --json
```

Don't edit the pointer manually. Job state (`state.json`) keeps durable phase and workflow fields; the helper projects active workflow state into `current.json`. Without a `current.json` there is no active job.

Discovery, sidebar, trace, documentation, and map work use managed workflow actions. A new command can't silently replace unfinished wrap-up work. An explicitly chained command may continue only after the pending workflow artifact/state is finalized and `workflow complete` succeeds.

### Multi-Project Jobs

A job may span multiple repositories. `projects.json` is created only for those jobs and records one primary project plus one or more participants. The primary job folder owns canonical specs, plans, phases, snapshots, notes, review, and closure state. Participant repositories receive guarded mirrors of those job artifacts.

Source code, git history, validation, and the active pointer remain project-specific and are never synchronized between repositories. Xoch never copies implementation source between projects. Participant context synchronization refuses to overwrite independently modified mirrors.

Machine-local project paths live in `~/.xoch/workspace-map.json`.

Arc files are intentionally small:

```text
[xoch-root]/work/arcs/[arc-id]/
  state.json
  jobs.json
  notes.md
  closure.md
  revisions/
```

`jobs.json` is the membership list. It groups job IDs as active, planned, complete, or parked. If a job belongs to an arc, its job state's `arc` field holds the arc ID, but the job folder still stays under `[xoch-root]/work/jobs/`. Opening a job in an arc lists it as Active, closing it moves it to Complete, and `xoch-next` moves the next Planned job to Active, all through `xoch arc job-move`. Read an arc's state and membership with `xoch arc get --arc ID --json`.

`xoch-open`'s `spec` step should call out whether the work looks like one focused job or an arc candidate. If the work appears arc-sized, it recommends setting up an arc before job planning. Arc setup checks for an active standalone job and can add it to the new arc by reference; if that job already has a spec, it asks whether to infer the arc spec from the job spec or use engineer-provided arc metadata.

### Job State

Each job has a `state.json` file that records the active workflow state:

```text
[xoch-root]/work/jobs/[job-id]/state.json
```

Structured job and arc files (`state.json`, `phases.json`, and an arc's `state.json`/`jobs.json`) are owned by Xoch's helpers, which validate every change before saving it. Read them with `xoch state get`, `xoch phase get`/`phase show`, and `xoch arc get`; change them with `xoch state set`/`state update`, `xoch phase write`/`phase advance`, `xoch arc update`, and `xoch arc job-move`. Don't edit them by hand. A phase's number is its position in `phases.json`.

Typical state includes the job ID, title, job type (`standard` or `qa`), optional arc, current status, current phase, documentation targets, key decisions, risks, and the recommended next command.

### Revising Foundations

Use `xoch-revise` when foundational work changes. It infers which kind of change this is, confirms it, and runs the matching steps in one invocation:

- **spec** changes what success means: requirements, acceptance criteria, scope, constraints, or documentation targets.
- **plan** changes how the work will proceed: implementation approach, phase order, validation, or remaining phase scope.
- **both** runs spec then plan, so the plan is revised against the updated definition of done.
- **arc** changes the larger grouping: purpose, job membership, arc status, or shared arc notes. It doesn't need an active job.

Each step presents its draft behind its own accept/modify gate before writing, and offers a follow-on step when a change crosses between a job and its arc.

Revision notes live under each job or arc `revisions/` folder and explain why the foundational artifact changed.

---

## Xoch Operations and Helpers

To keep Xoch files consistently formatted, a number of helpers are included that read, generate or modify the necessary Xoch files. These helpers are available through the Xoch CLI.

Prompts prefer the `xoch` CLI for static file and state operations such as opening jobs/arcs, reading the current job, setting state fields, clearing pointers, creating snapshots, and advancing phase state. Agents use judgment for specs, plans, reviews, summaries, and scope decisions.

Deterministic workflow actions (job/arc/state/pointer/snapshot/phase/file mechanics) live under the `job`, `state`, `arc`, `pointer`, `workflow`, `snapshot`, `phase`, and `file` namespaces, e.g. `xoch job open ...`, `xoch state set ...`, `xoch snapshot create ...`.

All helper filenames use kebab-case. See [bin/README.md](bin/README.md) for every namespace's full usage, including `xoch config`, which forwards to `config.js` at the repo root.

---

## Context & Token Management

Xoch prompts estimate file reads with:

```bash
xoch token-estimator --batch file1 file2
```

Engineers may override budgets when doing so is worth the extra context.

Per-skill read budgets live in `~/.xoch/config.json`'s `tokenBudgets` map (default: spec 5,000 tokens, plan 7,000 tokens, 5,000 for anything else unlisted), seeded on install and editable with `xoch config budgets` or `xoch config set tokenBudgets.<skill> <value>`. Xoch should not reread files when this conversation already contains enough current context; it should prefer search, diffs, symbol snippets, and targeted line ranges before full-file reads.

Before full-file reads beyond active Xoch pointer/state files, Xoch should run `token-estimator.js budget check --skill <skill> --files [files...]` against the candidate files and report the estimate. A FAIL result is a hard stop: reading past budget is not a judgment call the agent makes on its own, it requires an explicit waiver from the engineer.

For repeated phase work, job state (`xoch state get`) acts as the compact index: current phase title, goal, likely files, acceptance criteria, validation expectations, and a short phase index. Full `phases.json`, `plan.md`, and `spec.md` remain authoritative, but prompts should read them one phase or section at a time (`xoch phase get --phase N`), or only when state/prior context is insufficient.

Long workflow explanations live in `~/.xoch/prompts/core/`. Command prompts stay short and should only load core references when the current agent lacks Xoch context or exact artifact/rule details.

## Prompt Partials

Xoch prompts can include reusable fragments with:

```text
{{xoch-partial:engineer-git-rule.md}}
```

Partials live in `prompts/partials/`. The installer renders them into top-level prompts, validates that all partial markers are resolved, and keeps partial files out of the command inventory.

Workflow prompts use standard next-action language:

```text
How would you like to proceed? [E]ngineer does, [A]gent does, or [C]ollaborate?
Ready for next step: `xoch-do`
```

## Support Workflows

`xoch-doc` is the unified documentation command. It can create missing docs, refresh stale docs, validate docs before `xoch-do`'s `final_review` step or `xoch-close`, or apply the version bump and changelog entry a job's spec calls for. Repo-wide documentation lives in the root `README.md`; feature-local documentation should usually live in a nested `README.md` beside the relevant code.

Versioning is decided at open: the spec records a Version Impact (`none`, `patch`, `minor`, or `major`, with a reason, and whether the project keeps a changelog). After review passes, `xoch-doc` bumps the version in `package.json` (or the project's equivalent) and adds a changelog entry when the project has a changelog. It never publishes or releases.

`xoch-discovery`, `xoch-trace`, and `xoch-qa` leave a **handoff** when their outcome should become a new job: a JSON note under `[xoch-root]/handoffs/` with what should change and why. `xoch-open` lists pending handoffs, offers them as source requirements, and claims the ones it uses, so the same findings are never picked up twice (`xoch handoff write|list|get|claim`).

`xoch-map` maintains the machine-local workspace map and resolves repo-owned dependency declarations. `xoch-open` uses confirmed map entries when creating an optional multi-project `projects.json` scope.

`xoch-roadmap` is a read-only progress view. It summarizes the active workflow, current phase, completed phases, upcoming phase goals/files/acceptance, risks, and the actual next command without modifying state.

`xoch-discovery` combines engineer knowledge, local resources, external documentation, targeted research, and clearly labeled model background knowledge to resolve unknowns before they become requirements. Accepted findings live in a shared `[xoch-root]/discoveries/` directory, independent of any job, and normally route back to `xoch-open`'s `spec` step or `xoch-revise`'s spec step.

`xoch-trace` investigates unclear symptoms before implementation. It records evidence, hypotheses, confidence, root cause, and the recommended next command.

`xoch-patch` is for small, bounded fixes. If the patch grows beyond a narrow change, switch to `xoch-open` or revise the active job.

---

## Documentation

- [prompts/README.md](prompts/README.md) - Command inventory and prompt behavior.
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidance.

---

## License

MIT License - See [LICENSE](LICENSE).

[^1]: It is also the name of my cat, which is short for Xochi which is in turn short for Xochitl which means "flower" in Nahuatl. She's a little shadow and will just appear next to you from out of the blue, so it seemed like the perfect name for an assistant who follows you around while you work.
