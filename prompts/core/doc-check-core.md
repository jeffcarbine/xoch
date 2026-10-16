---
name: xoch-doc-check-core
description: Full reference workflow for xoch-doc's decision phase
---

# Xoch - Doc Check Core

This is the full reference workflow for `xoch-doc`'s decision phase. It is rendered to `~/.xoch/prompts/core/doc-check-core.md` and is not installed as a command.

Decide whether a drifted change needs README-level documentation, and where. When writing is actually needed, read and follow `~/.xoch/prompts/core/doc-write-core.md` for the write itself, then return here to record status and route.

`doc` is Xoch's documentation command. It replaces the old split between app initialization, feature initialization, and validation prompts. It is also a required stop after `xoch-do`'s `final_review` step passes, not only an on-demand command.

## Purpose

Keep README and Xoch documentation current-state oriented. `xoch-doc` may create missing docs, refresh stale docs, repair inaccurate docs, validate documentation freshness before `xoch-do`'s `final_review` step or `xoch-close`, or apply the version bump and changelog entry the spec's Version Impact calls for.

## Scope

`xoch-doc` may work with:

- root `README.md`
- feature READMEs
- the project's version field and changelog, when the spec records a Version Impact
- job documentation targets from the `state` file returned by `job evidence`

It should not turn documentation into an append-only changelog.

## Work Model

When a job is active:

{{xoch-partial:job-evidence.md}}

For target-model jobs, documentation targets may appear in the `state`, `spec`, and `review` files it returns.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Documentation Goal

Ask or infer whether the engineer wants to:

- create missing project or feature docs
- refresh docs after implementation
- validate docs before `xoch-do`'s `final_review` step or `xoch-close`
- repair stale or inaccurate docs

If the goal is unclear, ask for the documentation target.

### Step 2: Load Existing Context

{{xoch-partial:context-economy.md}}

Read only what is needed:

- relevant README files
- job state/spec/plan/review when active
- source files needed to verify current behavior

{{xoch-partial:budget-check.md skill="doc"}}

### Step 3: Validate Current State

Compare documentation against source and job evidence:

- what exists now
- what changed
- what docs claim
- what docs omit
- terminology mismatches
- stale setup, command, or workflow references
- risks that should be documented

Decide whether the change needs README-level documentation at all, not just where it would go. A change already communicated adequately by its own tests, JSDoc, or inline comments does not automatically need a README update too -- apply the same README -> tests -> source hierarchy used for reading unfamiliar code, but for this decision: check whether the narrower, already-existing documentation (tests describing the behavior, JSDoc on the changed function, an inline comment explaining a non-obvious choice) already covers what a reader would need, before deciding a README needs to change as well. When it does, record "not impacted" rather than writing documentation that would just restate what tests/JSDoc/comments already say.

### Step 4: Resolve Documentation Target

For each changed path that does need a documentation decision, resolve its target:

```bash
xoch docs-target resolve --path "[changed path]" --json
```

When the result's `sibling` is `true`, the resolved README sits directly beside the changed path -- proceed without asking.

When `sibling` is `false`, the resolution reached into an ancestor directory or fell back to the root `README.md`. This is ambiguous enough to need engineer confirmation before writing.

For a single ambiguous resolution, ask:

```text
[changed path] resolved to a non-sibling README: [target] ([reason]). [U]se this README, or [G]enerate a new sibling README?
```

For multiple ambiguous resolutions in one pass, show them as a single numbered list and accept a compact batch reply:

```text
Some documentation targets are ambiguous:

1. [path-1] -> [target-1] ([reason-1])
2. [path-2] -> [target-2] ([reason-2])

For each, [U]se this README or [G]enerate a new sibling README (e.g. "1G, 2U"):
```

Parse a compact batch reply (`1G, 2U, 3G`) by matching each number to its listed item in order. A reply that omits or mis-numbers an item is a blocking question, not something to guess at.

### Step 5: Write When Needed

If Steps 3-4 determined documentation writing is needed, read and follow:

```text
~/.xoch/prompts/core/doc-write-core.md
```

Return here once the write is complete (or was explicitly deferred) to record status and route. If no writing is needed, continue directly to Step 6.

### Step 6: Apply Version Impact

When a job is active, read the spec's `## Version Impact` section. If it is missing or `none`, skip this step. Otherwise, once documentation is settled:

1. Bump the project's version by the recorded level (`patch`, `minor`, or `major`) in `package.json`, or the project's equivalent version source (`pyproject.toml`, `Cargo.toml`, a `VERSION` file, and so on). Edit the version field only; do not run publish or release commands.
2. If the project has a changelog (`CHANGELOG.md` or the project's equivalent), add an entry for the new version at the top in the file's existing format, summarizing the job's user-visible changes from the spec. Do not create a changelog the project doesn't have.
3. Note the new version, and the changelog entry when one was added, in the detail recorded in Step 7.

If the version source is ambiguous (for example, several manifests with versions), ask the engineer which to bump before editing.

### Step 7: Record Documentation Status

When a job is active, record one of:

- current
- updated
- not impacted
- stale
- waived
- unknown

For target-model jobs, always record it in job state -- `xoch job close` refuses a standard job until it is set:

```bash
xoch state set --job "[job-id]" --field documentation_status --value "[status]"
```

Then add any detail (which targets, what changed, why waived) to the relevant job file returned by `job evidence`: `notes_dir` or `review`.

For legacy migration jobs, record equivalent notes in the legacy job folder when useful.

### Step 8: Route

Recommend:

- `xoch-pr` when a pull request draft is needed next
- `xoch-close` when docs are ready for closure and no PR draft is needed
- `xoch-do` (its `final_review` step) when docs were requested ahead of an upcoming review
- `xoch-do` when stale docs reveal implementation gaps
- `xoch-map` when docs need local dependency/project mapping

After documentation writes, status notes, accepted baselines, and multi-project synchronization are complete, finish the managed workflow before final output or an explicitly chained command:

```bash
xoch workflow complete --job "[job-id]" --name xoch-doc --next "[recommended or explicitly invoked command]"
```

## Output

End with:

```text
Documentation status: [current | updated | not impacted | stale | waived | unknown]
Targets: [paths]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

- Docs describe the system as it works now.
- Prefer updating the narrowest useful documentation target.
- Use nested `README.md` files for feature-local documentation.
- Do not invent source behavior that was not verified.
- Do not move active legacy job folders during the migration.
- A `sibling: false` resolution always gets explicit engineer confirmation before writing; never assume `[U]` or `[G]` on the agent's own judgment.
