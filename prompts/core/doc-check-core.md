---
name: xoch-doc-check-core
description: Full reference workflow for xoch-doc's decision phase
---

# Xoch - Doc Check Core

This is the full reference workflow for `xoch-doc`'s decision phase. It is rendered to `~/.xoch/prompts/core/doc-check-core.md` and is not installed as a command.

Decide whether a drifted change needs README-level documentation, and where. When writing is actually needed, read and follow `~/.xoch/prompts/core/doc-write-core.md` for the write itself, then return here to record status and route.

`doc` is Xoch's documentation command. It replaces the old split between app initialization, feature initialization, and validation prompts. It is also a required stop after a passing `xoch-review`, not only an on-demand command.

## Purpose

Keep README and Xoch documentation current-state oriented. `xoch-doc` may create missing docs, refresh stale docs, repair inaccurate docs, validate documentation freshness before `xoch-review` or `xoch-close-job`, or maintain lightweight `.xoch/docs/` packets that compose into the root README.

## Scope

`xoch-doc` may work with:

- root `README.md`
- feature READMEs
- `.xoch/docs/` packets
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
- validate docs before `xoch-review` or `xoch-close-job`
- repair stale or inaccurate docs
- create or refresh `.xoch/docs/` packets and merge them into the root README

If the goal is unclear, ask for the documentation target.

### Step 2: Load Existing Context

{{xoch-partial:context-economy.md}}

Read only what is needed:

- relevant README files
- job state/spec/plan/review when active
- docs packets related to the target
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
~/.xoch/bin/docs-target.js resolve --path "[changed path]" --json
```

When the result's `sibling` is `true`, the resolved README sits directly beside the changed path -- proceed without asking.

When `sibling` is `false`, the resolution reached into an ancestor directory or fell back to the root packet manifest. This is ambiguous enough to need engineer confirmation before writing.

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

### Step 6: Record Documentation Status

When a job is active, record one of:

- current
- updated
- not impacted
- stale
- waived
- unknown

For target-model jobs, update or append to the relevant job file returned by `job evidence`: `notes_dir`, `review`, `closure`.

For legacy migration jobs, record equivalent notes in the legacy job folder when useful.

### Step 7: Route

Recommend:

- `xoch-pr` when a pull request draft is needed next
- `xoch-close-job` when docs are ready for closure and no PR draft is needed
- `xoch-review` when docs were requested ahead of an upcoming review
- `xoch-make` when stale docs reveal implementation gaps
- `xoch-map` when docs need local dependency/project mapping

After documentation writes, status notes, accepted baselines, and multi-project synchronization are complete, finish the managed workflow before final output or an explicitly chained command:

```bash
~/.xoch/bin/xoch-actions.js workflow complete --job "[job-id]" --name xoch-doc --next "[recommended or explicitly invoked command]"
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
