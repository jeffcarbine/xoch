---
name: xoch-open-job
description: Open or resume a Xoch job
---

# Xoch - Open Job

Open or resume a focused Xoch job.

If you are unfamiliar with Xoch's job model, read:

```text
~/.xoch/prompts/core/foundation-core.md
```

Do not read the core prompt if this conversation already has enough Xoch context.

## Process

1. Check active pointers in order:
   - `.xoch/work/current.md`
   - `.xoch/context/current.md` for legacy jobs
2. If active work exists, summarize job ID, title, status, current phase, and next command. Ask whether to resume it or open a different job. If opening different work, recommend `xoch-pause` first.
3. Ask only for missing metadata:
   - job ID or issue ID
   - title
   - short description
   - standalone or arc association
   - documentation target, if known
4. If the work sounds like several related jobs, suggest `xoch-open-arc`; continue as one job if the engineer confirms.
5. Generate or clean the job ID with:

   ```bash
   ~/.xoch/bin/generateJobId.sh --id "[provided-id]"
   ~/.xoch/bin/generateJobId.sh
   ```

6. Create:

   ```text
   .xoch/work/jobs/[job-id]/
   .xoch/work/jobs/[job-id]/notes/
   .xoch/work/jobs/[job-id]/phases/
   .xoch/work/jobs/[job-id]/revisions/
   ```

7. Create `.xoch/work/jobs/[job-id]/state.md`:

   ```yaml
   job_id: [job-id]
   title: [job title]
   description: [short description]
   status: active
   arc: [arc-id or standalone]
   current_phase: null
   phase_count: 0
   current_phase_title: null
   current_phase_goal: null
   current_phase_files: []
   current_phase_acceptance_criteria: []
   current_phase_validation: []
   phase_index: []
   documentation_targets:
     - scope: feature|project|docs|unknown
       path: [path or unknown]
   decisions: []
   risks: []
   unresolved_questions: []
   review_status: null
   closure_status: null
   next_command: xoch-spec
   started: [today]
   last_updated: [today]
   ```

8. Create `.xoch/work/current.md` with job ID, title, arc, status, current phase, next command, job directory, and started date.

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
- Arcs group job IDs by reference.
- Missing documentation targets are allowed for exploratory work but must be explicit in `state.md`.
- Do not auto-migrate active legacy `.xoch/context/` jobs.
