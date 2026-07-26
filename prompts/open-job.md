---
name: xoch-open-job
description: Open or resume a Xoch job
---

# Xoch - Open Job

{{xoch-partial:workflow-boundary.md}}

Open or resume a focused Xoch job.

If you are unfamiliar with Xoch's job model, read:

```text
~/.xoch/prompts/core/foundation-core.md
```

Do not read the core prompt if this conversation already has enough Xoch context.

## Process

1. Use the `xoch-actions.sh job current --json` result from the workflow boundary to check target-model or legacy active work.
2. If active work exists, summarize job ID, title, status, current phase, and next command. Ask whether to resume it or open a different job. If opening different work, recommend `xoch-pause` first.
3. Ask only for missing metadata:
   - job identifier (a slug like `token-estimator-fix` or a human phrase like `Xoch Tweaks 07/25/26` — either is fine)
   - standalone or arc association
   - single-project or multi-project scope
4. If the work sounds like several related jobs, suggest `xoch-open-arc`; continue as one job if the engineer confirms.
5. Derive the job's id and title from the one identifier given:

   ```bash
   ~/.xoch/bin/generate-job-id.sh --id "[identifier]"
   ~/.xoch/bin/generate-job-id.sh
   ```

   - If the cleaned slug differs from the raw identifier, the identifier was title-like: use it verbatim as `title`, use the cleaned slug as `id`.
   - If the cleaned slug matches the raw identifier, the identifier was already slug-shaped: derive a human title by replacing hyphens with spaces and title-casing each word.
   - Confirm the derived pair with the engineer before proceeding:

     ```text
     Use ID `[id]` and title `[title]`? [Y]es or [N]o, I'll adjust
     ```

6. Prefer the deterministic helper to create job folders, `state.md`, and `.xoch/work/current.json`:

   ```bash
   ~/.xoch/bin/xoch-actions.sh job open --id "[job-id]" --title "[title]" --arc "[arc-id or standalone]" --doc-scope "[scope]" --doc-path "[path]"
   ```

   For multi-project work, run this command from the confirmed primary repository root even when `xoch-open-job` was invoked from a participant repository.

   If the helper is unavailable, create the same folders and state/current files manually using the foundation core model.

7. For a multi-project job:
   - Use `~/.xoch/workspace-map.json` to resolve project names; run `xoch-map` first when required projects are missing.
   - Confirm one primary repository and every participant repository with the engineer.
   - Run `xoch-actions.sh job current --json` from every selected repository. Never displace unrelated active work.
   - Create the canonical scope in the primary job:

     ```bash
     ~/.xoch/bin/project-scope.sh create --job "[job-id]" --primary "[name]=[absolute path]" --participant "[name]=[absolute path]"
     ~/.xoch/bin/context-sync.sh sync --scope "[primary job]/projects.json" --dry-run
     ~/.xoch/bin/context-sync.sh sync --scope "[primary job]/projects.json"
     ```

     Repeat `--participant` for additional repositories. Set a participant's local current pointer only when it has no conflicting active job and the engineer wants the job active there. Run `xoch-actions.sh job set-current --job "[job-id]"` from that participant root.

8. If the engineer wants Xoch work state kept local while docs remain shareable, preview and confirm the gitignore update in each participating repository:

   ```bash
   ~/.xoch/bin/gitignore-actions.sh ensure --mode shared-docs --dry-run
   ~/.xoch/bin/gitignore-actions.sh ensure --mode shared-docs
   ```

For legacy jobs, continue the legacy `.xoch/context/` model in place and do not move files automatically.

## Output

End with:

```text
Job opened.
Ready for next step: `xoch-spec`
```

## Rules

{{xoch-partial:response-ending.md}}

- Jobs are first-class units of work.
- Prefer `~/.xoch/bin/xoch-actions.sh` for deterministic file/folder actions.
- Do not change `.gitignore` without engineer confirmation.
- Arcs group job IDs by reference.
- Multi-project jobs have one canonical primary job and optional participant mirrors described by `projects.json`.
- Source files and active pointers are never synchronized.
- Missing documentation targets are allowed for exploratory work but must be explicit in `state.md`.
- Do not auto-migrate active legacy `.xoch/context/` jobs.
