# Xoch Prompts

Prompt source files live in this directory. Each installable top-level markdown file becomes an `xoch-*` command.

`README.md` is documentation only and is not installed as a command.

Reusable prompt fragments live under `prompts/partials/`. They are rendered into top-level prompts during installation and are never installed as commands.

Full reference prompts live under `prompts/core/`. They are rendered to `~/.xoch/prompts/core/` for on-demand loading and are never installed as commands.

---

## Invocation

```text
GitHub Copilot / Cursor: #xoch-[name]
Codex:                  $xoch-[name]
Claude Code:            /xoch-[name]
Kiro:                   #xoch-[name]
```

---

## Core Workflow

```text
open-job -> spec -> plan -> make -> next -> review -> close-job
```

| Command | Purpose | Primary Output |
|---|---|---|
| `open-job` | Open or resume job work. | `.xoch/work/current.json`, job `state.md` |
| `spec` | Capture requirements, acceptance criteria, and job-versus-arc fit. | job `spec.md` |
| `plan` | Create implementation approach and phases after confirming spec shape. | job `plan.md`, `phases.md` |
| `make` | Implement or guide current phase work. | source changes, test evidence |
| `next` | Review current phase and advance. | phase snapshot, updated job state |
| `review` | Verify acceptance, quality, tests, and documentation freshness. | job `review.md` |
| `close-job` | Close completed job work. | job `closure.md`, cleared current pointer |

Use `make` and `next` repeatedly until all phases are complete.

`review` is the expected gate before `close-job`. A passing review always routes to `doc` next — documentation is a required stop, not an optional detour — and `doc` may route onward to `pr` or directly to `close-job`. `close-job` confirms `doc` has run before proceeding; a documentation waiver may still exist, but only as something `doc` itself recorded. `close-job` can continue with an explicit engineer waiver for review, and any such waiver must be recorded.

---

## Arcs

| Command | Purpose |
|---|---|
| `open-arc` | Open an optional grouping for related jobs, optionally adopting the active standalone job. |
| `revise-arc` | Update arc purpose, status, notes, risks, or job membership references. |
| `close-arc` | Close an arc after its jobs are complete, moved by reference, or intentionally parked. |

Arcs reference job IDs. They do not contain nested job folders.

`spec` should recommend `open-arc` when work appears too broad for one focused job. `open-arc` checks for an active standalone job, can add it to the new arc's `jobs.md`, and asks whether to infer arc metadata from the active job spec when one exists.

---

## Revision Commands

| Command | Purpose |
|---|---|
| `revise-spec` | Update foundational requirements, acceptance criteria, scope, constraints, or documentation targets. |
| `revise-plan` | Update implementation approach, phase order, validation strategy, or remaining phases. |

Revision commands preserve prior history and record why foundational job artifacts changed.

---

## Support Commands

| Command | Purpose |
|---|---|
| `doc` | Create, refresh, repair, or validate project docs, feature READMEs, and flexible root README packets. |
| `pr` | Generate an evidence-backed pull request title and body for the active job. |
| `map` | Maintain the local workspace map and resolve project dependencies. |
| `roadmap` | Show active workflow, current progress, and upcoming phase contents without changing state. |
| `discovery` | Resolve material product, domain, API, design, or implementation unknowns. |
| `trace` | Investigate defects or unclear symptoms before changing code. |
| `patch` | Handle focused small or urgent fixes. |
| `pause` | Pause the active job. |
| `resume` | Resume paused or archived work. |
| `sidebar` | Explore a related question without advancing job state. |
| `meow` | Verify Xoch installation. |

---

## Current Source Inventory

Installable prompt files should match the command inventory above. Documentation files and partial fragments must not be installed as commands.

Expected top-level prompt files:

```text
close-arc.md
close-job.md
doc.md
discovery.md
make.md
map.md
meow.md
next.md
patch.md
pause.md
plan.md
pr.md
resume.md
review.md
roadmap.md
revise-arc.md
revise-plan.md
revise-spec.md
sidebar.md
spec.md
open-arc.md
open-job.md
trace.md
```

Expected partial files:

```text
partials/action-choice.md
partials/accept-or-modify.md
partials/engineer-git-rule.md
partials/next-step.md
partials/response-ending.md
partials/phase-boundary.md
partials/context-economy.md
partials/state-phase-index.md
partials/project-routing.md
partials/workflow-boundary.md
partials/managed-workflow.md
partials/behavior-tests.md
partials/coverage-gate.md
partials/xoch-file-helper-rule.md
```

Expected core reference files:

```text
core/foundation-core.md
core/discovery-core.md
core/doc-core.md
core/make-core.md
core/next-core.md
core/plan-core.md
core/revise-arc-core.md
core/revise-plan-core.md
core/revise-spec-core.md
core/spec-core.md
core/trace-core.md
```

---

## Partials

Top-level prompt files may include reusable fragments with:

```text
{{xoch-partial:engineer-git-rule.md}}
```

Partials can receive quoted variables:

```text
{{xoch-partial:example.md label="value"}}
```

Inside a partial, variables use `{{label}}`. The installer fails if a partial path is missing, escapes outside `prompts/partials/`, references an unset variable, or leaves unresolved `{{xoch-partial:...}}` markers in rendered prompts.

Rendered prompts are written to `~/.xoch/prompts/` and installed from there.

Core reference prompts are rendered to `~/.xoch/prompts/core/`. Token-light wrapper prompts such as `spec.md`, `plan.md`, `make.md`, `next.md`, `discovery.md`, `trace.md`, `doc.md`, and `revise-*.md` should only tell the agent to read core prompts when workflow details are missing.

Use `action-choice.md` when a prompt asks who should perform the next action. Use `next-step.md` for command routing at the end of a prompt. Rendered prompts should use the consistent phrasing:

```text
How would you like to proceed? [E]ngineer builds, [A]gent builds, or [C]ollaborate?
Ready for next step: `xoch-next`
```

Use `accept-or-modify.md` when a prompt drafts foundational artifacts such as specs or plans before writing them. Rendered prompts should ask:

```text
Do you want to [A]ccept the spec, or do you have any [M]odifications?
```

Use `response-ending.md` in prompt rules to keep final responses ordered. Summaries, files, snapshots, notes, and caveats should come before the last line; the last line should be either a text-game choice or `Ready for next step: ...`.

Use `phase-boundary.md` in phase commands. It tells agents that `Ready for next step: ...` is a stop sign and that `make`/`next` must not roll into later phases without a fresh engineer invocation.

Use `context-economy.md` anywhere a prompt may decide which files to inspect. It keeps token budgets modest, avoids rereading files when current conversation context is sufficient, and prefers targeted snippets, search, and diffs before full-file reads.

Use `state-phase-index.md` in commands that repeatedly orient around the active phase. It keeps `state.md` useful as a compact current-phase index so agents do not need to reread full `spec.md`, `plan.md`, or `phases.md` on every `make`/`next` loop.

Use `project-routing.md` in commands that read or write active job artifacts. It routes optional multi-project jobs through their canonical primary context and requires guarded synchronization after shared writes.

Use `workflow-boundary.md` at the start of every stateful command. It queries `current.json`, blocks silent workflow replacement, and permits explicitly chained commands only after pending wrap-up succeeds. `managed-workflow.md` gives discovery, sidebar, trace, doc, and map a common begin/resume/complete lifecycle.

Use `behavior-tests.md` in `make-core.md`/`plan-core.md`. It sets the write-tests-first, confirm-red, coverage-backfill-is-different discipline. Use `coverage-gate.md` in `plan-core.md`/`review.md`/`close-job.md`/`patch.md`. It sets the 100%-by-default, non-waivable-outside-`xoch-patch` coverage rule and the narrow documented-exception mechanism for a branch proven both non-removable and non-fake-testable.

Use `xoch-file-helper-rule.md` in `spec-core.md`, `plan-core.md`, `revise-spec-core.md`, `revise-plan-core.md`, `trace-core.md`, and `make-core.md`. It routes writes/edits of job-scoped `.xoch` artifacts through `xoch-actions.js file write`/`file edit` instead of the Write/Edit tools, so repeated writes to new `.xoch` paths reuse one already-approved Bash command pattern instead of re-triggering per-path permission prompts.

## Multi-Project Jobs

Standalone jobs remain unchanged. Multi-project jobs add `.xoch/work/jobs/[job-id]/projects.json` with one primary project and one or more participants. The primary project owns canonical shared job artifacts; participant job folders are synchronized mirrors.

Prompts must:

- validate and query scope with `project-scope.js`
- write job artifacts through the primary job directory
- tag plan tasks, files, validation, commits, and evidence by project
- synchronize with `context-sync.js` after shared context writes
- keep source files, git operations, and active pointers repository-local
- stop when scope validation or synchronization fails

Machine-local paths belong in `~/.xoch/workspace-map.json`, maintained by `workspace-actions.js`. Shareable dependency declarations may use `.xoch/docs/dependencies.json` and resolve through `dependency-actions.js`.

## Prompt Style

Prefer concise imperative instructions. Keep command prompts focused on what the agent must do now. Put long templates, lifecycle explanations, and recovery details in `prompts/core/`; wrappers should point there only when the current agent lacks context.

Prefer installed helpers for deterministic mechanics. Use `~/.xoch/bin/xoch-actions.js` for repeatable job, arc, pointer, snapshot, and phase-state actions instead of restating shell/YAML steps in prompts. Keep subjective work in prompts.

Helper filenames use kebab-case consistently. Deterministic helpers cover core state mechanics, README assembly, archives, acceptance coverage, project commands, git state, documentation routing, prompt validation, workspace mapping, dependency resolution, multi-project routing, and guarded context synchronization. See the root README helper inventory.

---

## Vocabulary

| Old / Borrowed Term | Xoch Term |
|---|---|
| milestone / wave | phase |
| start | open-job |
| build | make |
| advance | next |
| audit | review |
| finalize / ship | close-job |
| context | work or doc, depending on meaning |
| workspace | map |
| debug | trace |
| hotfix | patch |
| replan | revise-plan |
| respec | revise-spec |
| epic | arc |

---

## Installer Notes

The installer should:

- install only top-level prompt markdown files that are commands
- skip `prompts/README.md`
- skip `prompts/partials/` fragments
- render but do not install `prompts/core/` reference prompts
- remove stale installed `xoch-*` commands whose source prompt no longer exists
- render prompt partials before installing prompts for Copilot, Codex, Claude Code, or Kiro
- install Claude Code commands as user-invoked personal skills under `~/.claude/skills/`
- install Kiro commands as manual-inclusion steering files under `~/.kiro/steering/`
- fail if rendered prompts contain unresolved partial markers
