---
name: xoch-conventions-generate-core
description: Full reference workflow for xoch-conventions' generate mode
---

# Xoch - Conventions Generate Core

The generate mode of `xoch-conventions`: learn a project's coding conventions from evidence and record them in `$(xoch config root)/docs/conventions.md`, with the engineer approving every rule. Generate never edits code.

{{xoch-partial:context-economy.md}}

## Process

### Step 1: Load The Current Document

If `$(xoch config root)/docs/conventions.md` exists, this is a refresh: read it and keep its rule IDs, categories, and `retired_ids`.

### Step 2: Scan

```bash
xoch conventions scan --json
```

Pass `--base`, `--limit`, `--min-occurrences`, `--min-prs`, `--max-prs`, or `--include-bots` only when the engineer asks. Report `gh_available` and `gh_reason` in one line; when gh is unavailable, note that `gh auth login` adds merged-PR review comments as a signal.

### Step 3: Propose Rules From Signals

- `token_substitutions` -- each `from -> to` group is a candidate: use `to`, not `from`, where the swap applies.
- `review_comments` -- cluster comments asking for the same change. A cluster counts once it has at least `thresholds.min_occurrences` comments across at least `thresholds.min_prs` PRs.
- `fixup_commits` -- supporting evidence for the above; a candidate on its own only when the same kind of change repeats across units.

For each candidate:

- write one imperative statement
- set `scope` to the narrowest globs covering the evidence files; propose a rule with no scope (it applies everywhere) only when the evidence spans the repository, and say why
- `status: confirmed`, with `confidence` high, medium, or low by evidence strength
- `evidence` as counts only, e.g. `5 occurrences across 3 PRs` -- never names, logins, or quotes attributable to a person

Drop candidates a tool listed in `linters` already enforces (formatting, quotes, semicolons, import order, line length).

### Step 4: Offer The Code-Sample Fallback

After the signal-based proposals, offer rules inferred from code. Recommend it when Step 3 produced no candidates; the engineer may also ask for it directly.

```text
Add rules inferred from code samples? [Y]es / [N]o
```

On `[Y]`:

1. Rank files by change count from `git log [base] -n [commits_scanned] --name-only --format=`, keep only files that still exist, group them by top-level directory, and take the most-changed code files per area -- about 10 new reads in total. Skip lockfiles, generated files, docs, and fixtures. Files already read in this conversation count toward the sample without being read again.
2. {{xoch-partial:budget-check.md skill="conventions"}}
3. Propose only patterns that hold in most sampled files of an area: naming, module shape, error handling, test structure, comment density. Skip anything a linter enforces.
4. Mark every such rule `status: inferred`, `confidence: low` or `medium` (never `high`), with `evidence: observed in [N] of [M] sampled files`.

Never mark a code-sample rule `confirmed`. On a refresh, an existing `inferred` rule may become `confirmed` only when scan signals now support it and the engineer agrees.

### Step 5: Review Rule By Rule

Present proposals grouped by category. On a refresh, list existing rules first, each marked keep, change, or retire, then the new ones. For each new or changed rule ask:

```text
CV-[nnn]: [statement] -- [A]ccept, [M]odify, or [D]rop?
```

Batch the question per category when there are many. Before accepting a rule with no scope, ask whether a narrower scope fits. Keep the document at 40 rules or fewer; when over, drop the weakest-evidence rules first and say which.

With an active job, update the managed workflow with the pending write before the final confirmation.

### Step 6: Write The Document

- Kept and changed rules keep their IDs. New rules take the next unused number (`CV-001`, `CV-002`, ...).
- Every retired ID goes into `retired_ids` and is never reused.
- `analysis_range` is the oldest and newest SHAs from `git log [base] -n [commits_scanned] --format=%h`.

Write the whole file, creating `docs/` under the storage root if needed:

```markdown
---
generated: [today]
base_branch: [scan base]
analysis_range: [oldest sha]..[newest sha]
pr_count: [scan pr_count]
gh_available: [true | false]
retired_ids: [CV-003, CV-007]
---

# Conventions

Coding conventions for this project, maintained with `xoch-conventions`.

## [Category]

### CV-001: [Imperative statement]
- scope: [glob], [!excluded glob]
- status: confirmed
- confidence: high
- evidence: [counts]
```

Omit the `- scope:` line for a rule that applies everywhere. No other bullet fields are allowed under a rule; put explanations in prose outside rules.

Confirm the file parses:

```bash
xoch conventions rules --json --files README.md
```

A non-zero exit names the offending line. Fix it and re-run until it passes.

## Output

Summarize rules added, changed, retired, and kept, by status, and where the file lives (inside the repository when storage is in-repo, so it is committed; under `~/.xoch/projects/` when centralized). Complete the managed workflow, then end with the job's return command when a job is active, or otherwise:

```text
{{xoch-partial:next-step.md command="xoch-conventions"}}
```

{{xoch-partial:response-ending.md}}
