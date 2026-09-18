---
name: xoch-open-core
description: Full reference workflow for xoch-open's entry-mode detection, arc setup, resume, and title step
---

# Xoch - Open Core

This is the full reference workflow for `xoch-open`'s entry-mode detection, arc setup, resume/restore, and `title` step. It is rendered to `~/.xoch/prompts/core/open-core.md` and is not installed as a command.

## Purpose

Get a job into existence -- or restored as current -- and ready for the `spec` step, whichever of four entry modes applies, then hand off.

{{xoch-partial:project-routing.md}}

## Entry Modes

When `job current --json` shows no active job, decide which of these applies from the engineer's message. Reopen and resume are mutually exclusive with a fresh job; arc setup can precede any of the other three.

### Reopen A Closed Job

If the engineer names an existing job ID (a directory already under `[xoch-root]/work/jobs/[job-id]/`, resolve `[xoch-root]` with `xoch config root`) that is not currently active, this is a reopen, not a fresh job.

1. Read that job's `state.md`.
2. Set it current:

   ```bash
   xoch job set-current --job "[job-id]"
   ```

3. If its `status` is `closed`, reactivate it:

   ```bash
   xoch state set --job "[job-id]" --field status --value active
   ```

4. Check `current_step` from the state just read:
   - `title`, `spec`, or `plan` -- the job was closed before finishing the open sequence. Resume that exact step, folding the engineer's new description into it as additional input.
   - anything else, or `null` -- the job was closed after implementation finished (or was fully reviewed). New work on an old job shell means new requirements, not a continuation of the old plan. Move it back to `spec`:

     ```bash
     xoch state set --job "[job-id]" --field current_step --value spec
     ```

     Continue into `spec-core.md`, treating the engineer's new description as the source requirements for a fresh spec pass. Do not silently reuse the old `plan.md`/`phases.md` -- `spec-core.md`'s own process decides whether they still apply.

### Set Up An Arc

Arcs are optional: a larger goal that groups related jobs by reference. Use one when several jobs share a larger outcome and the engineer wants a small amount of shared tracking -- not for normal single-job work.

Recommend this mode when the engineer's description signals several related jobs rather than one:

- multiple independent outcomes or workstreams
- several repositories, packages, or services with different validation paths
- substantial sequencing where one piece should be planned or reviewed separately from another
- several documentation targets with different owners or audiences
- work that arrived already framed as "phase 1 of several projects" or similar

Arc files live under:

```text
[xoch-root]/work/arcs/[arc-id]/
```

Jobs remain first-class folders under `[xoch-root]/work/jobs/[job-id]/`; arc membership is by job ID reference only. Do not move or nest job folders inside an arc.

1. **Check active job context.** If a standalone active job already exists, read its `state.md` evidence and ask whether to adopt it into the new arc, infer arc purpose/initial job list from its spec, or open the arc without adopting it.
2. **Gather arc metadata:** arc ID or short name, arc title, larger goal, success outcome, known job IDs (if any), documentation targets, risks/constraints/non-goals. Generate a short kebab-case ID from the title when none is given.
3. **Check existing arc state** under `[xoch-root]/work/arcs/`. If the named arc already exists, summarize it and ask whether to resume it or use `xoch-revise-arc` instead of creating a duplicate.
4. **Create arc files** with the deterministic helper:

   ```bash
   xoch arc open --id "[arc-id]" --title "[title]" --purpose "[purpose]" --success "[success outcome]" --doc-scope "[scope]" --doc-path "[path]"
   ```

   Add `--adopt-active` only when the engineer confirmed adopting an active standalone job. If the helper is unavailable, create `state.md` under the arc directory manually:

   ```yaml
   arc_id: [arc-id]
   title: [arc title]
   purpose: [larger goal]
   status: active
   documentation_targets:
     - scope: feature|project|docs|unknown
       path: [path or unknown]
   success_outcome: [what done looks like]
   risks: []
   unresolved_questions: []
   started: [today]
   last_updated: [today]
   next_command: xoch-open
   ```

5. **Write `jobs.md`** in the same arc directory:

   ```markdown
   # Arc Jobs - [arc-id]

   ## Active

   - `[job-id]` - [job title or unknown]

   ## Planned

   - `[job-id or placeholder]` - [intended job]

   ## Complete

   - None

   ## Parked

   - None
   ```

6. **Write `notes.md`**: why the arc exists, initial decisions, known constraints, initial job membership reasoning, whether active-job adoption was checked, whether metadata was inferred or engineer-provided.
7. **If a standalone job was adopted**, update its `state.md`: `arc: [arc-id]`, `last_updated: [today]`. Do not change its current phase, review status, or step unless the engineer explicitly asks.
8. **Continue.** If the engineer wants to open a job inside the arc now, continue into Fresh Job below with `arc: [arc-id]` set. If the arc was opened only for planning, stop after summarizing the created arc files.

### Resume Paused Or Archived Work

If the engineer invokes `xoch-open` with no job description at all and no active job exists, look for something to resume rather than assuming a fresh job.

1. **Find the job.** If a job ID was supplied, use it. Otherwise list candidates from:

   ```text
   [xoch-root]/work/jobs/
   [xoch-root]/work/jobs/archive/
   .xoch/context/
   .xoch/context/archive/
   ```

   Label legacy jobs clearly as legacy.

2. **Load job files.** For target-model jobs:

   {{xoch-partial:job-evidence.md}}

   Read `state`; read `spec`, `plan`, or `phases` (whichever are returned) only when `state` does not contain enough current-phase context; read `current_phase_snapshot` or list `snapshots_dir` when needed. For legacy jobs, read the equivalent legacy context files. If a participant mirror has `projects.json`, resolve the primary job and use its canonical state.

   {{xoch-partial:state-phase-index.md}}

3. **Restore if archived.** Ask before moving or restoring an archived job. For target-model jobs, restore to `[xoch-root]/work/jobs/[job-id]/`:

   ```bash
   xoch archive restore --kind job --id "[job-id]" --dry-run
   xoch archive restore --kind job --id "[job-id]"
   ```

   Do not manually overwrite an active job folder if restore refuses. If the archived job has `projects.json`, treat it as a multi-project restore: validate scope, dry-run every restore, restore the primary job then each participant mirror with `xoch archive --root "[project path]"`, and reload `projects.json` from the restored primary job. Stop on any collision or missing repository; do not leave the job marked resumed after a partial restore. For legacy jobs, preserve the legacy context model unless the engineer explicitly asks to migrate it.

4. **Write the current pointer.** For target-model jobs:

   ```bash
   xoch job set-current --job "[job-id]"
   ```

   This restores any managed workflow preserved in `state.md` and projects `next_command`/`current_step`. Do not write `current.json` manually. Run `job current --json` again after setting the pointer; if it reports an active workflow, resume that workflow and its pending action before routing to phase work. For legacy jobs, update `.xoch/context/current.md` instead. For a multi-project job, set only the invoked repository's current pointer; write resumed state through the canonical primary job and sync to participants.

   Update the resumed job's `state.md`:

   ```yaml
   status: resumed
   last_updated: [today]
   ```

5. **Present the summary:** job goal, current phase, completed phases, remaining phases, risks/unresolved questions, and where `current_step` (or the legacy equivalent) lands:
   - `title`, `spec`, or `plan` -- continue that step in this same response, exactly as a fresh entry into that step would.
   - anything else -- this job is past `xoch-open`'s territory. Report the summary and end with `Ready for next step: \`xoch-build\`` (or `` `xoch-close` `` if it looks done) rather than continuing here.

### Fresh Job

The default when none of the above applies.

1. Ask only for missing metadata: job identifier (a slug or a human phrase, either is fine), standalone or arc association, single-project or multi-project scope.
2. If the description sounds like several related jobs, switch to Set Up An Arc above; continue here as one job if the engineer confirms it's really just one.
3. Derive the job's id and title from the one identifier given:

   ```bash
   xoch generate-id --id "[identifier]"
   xoch generate-id
   ```

   If the cleaned slug differs from the raw identifier, the identifier was title-like: use it verbatim as `title`, use the cleaned slug as `id`. If the cleaned slug matches the raw identifier, the identifier was already slug-shaped: derive a human title by replacing hyphens with spaces and title-casing each word. Confirm the derived pair:

   ```text
   Use ID `[id]` and title `[title]`? [Y]es or [N]o, I'll adjust
   ```

4. Create the job with the deterministic helper -- it also seeds `current_step: title` and projects it into `current.json`:

   ```bash
   xoch job open --id "[job-id]" --title "[title]" --arc "[arc-id or standalone]" --doc-scope "[scope]" --doc-path "[path]"
   ```

   For multi-project work, run this from the confirmed primary repository root even when `xoch-open` was invoked from a participant repository. If the helper is unavailable, create the same folders and state/current files manually using the foundation core model.

5. For a multi-project job:
   - Resolve project names with `~/.xoch/workspace-map.json`; run `xoch-map` first when required projects are missing.
   - Confirm one primary repository and every participant repository with the engineer.
   - Run `xoch job current --json` from every selected repository. Never displace unrelated active work.
   - Create the canonical scope in the primary job:

     ```bash
     xoch project-scope create --job "[job-id]" --primary "[name]=[absolute path]" --participant "[name]=[absolute path]"
     xoch context-sync sync --scope "[primary job]/projects.json" --dry-run
     xoch context-sync sync --scope "[primary job]/projects.json"
     ```

     Repeat `--participant` for additional repositories. Set a participant's local current pointer only when it has no conflicting active job and the engineer wants the job active there: run `xoch job set-current --job "[job-id]"` from that participant root.

6. If the engineer wants Xoch work state kept local while docs remain shareable, preview and confirm the gitignore update in each participating repository:

   ```bash
   xoch gitignore ensure --mode shared-docs --dry-run
   xoch gitignore ensure --mode shared-docs
   ```

For legacy jobs, continue the legacy `.xoch/context/` model in place and do not move files automatically.

## Output

Report:

```text
Job opened.
```

Then continue directly into gathering source requirements (`spec-core.md`'s own Step 3 onward) in this same response -- `title` -> `spec` is not a phase boundary and needs no fresh invocation. Do not print a `Ready for next step` line for this transition.

## Rules

{{xoch-partial:response-ending.md}}

- Jobs are first-class units of work.
- Prefer `xoch` for deterministic file/folder actions.
- Do not change `.gitignore` without engineer confirmation.
- Arcs group job IDs by reference; do not create job folders inside arc folders.
- Multi-project jobs have one canonical primary job and optional participant mirrors described by `projects.json`.
- Source files and active pointers are never synchronized.
- Missing documentation targets are allowed for exploratory work but must be explicit in `state.md`.
- Do not auto-migrate active legacy `.xoch/context/` jobs.
- Do not require arcs for standalone jobs; keep arcs lightweight, not project-management ceremony.
- Reopening a closed job never silently discards its prior spec/plan history -- `spec-core.md` decides what still applies.
- Do not mark phases complete while resuming.
- Preserve all job history.
