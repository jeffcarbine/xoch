---
name: xoch-do
description: Implement, review, and advance through the current Xoch phase, and run the final review once every phase is done
---

# Xoch - Do

{{xoch-partial:workflow-boundary.md}}

`xoch-do` carries the active job through its phases and final review. What each step does depends on the kind of job, so this command only routes: it reads `job_type` from the `job current --json` result above and loads exactly one job-type core, which owns all step routing from there.

- `standard`, or `job_type` missing -- read and follow:
  ```text
  ~/.xoch/prompts/core/standard-job-core.md
  ```
- `qa` -- read and follow:
  ```text
  ~/.xoch/prompts/core/qa-job-core.md
  ```
- any other value -- do not guess. Report the job's ID, `job_type`, and `current_step` to the engineer and ask how to proceed.

If you already know the matching core's flow from this conversation, continue from context instead of rereading it. Never read the core for a job type other than the active job's.

Current configuration, which overrides anything remembered from earlier in this conversation:

{{xoch-config:git.behavior ask="- Git at the `advance` step: ask the engineer -- [G]enerate a commit message, [C]ommit, commit and [P]ush, or [N]othing." generate="- Git at the `advance` step: generate a commit message only. Do not ask what to do, and do not run git add, commit, or push." commit="- Git at the `advance` step: commit the phase's changes with a generated message. Do not ask what to do, and do not push." push="- Git at the `advance` step: commit the phase's changes with a generated message and push. Do not ask what to do." none="- Git at the `advance` step: do nothing with git. Do not ask, commit, or push." default="- Git at the `advance` step: ask the engineer -- [G]enerate a commit message, [C]ommit, commit and [P]ush, or [N]othing."}}
