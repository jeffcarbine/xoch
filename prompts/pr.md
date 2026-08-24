---
name: xoch-pr
description: Generate an evidence-backed pull request title and body for the active Xoch job
---

# Xoch - PR

{{xoch-partial:workflow-boundary.md}}

Generate a copyable pull request title and Markdown body for completed work in the active Xoch job. This command prepares text only: it does not create a remote pull request, change Git state, or overwrite job artifacts.

{{xoch-partial:estimator-reminder.md}}

## Process

### 1. Identify the active job

Use the `~/.xoch/bin/xoch-actions.js job current --json` result from the workflow boundary. A branch name, job ID, title, or supplied change summary is not enough to substitute for an active job.

If no current job exists, ask the engineer to run `xoch-open-job` first. Do not generate a PR draft.

Resolve available job artifacts before reading them:

```bash
~/.xoch/bin/xoch-actions.js job evidence --job "[job-id]" --json
```

Read the active job's `state.md`. Use the smallest sufficient evidence set for the requested draft, preferring:

1. completed phase snapshots and recorded validation evidence;
2. accepted `spec.md` and `plan.md` for scope and acceptance criteria;
3. `review.md` or `closure.md` when present;
4. explicit engineer-provided change and testing details.

Before each full read beyond active pointer/state files, run the estimator. Prefer targeted sections, snapshots, and existing evidence over broad repository inspection.

### 2. Establish evidence sufficiency

Do not treat planned work, a job title, or acceptance criteria alone as proof that a change was implemented or tested.

If the available evidence cannot accurately support either the change summary or test instructions, ask focused questions before drafting. For example:

```text
The active job does not contain enough implementation evidence to draft an accurate PR. What changes were made in this branch, and how should a reviewer validate them?
```

Do not invent files changed, behavior delivered, commands run, test results, or completion status.

### 3. Draft the pull request text

Use the active job evidence to produce exactly one title and one Markdown description.

**Title requirements:**

- Describe the implemented outcome, not the task process.
- Be concise and review-friendly; target 72 characters or fewer when that preserves meaning.
- Avoid vague titles such as "updates", "fixes", or a bare job ID.
- Do not claim unverified behavior.

**Description requirements:**

- Include `## What was done?` with a brief, evidence-backed summary of changes in the branch.
- Include `## How to test` with actionable validation steps.
  - Prefer recorded commands and results when they exist.
  - Otherwise derive reviewer steps from implemented behavior and acceptance criteria without claiming they have already been run.
  - If evidence cannot support actionable steps, ask the engineer rather than producing generic or invented instructions.

Return the result as two independently copyable `bash` code blocks, without extra commentary after the description. The title block contains only the title; the description block contains the complete Markdown description:

````md
Title:
```bash
[concise PR title]
```

Description:
```bash
## What was done?
[brief evidence-backed summary]

## How to test
- [actionable validation step]
```
````

## Output

After the title and description blocks, make the final line:

```text
Ready for next step: `xoch-close-job`
```

## Rules

- The active Xoch job is the canonical context source.
- Preserve the standard pending-workflow boundary; never replace another workflow implicitly.
- Ask for missing facts instead of manufacturing certainty.
- Keep the generated content provider-neutral and copyable.
- Do not call Git hosting or other external services.
- Do not modify source code, Git state, job artifacts, or workflow state while generating the draft.
- After the PR draft, the next step is always `xoch-close-job` — this command does not chain into it automatically.
