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

**Installing:**

```bash
npm i -g @jeffcarbine/xoch
xoch init
```

`npm i -g @jeffcarbine/xoch` installs the package globally; `xoch init` copies the skills into your AI tool's directory. To confirm the install worked, run `/xoch-meow` in your agent.

**Uninstalling:**

```bash
xoch remove
npm uninstall -g @jeffcarbine/xoch
```

`npm uninstall` alone won't clean up the skill files `xoch init` copied into each AI tool's directory or `~/.xoch`'s runtime state. Run `xoch remove` first to remove those too.

**Setup:**

```bash
xoch config
```

Walks through the default configuration: storage location, coverage strictness, git behavior, and token budgets. See [Configuration](#configuration).

Optionally, open your agent in each directory that contains projects you intend to work in and run:

```text
/xoch-map
```

This builds a map of where your projects live, so Xoch can resolve cross-project dependencies and do cross-project work without tracking projects down every time.

---

## Concepts

- A **job** is the primary unit of work: one feature, fix, or QA pass, with its own spec and plan.
- A **phase** is an implementation slice inside a job. Jobs advance one phase at a time.
- An **arc** is an optional grouping of related jobs.

Xoch has two interfaces:

- **Skills** (`/xoch-open`, `/xoch-do`, ...) are typed to your AI agent. They drive the workflow.
- **The CLI** (`xoch config`, `xoch job current`, ...) is typed in your shell. Skills call it to read and write Xoch's files; you mostly need it for install and configuration.

---

## Core Workflow

### Standard Jobs

A standard job guides an engineer through building a feature. Open one by describing the work:

```text
/xoch-open New Button Variation
  We are adding a new variation to our buttons for when a user...
```

`xoch-open` also reopens a closed job when given its ID plus new work, and a bare `/xoch-open` searches for paused, archived, or otherwise unfinished work to resume.

```text
xoch-open -> xoch-do (once per phase) -> xoch-doc -> xoch-close
```

| Step | Command | Purpose |
|---|---|---|
| 1 | `xoch-open` | Start, reopen, or resume a job; define its spec and acceptance criteria and generate the phase plan. |
| 2 | `xoch-do` | Do whatever the current step calls for: implement and advance each phase, then run the final review. |
| 3 | `xoch-doc` | Verify or refresh documentation, and apply any version bump the spec calls for. |
| 4 | `xoch-close` | Close the job. Refuses, with a list of what's unmet, until every closing gate passes. |

`xoch-pr` can run between `xoch-doc` and `xoch-close` to draft an evidence-backed pull request title and body.

`xoch-do` moves through three steps:

- **`implement`** -- performs or guides the current phase's work and records validation evidence.
- **`advance`** -- compares the work to the phase plan, handles git per `git.behavior` (by default asking: [G]enerate a commit message, [C]ommit, commit and [P]ush, or [N]othing), writes a phase snapshot, and advances after you confirm. Each new phase starts with a fresh `xoch-do`.
- **`final_review`** -- once every phase is complete, checks acceptance coverage, quality, risk, test evidence, and documentation, then routes to `xoch-doc`.

### Arcs

When several jobs are related, describe them together and `xoch-open` sets up an arc first:

```text
/xoch-open
  We are going to be working on a number of components related to the user...
```

Xoch may also recommend an arc when a proposed job's scope is large; you can accept or decline. If a standalone job is already active, arc setup can add it to the new arc.

While a project has an active arc, jobs opened with `xoch-open` are added to it. Arc jobs follow the standard rhythm, with `xoch-next` to move from one job to the next:

```text
xoch-open -> xoch-do -> xoch-doc -> xoch-next -> xoch-do -> ... -> xoch-close
```

| Step | Command | Purpose |
|---|---|---|
| 1 | `xoch-open` | Set up the arc and its planned jobs, or add another job to it. |
| 2 | `xoch-do` | Implement, advance, and review the current job, as for a standard job. |
| 3 | `xoch-doc` | Verify or refresh the current job's documentation. |
| 4 | `xoch-next` | Close the current job (with every closing gate) and open the arc's next planned job. |
| 5 | `xoch-close` | Close the last job, then the arc. |

When no planned jobs remain, `xoch-next` routes to `xoch-close` and notes that the arc can be closed.

### QA Jobs

A QA job exercises a running feature against a planned set of test cases instead of building one:

```text
/xoch-qa
  We added a new button variation that needs to be tested...
```

```text
xoch-qa -> xoch-do (once per QA phase, then the report) -> xoch-close
```

| Step | Command | Purpose |
|---|---|---|
| 1 | `xoch-qa` | Record what's being tested, confirm the environment, and plan phases of test cases. |
| 2 | `xoch-do` | Run each phase's cases, patch narrow failures on the spot, then write the QA report. |
| 3 | `xoch-close` | Close the job and hand off deferred failures. |

- **Intake.** You must confirm the target is `dev` or `staging` -- production is refused, and phase 1 can't start without the confirmation. Xoch also records which capabilities the agent has (browser, HTTP requests, shell); phases needing one it lacks are run by you or collaboratively, with step-by-step instructions.
- **Phases.** Each case is recorded as `pass`, `fail`, `blocked`, or `skipped` with evidence. Failures are sorted into **patch now** (narrow, clearly understood) and **defer** (anything larger), and you confirm the grouping. Patched failures are re-tested with the original input; the original failure stays on record.
- **Report.** `qa-report.md` covers results, patched failures, deferred failures with reproduction steps and severity, and coverage gaps. Xoch then asks `[P]atch`, `[O]pen a job`, or `[N]othing needed` for the deferred failures.
- **Close.** Skips the review, coverage, and documentation gates. `[P]` hands deferred failures to `xoch-patch`; `[O]` leaves a handoff that the next `xoch-open` offers as its starting requirements.

---

## Supporting Commands

| Command | Purpose |
|---|---|
| `xoch-revise` | Revise a job's spec, its plan, both, or an arc, behind an accept/modify gate. |
| `xoch-doc` | Create, refresh, or validate project and feature documentation; apply version bumps and changelog entries. |
| `xoch-pr` | Draft an evidence-backed pull request title and body for the active job. |
| `xoch-discovery` | Resolve unknowns before they become requirements, from engineer knowledge, local resources, and research. |
| `xoch-trace` | Investigate the root cause of a bug or unclear symptom before changing code. |
| `xoch-patch` | Make a small, bounded fix without the full spec/plan lifecycle. |
| `xoch-conventions` | Generate the project's documented coding conventions, or validate files against them. |
| `xoch-roadmap` | Show progress and remaining phases without changing anything. |
| `xoch-map` | Maintain the local workspace map and resolve cross-project dependencies. |
| `xoch-sidebar` | Explore a related question without advancing job state. |
| `xoch-pause` | Pause the active job; resume it later with `xoch-open`. |
| `xoch-help` | List every Xoch command with its description. |

See [prompts/README.md](prompts/README.md) for each command's full behavior.

**Handoffs.** When `xoch-discovery`, `xoch-trace`, or `xoch-qa` produce findings that should become a new job, they leave a handoff. `xoch-open` offers pending handoffs as source requirements and claims the ones it uses, so the same findings are never picked up twice.

**Versioning.** The spec records a version impact (`none`, `patch`, `minor`, or `major`) when the job opens. After review passes, `xoch-doc` bumps the version and adds a changelog entry if the project keeps one. Xoch never publishes or releases.

**Conventions.** `xoch-conventions` records the coding conventions reviewers enforce but linters don't, mining them from review history (or inferring them from existing code) for you to accept, modify, or drop. Once a project has them, planning, implementation, and patches follow the rules matching the files they touch, and the final review checks every changed file. Findings are advisory by default; `conventions.strictness required` makes unresolved findings against `confirmed` rules block review. Projects without a conventions document are unaffected.

**Multi-project jobs.** A job may span several repositories mapped with `xoch-map`. One primary project owns the spec, plan, and review; participants receive guarded mirrors of those artifacts. Source code, git history, and validation stay with each repository and are never copied between them.

---

## Configuration

Settings live in `~/.xoch/config.json` and are edited with `xoch config` (interactive) or `xoch config set KEY VALUE`:

- **`storage.mode`** -- where Xoch keeps its files: `centralized` (default, `~/.xoch/projects/<project-slug>/`) or `in-repo` (`.xoch/` inside each repository). Switching moves every known repo's data, previewing first and changing nothing on a collision.
- **`coverage.strictness`** -- whether the 100%-coverage gate blocks closing a job (`required`) or reports gaps for you to accept (`recommended`, default).
- **`conventions.strictness`** -- whether conventions findings block review (`required`) or are advisory (`recommended`, default).
- **`git.behavior`** -- what `xoch-do`'s `advance` step does with git changes: ask (default), generate a message, commit, push, or nothing.
- **`tokenBudgets.<skill>`** -- per-skill read budgets that keep the agent from loading more context than a step needs. Reading past a budget requires your explicit waiver. Review them with `xoch config budgets`.

See [bin/README.md](bin/README.md#configjs) for every value and the file's full shape.

---

## Where Files Live

Xoch keeps workflow state and project knowledge in its storage root, `[xoch-root]` (run `xoch config root` to print it):

```text
[xoch-root]/
  work/
    current.json             # the active job pointer
    jobs/
      [job-id]/
        state.json
        phases.json
        projects.json        # multi-project jobs only
        spec.md
        plan.md
        review.md
        qa-report.md         # QA jobs only
        closure.md
        conventions-check.md
        snapshots/
        notes/
        revisions/
    arcs/
      [arc-id]/
        state.json
        jobs.json
        notes.md
        closure.md
        revisions/
    patches/
  handoffs/
  discoveries/
  docs/
    dependencies.json        # optional project dependency declarations
    conventions.md           # optional coding conventions
```

These files are read and written through Xoch's helpers, which validate every change. Don't edit the JSON files by hand. Prose files (specs, plans, notes) are plain markdown and safe to read.

---

## Documentation

- [prompts/README.md](prompts/README.md) - Command inventory, prompt behavior, and partials.
- [bin/README.md](bin/README.md) - CLI helpers and configuration reference.
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidance.

---

## License

MIT License - See [LICENSE](LICENSE).

[^1]: Pronounced "SO-chee." It is also the name of my cat. Hence the ASCII cat on a keyboard.
