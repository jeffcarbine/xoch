---
name: xoch-next
description: Close the current arc job and open the arc's next planned job in one pass
---

# Xoch - Next

{{xoch-partial:workflow-boundary.md}}

`xoch-next` moves an arc from one job to the next: it closes the active job exactly as `xoch-close` would, then opens the arc's next planned job exactly as `xoch-open` would. Every closing gate still applies. It does not advance phases.

## Step 1: Confirm There Is A Next Job

Use the `job current --json` result from the workflow boundary.

- **No active job** -- say so, recommend `xoch-open`, and stop.
- **Standalone job** (`arc` is `standalone` or missing) -- there is no arc to move through. Say so, route to `xoch-close`, and stop without closing anything.
- **Arc job** -- load the arc:

  {{xoch-partial:arc-evidence.md}}

  Read its membership with `xoch arc get --arc "[arc-id]" --json` and check the `planned` list. If it is empty, say so and route to `xoch-close` for this job; when every other arc job is Complete or Parked, note that the arc itself can be closed afterward with `xoch-close`. Stop without closing anything.

Never guess a next job that the `planned` list does not contain.

## Step 2: Choose And Confirm

If exactly one job is Planned, it is the next job. If several are, list them in `planned` order, recommend the first, and let the engineer pick.

Confirm the whole move once:

```text
Close `[current-job-id]` and open `[next planned entry]` in arc `[arc-id]`? [Y]es / [N]o
```

On `[N]`, stop without changing anything.

## Step 3: Close The Current Job

```bash
xoch job close --job "[job-id]"
```

On success the helper writes `closure.md`, clears the pointer, and marks the job Complete in the arc's membership.

If it refuses, relay its unmet conditions, route to whatever fixes them (`xoch-do` for unfinished phases or review, `xoch-doc` for documentation status), and stop. Do not open the next job; the engineer re-runs `xoch-next` once the gate is satisfied.

## Step 4: Open The Next Job

Continue in this response into `~/.xoch/prompts/core/open-core.md`'s Fresh Job flow with `arc: [arc-id]` settled:

- If the planned entry's ID is already a job folder (opened earlier and parked as Planned), resume it instead of opening a new one: `xoch job set-current`, set `status` back to the open sequence, move it to Active, and continue at its own `current_step`.
- Otherwise use the planned entry's title (or its ID, when it has no title) as the job identifier, and confirm the derived ID/title pair as Fresh Job describes.
- Pass the planned entry's ID as `--from` when Fresh Job moves the new job to Active, so the placeholder is replaced instead of duplicated.
- Do not re-ask standalone versus arc. Ask about single- versus multi-project scope only if the arc's notes do not settle it.

From here the flow is `xoch-open`'s: `title` -> `spec` -> `plan`, each with its own gates. The planned entry and the arc's `notes.md` can orient the spec step but are not source requirements; ask for the next job's actual requirements before drafting.

## Output

Report the `job close` output, then continue into opening the next job without a `Ready for next step` line between them. The response ends wherever `xoch-open`'s flow ends: at one of its gates, or at `Ready for next step: \`xoch-do\`` once the plan is accepted.
