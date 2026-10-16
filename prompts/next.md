---
name: xoch-next
description: Close the current arc job and open the arc's next planned job in one pass
---

# Xoch - Next

{{xoch-partial:workflow-boundary.md}}

`xoch-next` moves an arc from one job to the next: it closes the active job exactly as `xoch-close` would, then opens the arc's next planned job exactly as `xoch-open` would -- one command instead of two. It composes those two flows rather than duplicating them, so every closing gate still applies.

This name previously belonged to the phase-advancing command that is now `xoch-do`'s `advance` step. It no longer advances phases.

The workflow boundary check above already ran `job current --json`.

## Step 1: Confirm There Is A Next Job

- **No active job** -- say so and recommend `xoch-open`. Stop.
- **Active job is standalone** (`arc` is `standalone` or missing in job state) -- there is no arc to move through. Say so and route to `xoch-close`. Stop without closing anything.
- **Active job belongs to an arc** -- load the arc:

  {{xoch-partial:arc-evidence.md}}

  Read its membership with `xoch arc get --arc "[arc-id]" --json` and look at the `planned` list. If it is empty, say so and route to `xoch-close` for this job -- and, when every other arc job is already Complete or Parked, note that the arc itself can be closed afterward with `xoch-close`. Stop without closing anything.

Never guess a next job that the arc's `planned` list doesn't contain.

## Step 2: Choose And Confirm

If exactly one job is Planned, that's the next job. If several are, list them in their `planned` order, recommend the first, and let the engineer pick.

Then confirm the whole move once:

```text
Close `[current-job-id]` and open `[next planned entry]` in arc `[arc-id]`? [Y]es / [N]o
```

On `[N]`, stop without changing anything.

## Step 3: Close The Current Job

```bash
xoch job close --job "[job-id]"
```

The helper checks every closing gate and, on success, writes `closure.md`, clears the pointer, and marks the job Complete in the arc's membership.

If it refuses, relay its list of unmet conditions and stop there, routing to whatever fixes them (`xoch-do` for unfinished phases or review, `xoch-doc` for documentation status). Do not open the next job. The engineer re-runs `xoch-next` once the gate is satisfied.

## Step 4: Open The Next Job

Once the job is closed, continue in this same response into `~/.xoch/prompts/core/open-core.md`'s Fresh Job flow with `arc: [arc-id]` already settled:

- If the planned entry's ID is already a job folder (a job opened earlier and parked as Planned), resume that job instead of opening a new one: `xoch job set-current`, set `status` back to the open sequence, move it to Active, and continue at its own `current_step`.
- Otherwise use the planned entry's title (or its ID, when it has no title) as the job identifier, and confirm the derived ID/title pair as Fresh Job describes.
- Pass the planned entry's ID as `--from` when Fresh Job moves the new job to Active, so the placeholder entry is replaced instead of duplicated.
- Skip re-asking standalone-versus-arc; ask about single- versus multi-project scope only if the arc's notes don't already settle it.

From here this is exactly `xoch-open`'s flow: `title` -> `spec` -> `plan`, each with its own gates, ending at `Ready for next step: \`xoch-do\``. The planned entry and the arc's `notes.md` can orient the spec step, but they are not source requirements -- `spec-core.md`'s rule still applies, so ask for the next job's actual requirements before drafting.

## Output

Report the `job close` output, then continue directly into opening the next job -- do not print a `Ready for next step` line between them. The response then ends wherever `xoch-open`'s flow ends: at one of its gates, or at `Ready for next step: \`xoch-do\`` once the plan is accepted.
