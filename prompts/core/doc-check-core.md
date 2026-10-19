---
name: xoch-doc-check-core
description: Full reference workflow for xoch-doc's decision phase
---

# Xoch - Doc Check Core

The decision phase of `xoch-doc`: decide whether a change needs README-level documentation and where, apply the spec's Version Impact, record documentation status, and route. When writing is needed, follow `~/.xoch/prompts/core/doc-write-core.md`, then return here.

`xoch-doc` may:

- create missing project or feature docs
- refresh stale docs or repair inaccurate ones
- validate documentation freshness before `xoch-do`'s `final_review` or `xoch-close`
- apply the version bump and changelog entry the spec's Version Impact calls for

Its scope is the root `README.md`, feature READMEs, the project's version field and changelog (when the spec records a Version Impact), and job documentation targets.

When a job is active:

{{xoch-partial:job-evidence.md}}

Documentation targets may appear in the `state`, `spec`, and `review` files it returns.

{{xoch-partial:project-routing.md}}

## Process

### Step 1: Identify Documentation Goal

Ask or infer whether the engineer wants to create, refresh, validate, or repair docs. If the goal is unclear, ask for the documentation target.

### Step 2: Load Existing Context

{{xoch-partial:context-economy.md}}

Read only what is needed: relevant README files, job state/spec/plan/review when active, and source files needed to verify current behavior.

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

Decide whether the change needs README-level documentation at all. If existing narrower documentation (tests describing the behavior, JSDoc on the changed function, an inline comment on a non-obvious choice) already covers what a reader needs, record "not impacted" instead of restating it in a README.

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

If Steps 3-4 determined writing is needed, read and follow:

```text
~/.xoch/prompts/core/doc-write-core.md
```

Return here once the write is complete or explicitly deferred. If no writing is needed, continue to Step 6.

### Step 6: Apply Version Impact

When a job is active, read the spec's `## Version Impact` section. If it is missing or `none`, skip this step. Otherwise, once documentation is settled:

1. Bump the version by the recorded level (`patch`, `minor`, or `major`) in `package.json` or the project's equivalent version source (`pyproject.toml`, `Cargo.toml`, a `VERSION` file, and so on). Edit the version field only; do not run publish or release commands.
2. If the project has a changelog (`CHANGELOG.md` or equivalent), add an entry for the new version at the top, in the file's existing format, summarizing the job's user-visible changes from the spec. Do not create a changelog the project does not have.
3. Note the new version, and the changelog entry when added, in the detail recorded in Step 7.

If the version source is ambiguous (for example, several manifests with versions), ask the engineer which to bump before editing.

### Step 7: Record Documentation Status

When a job is active, record one of `current`, `updated`, `not impacted`, `stale`, `waived`, or `unknown` in job state. `xoch job close` refuses a standard job until it is set:

```bash
xoch state set --job "[job-id]" --field documentation_status --value "[status]"
```

Add any detail (which targets, what changed, why waived) to `notes_dir` or `review` from `job evidence`.

When the status is `current`, `updated`, or `not impacted`, write a fresh drift baseline so the next `xoch-doc` checks only later changes:

```bash
xoch docs-drift baseline
```

Do not write it for `stale`, `waived`, or `unknown`; that drift is still outstanding and must stay visible to the next check.

### Step 8: Route

Recommend:

- `xoch-pr` when a pull request draft is needed next
- `xoch-close` when docs are ready for closure and no PR draft is needed
- `xoch-do` (its `final_review` step) when docs were requested ahead of an upcoming review
- `xoch-do` when stale docs reveal implementation gaps
- `xoch-map` when docs need local dependency/project mapping

After documentation writes, status notes, accepted baselines, and multi-project sync are complete, finish the managed workflow before final output or an explicitly chained command:

```bash
xoch workflow complete --job "[job-id]" --name xoch-doc --next "[recommended or explicitly invoked command]"
```

## Output

End with:

```text
Documentation status: [current | updated | not impacted | stale | waived | unknown]
Targets: [paths]
[routing line]
```

The routing line is `{{xoch-partial:next-step-choice.md command_a="xoch-pr" command_b="xoch-close"}}` when docs are ready and the engineer has not stated which they want; otherwise `{{xoch-partial:next-step.md command="[recommended command]"}}`.

## Rules

{{xoch-partial:response-ending.md}}

- Docs describe the system as it works now; never turn them into an append-only changelog.
- Prefer updating the narrowest useful documentation target.
- Use nested `README.md` files for feature-local documentation.
- Do not invent source behavior that was not verified.
- A `sibling: false` resolution always gets explicit engineer confirmation before writing; never assume `[U]` or `[G]`.
