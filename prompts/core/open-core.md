---
name: xoch-open-core
description: Full reference workflow for xoch-open's entry-mode detection, arc setup, resume, and title step
---

# Xoch - Open Core

Entry-mode routing, arc setup, resume, and the `title` step for `xoch-open`. Ends with a job current and ready for `spec`.

{{xoch-partial:project-routing.md}}

{{xoch-partial:storage-root.md}}

## Entry Modes

When `job current --json` shows no active job, pick the mode from the engineer's message. Reopen, resume, and fresh job are mutually exclusive; arc setup can precede any of them.

### Reopen A Closed Job

The engineer names an existing job ID (a directory under `[xoch-root]/work/jobs/[job-id]/`) that is not currently active.

1. Read its state:

   ```bash
   xoch state get --job "[job-id]" --json
   ```

2. Set it current:

   ```bash
   xoch job set-current --job "[job-id]"
   ```

3. If its `status` is `closed`, reactivate it:

   ```bash
   xoch state set --job "[job-id]" --field status --value active
   ```

   If it belongs to an arc, move it back to Active in the arc's membership:

   ```bash
   xoch arc job-move --arc "[arc-id]" --job "[job-id]" --to active
   ```

4. Route on `current_step` from the state read in step 1:
   - `title`, `spec`, or `plan` -- the open sequence never finished. Resume that step, using the engineer's new description as additional input.
   - anything else, or `null` -- new work on a finished job means new requirements. Move it back to `spec`:

     ```bash
     xoch state set --job "[job-id]" --field current_step --value spec
     ```

     Continue into `spec-core.md` with the engineer's new description as the source requirements for a fresh spec pass. Do not silently reuse the old `plan.md` or phases; `spec-core.md` decides whether they still apply.

### Set Up An Arc

An arc groups related jobs by reference under a larger goal. Use one only when several jobs share an outcome, not for single-job work.

Recommend an arc when the description signals several related jobs:

{{xoch-partial:arc-signals.md}}

Arc files live under `[xoch-root]/work/arcs/[arc-id]/`. Jobs stay in `[xoch-root]/work/jobs/[job-id]/`; arcs reference them by ID only. Never move or nest job folders inside an arc.

1. **Check active job context.** If a standalone active job exists, read its state (`xoch state get --job "[job-id]" --json`) and ask whether to adopt it into the new arc, infer the arc's purpose and initial job list from its spec, or open the arc without adopting it.
2. **Gather arc metadata:** arc ID or short name, title, larger goal, success outcome, known job IDs, documentation targets, risks/constraints/non-goals. Generate a short kebab-case ID from the title when none is given.
3. **Check existing arcs** under `[xoch-root]/work/arcs/`. If the named arc exists, summarize it and ask whether to resume it or use `xoch-revise` (arc) instead of creating a duplicate.
4. **Create the arc** with the helper. It writes the arc's state and membership; do not create them by hand:

   ```bash
   xoch arc open --id "[arc-id]" --title "[title]" --purpose "[purpose]" --success "[success outcome]" --doc-scope "[scope]" --doc-path "[path]"
   ```

   Add `--adopt-active` only when the engineer confirmed adopting the active standalone job. The helper lists it as Active and sets its `arc` field; do not change its phase, review status, or step unless the engineer asks.

5. **List planned jobs**, one call per known job:

   ```bash
   xoch arc job-move --arc "[arc-id]" --job "[job-id or placeholder]" --title "[intended job]" --to planned
   ```

6. **Write `notes.md`:** why the arc exists, initial decisions, known constraints, initial membership reasoning, whether active-job adoption was checked, and whether metadata was inferred or engineer-provided.
7. **Continue.** To open a job inside the arc now, continue into Fresh Job with `arc: [arc-id]`. If the arc was opened only for planning, stop after summarizing the created arc files.

### Resume Paused Or Archived Work

On a bare invocation (no job description) with no active job, look for work to resume before assuming a fresh job.

{{xoch-partial:job-evidence.md}}

1. **Find the job.** Use a supplied job ID; otherwise list candidates from `[xoch-root]/work/jobs/` and `[xoch-root]/work/jobs/archive/`.
2. **Load job files.** Read job state first. Read `spec`, `plan`, or phases only when state lacks enough current-phase context; read `current_phase_snapshot` or list `snapshots_dir` when needed. If a participant mirror has `projects.json`, resolve the primary job and use its canonical state.
3. **Restore if archived.** Ask before restoring. Restore to `[xoch-root]/work/jobs/[job-id]/`:

   ```bash
   xoch archive restore --kind job --id "[job-id]" --dry-run
   xoch archive restore --kind job --id "[job-id]"
   ```

   If restore refuses, do not manually overwrite the active job folder. For an archived job with `projects.json`: validate scope, dry-run every restore, restore the primary job and then each participant mirror with `xoch archive --root "[project path]"`, and reload `projects.json` from the restored primary job. Stop on any collision or missing repository; never leave a job marked resumed after a partial restore.

4. **Set the current pointer:**

   ```bash
   xoch job set-current --job "[job-id]"
   ```

   This restores any managed workflow preserved in job state and projects `next_command`/`current_step`; never write `current.json` by hand. Run `xoch job current --json` again; if it reports an active workflow, resume that workflow and its pending action before routing to phase work. For a multi-project job, set only the invoked repository's pointer, write resumed state through the primary job, and sync to participants.

   Mark the job resumed:

   ```bash
   xoch state update --job "[job-id]" <<'XOCHEOF'
   {"status": "resumed", "last_updated": "[today]"}
   XOCHEOF
   ```

5. **Summarize:** job goal, current phase, completed and remaining phases, risks/unresolved questions, and `current_step`:
   - `title`, `spec`, or `plan` -- continue that step in this response, as a fresh entry would.
   - anything else -- end with `Ready for next step: \`xoch-do\`` (or `` `xoch-close` `` if it looks done).

### Pending Handoffs

Discovery, trace, and QA leave handoffs for work that should become a job. Before a fresh job or a bare-invocation resume search, check for unclaimed ones:

```bash
xoch handoff list --pending
```

If any are pending, list them (ID, source, topic) and ask which, if any, this job should take as source requirements, alongside resume candidates on a bare invocation. Read each chosen one with `xoch handoff get --id "[id]"`; its body is source input for `spec`, not an accepted spec. Once the job exists (opened, reopened, or resumed), claim every handoff it used:

```bash
xoch handoff claim --id "[id]" --job "[job-id]"
```

Never claim a handoff the engineer did not choose, and never delete one.

### Fresh Job

The default when no other mode applies.

1. Ask only for missing metadata: job identifier (slug or phrase), standalone or arc, single- or multi-project.
2. If the description signals several related jobs, switch to Set Up An Arc; continue here if the engineer confirms it is one job.
3. Derive the id and title:

   ```bash
   xoch generate-id --id "[identifier]"
   xoch generate-id
   ```

   If the cleaned slug differs from the identifier, use the identifier verbatim as `title` and the slug as `id`. If they match, derive `title` by replacing hyphens with spaces and title-casing each word. Confirm:

   ```text
   Use ID `[id]` and title `[title]`? [Y]es or [N]o, I'll adjust
   ```

4. Create the job. The helper seeds `current_step: title` and projects it into `current.json`:

   ```bash
   xoch job open --id "[job-id]" --title "[title]" --arc "[arc-id or standalone]" --doc-scope "[scope]" --doc-path "[path]"
   ```

   For multi-project work, run it from the confirmed primary repository root, even when invoked from a participant. If the helper fails, report the failure; do not create job folders or state by hand.

   For an arc job, list it as Active. If it was opened for a Planned entry with a different ID, pass that ID as `--from` so the placeholder is replaced, not duplicated:

   ```bash
   xoch arc job-move --arc "[arc-id]" --job "[job-id]" --title "[title]" --to active [--from "[planned-entry-id]"]
   ```

   If the helper refuses because the arc's membership is missing or invalid, report the refusal; do not edit arc files by hand.

5. For a multi-project job:
   - Resolve project names with `~/.xoch/workspace-map.json`; run `xoch-map` first when required projects are missing.
   - Confirm one primary repository and every participant repository with the engineer.
   - Run `xoch job current --json` from every selected repository. Never displace unrelated active work.
   - Create the canonical scope in the primary job (repeat `--participant` per repository):

     ```bash
     xoch project-scope create --job "[job-id]" --primary "[name]=[absolute path]" --participant "[name]=[absolute path]"
     xoch context-sync sync --scope "[primary job]/projects.json" --dry-run
     xoch context-sync sync --scope "[primary job]/projects.json"
     ```

   - Set a participant's current pointer (`xoch job set-current --job "[job-id]"` from its root) only when it has no conflicting active job and the engineer wants the job active there.

6. If the engineer wants Xoch work state kept local while docs stay shareable, preview the gitignore update in each participating repository and apply it only after confirmation:

   ```bash
   xoch gitignore ensure --mode shared-docs --dry-run
   xoch gitignore ensure --mode shared-docs
   ```

## Output

Report:

```text
Job opened.
```

If `current_step` is `title`, run `xoch job step-advance --job "[job-id]"` to move it to `spec`. Then continue into `spec-core.md`'s Gather Source Requirements step in this same response. Do not print a `Ready for next step` line for this transition.

## Rules

{{xoch-partial:response-ending.md}}

- Use `xoch` helpers for deterministic file and folder actions.
- Missing documentation targets are allowed for exploratory work but must be explicit in job state.
- Do not mark phases complete while resuming.
- Preserve all job history.
