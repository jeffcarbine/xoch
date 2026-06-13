# Xoch Prompts

Prompt source files live in this directory. Each installable top-level markdown file becomes an `xoch-*` command.

`README.md` is documentation only and is not installed as a command.

Reusable prompt fragments live under `prompts/partials/`. They are rendered into top-level prompts during installation and are never installed as commands.

---

## Invocation

```text
GitHub Copilot / Cursor: #xoch-[name]
Codex:                  $xoch-[name]
```

---

## Core Workflow

```text
open-job -> spec -> plan -> make -> next -> review -> close-job
```

| Command | Purpose | Primary Output |
|---|---|---|
| `open-job` | Open or resume job work. | `.xoch/work/current.md`, job `state.md` |
| `spec` | Capture requirements, acceptance criteria, and job-versus-arc fit. | job `spec.md` |
| `plan` | Create implementation approach and phases after confirming spec shape. | job `plan.md`, `phases.md` |
| `make` | Implement or guide current phase work. | source changes, test evidence |
| `next` | Review current phase and advance. | phase snapshot, updated job state |
| `review` | Verify acceptance, quality, tests, and documentation freshness. | job `review.md` |
| `close-job` | Close completed job work. | job `closure.md`, cleared current pointer |

Use `make` and `next` repeatedly until all phases are complete.

`review` is the expected gate before `close-job`. `close-job` can continue with explicit engineer waivers for review or documentation gaps, but those waivers must be recorded.

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
| `doc` | Create, refresh, repair, or validate project, feature, and `.xoch/docs/` documentation. |
| `map` | Maintain lightweight local project/dependency map context. |
| `trace` | Investigate defects or unclear symptoms before changing code. |
| `patch` | Handle focused small or urgent fixes. |
| `pause` | Pause the active job. |
| `resume` | Resume paused or archived work. |
| `sidebar` | Explore a related question without advancing job state. |
| `glossary` | Add or update project terminology. |
| `meow` | Verify Xoch installation. |

---

## Current Source Inventory

Installable prompt files should match the command inventory above. Documentation files and partial fragments must not be installed as commands.

Expected top-level prompt files:

```text
close-arc.md
close-job.md
doc.md
glossary.md
make.md
map.md
meow.md
next.md
patch.md
pause.md
plan.md
resume.md
review.md
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

Use `action-choice.md` when a prompt asks who should perform the next action. Use `next-step.md` for command routing at the end of a prompt. Rendered prompts should use the consistent phrasing:

```text
How would you like to proceed? [E]ngineer builds, [A]gent builds, or [C]ollaborate?
Ready for next step: `xoch-next`
```

Use `accept-or-modify.md` when a prompt drafts foundational artifacts such as specs or plans before writing them. Rendered prompts should ask:

```text
Do you want to [A]ccept the spec, or do you have any [M]odifications?
```

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
- remove stale installed `xoch-*` commands whose source prompt no longer exists
- render prompt partials before installing prompts for Copilot or Codex
- fail if rendered prompts contain unresolved partial markers
