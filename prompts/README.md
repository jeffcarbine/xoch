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
open -> do -> doc -> close
```

| Command | Purpose | Primary Output |
|---|---|---|
| `open` | Open a fresh job, reopen a closed one, set up an arc, or resume paused/archived work -- then carry it through `spec` and `plan`. | `.xoch/work/current.json`, job `state.md`, `spec.md`, `plan.md`, `phases.md` |
| `do` | Do whatever the current step calls for: implement the current phase, review and advance it, and run the final quality-gate review once every phase is done. | source changes, test evidence, phase snapshots, job `review.md` |
| `doc` | Create, refresh, repair, or validate docs; a required stop after a passing review. | updated docs, recorded documentation status |
| `close` | Close a completed job or an arc. | job `closure.md`, cleared current pointer |

Bundled commands track their position with `current_step` in job state, not with which command was last typed:

- `open` runs `title` -> `spec` -> `plan` continuously in one invocation, each behind its own accept/modify gate, and stops when entering phase 1.
- `do` runs `implement` -> `advance` within one phase in one invocation, then stops at each phase boundary. Once every phase is done, the next `do` runs `final_review`.

Run `do` repeatedly until every phase is complete and the final review passes.

`plan` may mark a phase `**Type**: Checkpoint` when several phases must land together before the engineer can tell whether they actually work. A checkpoint phase carries no implementation of its own: `do` routes it to a live-verification flow instead of the normal ownership/implementation steps -- the engineer exercises everything built so far and collaborates directly on any corrections, with no `revise` ceremony and no amending already-completed phase snapshots. `xoch phase advance --next-type` is what carries the type from `phases.md` into job state.

`do`'s `final_review` step is the expected gate before `close`. A passing review always routes to `doc` next — documentation is a required stop, not an optional detour — and `doc` may route onward to `pr` or directly to `close`. `close` confirms `doc` has run before proceeding; a documentation waiver may still exist, but only as something `doc` itself recorded. `close` can continue with an explicit engineer waiver for review, and any such waiver must be recorded.

---

## Arcs

Arcs are an optional grouping for related jobs. There are no arc-only commands; the regular commands handle arcs:

| Command | Arc behavior |
|---|---|
| `open` | Set up an arc (optionally adopting the active standalone job), or open a job inside one -- listing it as Active in the arc's `jobs.md`. |
| `next` | Close the active arc job, then open the arc's next Planned job, in one pass. Every closing gate still applies; refuses for standalone jobs or when nothing is Planned. |
| `revise` | Arc mode updates arc purpose, status, notes, risks, documentation targets, or job membership. |
| `close` | Close a job (marking it Complete in its arc's `jobs.md`), or close an arc once its jobs are complete, moved, or parked. |

Arcs reference job IDs. They do not contain nested job folders. `xoch arc job-move` keeps `jobs.md`'s Active/Planned/Complete/Parked sections in step.

`open`'s `spec` step recommends setting up an arc when work appears too broad for one focused job.

---

## Revision Command

| Command | Purpose |
|---|---|
| `revise` | Revise a job's spec (requirements, acceptance criteria, scope, constraints, documentation targets), its plan (approach, phase order, validation strategy, remaining phases), both, or an arc. |

`revise` infers which applies, confirms it, and flows through the needed steps in one invocation -- spec before plan when both change -- each behind its own accept/modify gate. Revisions preserve prior history and record why foundational artifacts changed.

---

## Support Commands

| Command | Purpose |
|---|---|
| `pr` | Generate an evidence-backed pull request title and body for the active job. |
| `map` | Maintain the local workspace map and resolve project dependencies. |
| `roadmap` | Show active workflow, current progress, and upcoming phase contents without changing state. |
| `discovery` | Resolve material product, domain, API, design, or implementation unknowns. |
| `trace` | Investigate defects or unclear symptoms before changing code. |
| `patch` | Handle focused small or urgent fixes. |
| `pause` | Pause the active job. Resume it later with `open`. |
| `sidebar` | Explore a related question without advancing job state. |
| `help` | List every Xoch command with its description. |
| `meow` | Verify Xoch installation. |

---

## Current Source Inventory

Installable prompt files should match the command inventory above. Documentation files and partial fragments must not be installed as commands.

Expected top-level prompt files:

```text
close.md
discovery.md
do.md
doc.md
help.md
map.md
meow.md
next.md
open.md
patch.md
pause.md
pr.md
revise.md
roadmap.md
sidebar.md
trace.md
```

Expected partial files:

```text
partials/accept-or-modify.md
partials/action-choice.md
partials/arc-context.md
partials/arc-evidence.md
partials/behavior-tests.md
partials/budget-check.md
partials/context-economy.md
partials/coverage-gate.md
partials/current-phase-context.md
partials/engineer-git-rule.md
partials/estimator-reminder.md
partials/job-evidence.md
partials/managed-workflow.md
partials/next-step-choice.md
partials/next-step.md
partials/phase-boundary.md
partials/project-routing.md
partials/response-ending.md
partials/state-phase-index.md
partials/workflow-boundary.md
partials/xoch-file-helper-rule.md
```

Expected core reference files, named for the step they implement rather than the command that reads them:

```text
core/advance-core.md          do: advance step
core/close-arc-core.md        close: arc mode
core/close-job-core.md        close: job mode (also run by next)
core/discovery-core.md
core/doc-check-core.md
core/doc-write-core.md
core/foundation-core.md
core/implement-core.md        do: implement step
core/open-core.md             open: entry modes and title step (also run by next)
core/plan-core.md             open: plan step
core/review-core.md           do: final_review step
core/revise-arc-core.md       revise: arc step
core/revise-plan-core.md      revise: plan step
core/revise-spec-core.md      revise: spec step
core/spec-core.md             open: spec step
core/trace-core.md
core/workflow-boundary-core.md
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

A prompt file may also select text by the engineer's own config, resolved once at render time instead of the agent reading `~/.xoch/config.json` itself mid-conversation:

```text
{{xoch-config:documentation.commentMode always="Apply inline documentation unconditionally." follow-convention="Match the target project's existing convention." default="Apply inline documentation unconditionally."}}
```

`key` is a dotted path into `~/.xoch/config.json` (e.g. `coverage.strictness`); each other assignment names one possible resolved value and the text to substitute for it, with an optional `default="..."` used when the key is unset or doesn't match any listed value. The installer fails on a malformed marker, an invalid key, or a resolved value with no matching text and no `default=`. `{{xoch-config:...}}` runs after `{{xoch-partial:...}}` substitution, over the whole partial-expanded string, so a config marker nested inside a partial's own body still resolves.

Rendered prompts are written to `~/.xoch/prompts/` and installed from there.

Core reference prompts are rendered to `~/.xoch/prompts/core/`. Token-light wrapper prompts such as `discovery.md`, `trace.md`, and `doc.md` should only tell the agent to read core prompts when workflow details are missing. Bundled wrappers pick which core file to read from state or the engineer's message rather than always reading the same one: `open.md` and `do.md` by `current_step`, `close.md` and `revise.md` by mode, and `next.md` by composing `close-job-core.md` then `open-core.md`.

Use `action-choice.md` when a prompt asks who should perform the next action. Use `next-step.md` for command routing at the end of a prompt. Rendered prompts should use the consistent phrasing:

```text
How would you like to proceed? [E]ngineer does, [A]gent does, or [C]ollaborate?
Ready for next step: `xoch-do`
```

Use `accept-or-modify.md` when a prompt drafts foundational artifacts such as specs or plans before writing them. Rendered prompts should ask:

```text
Do you want to [A]ccept the spec, or do you have any [M]odifications?
```

Use `next-step-choice.md` instead of `next-step.md` when the next command is genuinely ambiguous between two options and shouldn't be asserted as a single definitive routing line. Rendered prompts stay in the `Ready for next step: ...` family -- naming both valid commands, not a lettered action choice, since neither option runs in-session:

```text
Ready for next step: `xoch-pr` | `xoch-close`
```

Use `response-ending.md` in prompt rules to keep final responses ordered. Summaries, files, snapshots, notes, and caveats should come before the last line; the last line should be either a text-game choice or `Ready for next step: ...`.

Use `phase-boundary.md` in phase commands. It tells agents that `Ready for next step: ...` is a stop sign and that `do` must not roll into later phases without a fresh engineer invocation.

Use `context-economy.md` anywhere a prompt may decide which files to inspect. It keeps token budgets modest, avoids rereading files when current conversation context is sufficient, and prefers targeted snippets, search, and diffs before full-file reads.

Use `state-phase-index.md` in commands that repeatedly orient around the active phase. It keeps `state.md` useful as a compact current-phase index so agents do not need to reread full `spec.md`, `plan.md`, or `phases.md` on every `do` loop.

Use `project-routing.md` in commands that read or write active job artifacts. It routes optional multi-project jobs through their canonical primary context and requires guarded synchronization after shared writes.

Use `workflow-boundary.md` at the start of every stateful command. It queries `current.json` and, only when a workflow is actually active, reads `workflow-boundary-core.md` for the full protocol -- blocking silent workflow replacement and permitting explicitly chained commands only after pending wrap-up succeeds. `managed-workflow.md` gives discovery, sidebar, trace, doc, and map a common begin/resume/complete lifecycle.

Use `behavior-tests.md` in `implement-core.md`/`plan-core.md`. It sets the write-tests-first, confirm-red, coverage-backfill-is-different discipline. Use `coverage-gate.md` in `plan-core.md`/`review-core.md`/`close-job-core.md`/`patch.md`. It sets the 100%-by-default, non-waivable-outside-`xoch-patch` coverage rule and the narrow documented-exception mechanism for a branch proven both non-removable and non-fake-testable.

Use `xoch-file-helper-rule.md` in `spec-core.md`, `plan-core.md`, `revise-spec-core.md`, `revise-plan-core.md`, `trace-core.md`, and `implement-core.md`. It routes writes/edits of job-scoped `.xoch` artifacts through `xoch file write`/`file edit` instead of the Write/Edit tools, so repeated writes to new `.xoch` paths reuse one already-approved Bash command pattern instead of re-triggering per-path permission prompts.

## Multi-Project Jobs

Standalone jobs remain unchanged. Multi-project jobs add `.xoch/work/jobs/[job-id]/projects.json` with one primary project and one or more participants. The primary project owns canonical shared job artifacts; participant job folders are synchronized mirrors.

Prompts must:

- validate and query scope with `xoch project-scope`
- write job artifacts through the primary job directory
- tag plan tasks, files, validation, commits, and evidence by project
- synchronize with `xoch context-sync` after shared context writes
- keep source files, git operations, and active pointers repository-local
- stop when scope validation or synchronization fails

Machine-local paths belong in `~/.xoch/workspace-map.json`, maintained by `xoch workspace`. Shareable dependency declarations may use `.xoch/docs/dependencies.json` and resolve through `xoch dependency`.

## Prompt Style

Prefer concise imperative instructions. Keep command prompts focused on what the agent must do now. Put long templates, lifecycle explanations, and recovery details in `prompts/core/`; wrappers should point there only when the current agent lacks context.

Prefer installed helpers for deterministic mechanics. Use `xoch` for repeatable job, arc, pointer, snapshot, and phase-state actions instead of restating shell/YAML steps in prompts. Keep subjective work in prompts.

Helper filenames use kebab-case consistently. Deterministic helpers cover core state mechanics, README assembly, archives, acceptance coverage, project commands, git state, documentation routing, prompt validation, workspace mapping, dependency resolution, multi-project routing, and guarded context synchronization. See the root README helper inventory.

---

## Vocabulary

| Old / Borrowed Term | Xoch Term |
|---|---|
| milestone / wave | phase |
| start | open |
| build / implement / audit | do |
| finalize / ship | close |
| context | work or doc, depending on meaning |
| workspace | map |
| debug | trace |
| hotfix | patch |
| replan / respec | revise |
| epic | arc |

---

## Retired Command Names

Older command names were merged into the current set. `xoch init` removes their installed copies, and job state still naming one is rewritten to its replacement the next time it's read.

| Retired | Now |
|---|---|
| `open-job`, `open-arc`, `spec`, `plan`, `resume` | `open` |
| `build`, `make`, `review` | `do` |
| `next` (phase advance) | `do` (its `advance` step) |
| `revise-spec`, `revise-plan`, `revise-arc` | `revise` |
| `close-job`, `close-arc` | `close` |

`next` is a reused name: it used to advance a phase, and now moves an arc from one job to the next.

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
