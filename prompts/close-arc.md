---
name: xoch-close-arc
description: Close an Xoch arc after its related jobs are complete or intentionally parked
---

# Xoch - Close Arc

{{xoch-partial:workflow-boundary.md}}

Close an optional arc when its related jobs are complete, intentionally parked, or moved out of the arc.

## Purpose

Summarize the larger goal, record final job membership state, capture unfinished work decisions, and mark the arc closed without changing or deleting job folders.

## Work Model

Arc files live under (resolve `[xoch-root]` with `~/.xoch/bin/xoch-actions.sh config root`):

```text
[xoch-root]/work/arcs/[arc-id]/
```

Job folders stay under:

```text
[xoch-root]/work/jobs/[job-id]/
```

Closing an arc does not close, archive, delete, or move any job.

## Process

### Step 1: Identify Arc

If the engineer provides an arc ID, use it. Otherwise list arcs under:

```text
[xoch-root]/work/arcs/
```

{{xoch-partial:arc-evidence.md}}

{{xoch-partial:arc-context.md}}

### Step 2: Summarize Job Membership

Group referenced jobs as:

- complete
- active
- planned
- parked
- missing or unknown

Do not assume unknown job status is complete.

### Step 3: Resolve Unfinished Jobs

If active, planned, parked, missing, or unknown jobs remain, ask whether to:

1. Leave them referenced as parked follow-up
2. Move the job references to another arc
3. Remove them from the arc reference list
4. Keep the arc active

If moving references to another arc, use or recommend `xoch-revise-arc` for both arcs. Do not move job folders.

### Step 4: Check Documentation

If the arc affected shared docs, feature READMEs, or `.xoch/docs/`, ask whether docs are current, should be refreshed with `xoch-doc`, or should be explicitly waived.

### Step 5: Write Closure Notes

Create `closure.md` under `arc_directory` (from Step 1's `arc evidence` call).

Use this structure:

```markdown
# Arc Closure - [arc-id]

**Date**: [today]
**Status**: Closed

## Summary

[What the arc accomplished]

## Job Membership At Close

### Complete

- `[job-id]` - [summary]

### Parked Or Follow-Up

- `[job-id]` - [decision]

## Documentation

[current, refreshed, not impacted, or waived]

## Waivers

- [waiver or "None"]

## Follow-Up

- [remaining job or "None"]
```

### Step 6: Mark Arc Closed

Update `state` (from the same `arc evidence` call).

Set:

```yaml
status: closed
closed: [today]
last_updated: [today]
next_command: null
```

Keep `jobs.md` as a final reference record unless the engineer asked to revise it before closing.

## Output

End with:

```text
Arc closed.
Arc: [arc-id]
Jobs changed: none moved or deleted
Follow-up: [summary]
```

## Rules

{{xoch-partial:response-ending.md}}

- Closing an arc does not close jobs.
- Closing an arc does not archive, delete, or move job folders.
- Unfinished job references require an explicit keep, move-reference, remove-reference, or keep-active decision.
- Documentation gaps require refresh, waiver, or explicit "not impacted".
