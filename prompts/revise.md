---
name: xoch-revise
description: Revise an active Xoch job's specification or implementation plan, or an arc, in one pass
---

# Xoch - Revise

{{xoch-partial:workflow-boundary.md}}

`xoch-revise` replaces `xoch-revise-spec`, `xoch-revise-plan`, and `xoch-revise-arc`. It revises whichever foundational artifacts need to change -- a job's spec, its plan, or both, and/or an arc -- as one command, the same way `xoch-open` carries a job through `spec` and `plan` in one pass.

The workflow boundary check above already ran `job current --json`. Spec and plan revisions need an active job -- if there is none, ask for the job ID or recommend `xoch-open`. Arc revisions do not; they need an arc ID, which defaults to the active job's arc when it has one.

## Choosing What To Revise

Infer the mode from the engineer's description of what changed:

- **Spec** -- the definition of done changes: requirements, acceptance criteria, scope boundaries, non-goals, constraints, documentation targets, or job purpose.
- **Plan** -- the spec still holds, but the implementation path changes: approach, file ownership, phase order or scope, validation strategy, dependencies, or discovered complexity.
- **Both** -- the definition of done changes *and* the plan has to follow. Most acceptance-criteria changes land here, since the plan's phase coverage has to be rewired to match.
- **Arc** -- the larger goal shared across jobs changes: arc purpose, success outcome, scope, documentation targets, risks, status, or which jobs belong to it and where (active, planned, complete, parked).

Confirm the inferred mode before reading anything else, naming your read of the change:

```text
This looks like a [spec | plan | spec and plan | arc] change because [reason]. Revise the [S]pec, the [P]lan, [B]oth, or the [A]rc?
```

If the engineer's message hasn't described the change yet, ask what changed instead of guessing.

Then read only the core file for the step you are on -- continue from context if you already know its flow from this conversation:

- spec -- `~/.xoch/prompts/core/revise-spec-core.md`
- plan -- `~/.xoch/prompts/core/revise-plan-core.md`
- arc -- `~/.xoch/prompts/core/revise-arc-core.md`

Do not read the plan core until the spec step is finished, do not read the spec core at all in plan-only mode unless the plan step finds a spec change, and do not read the arc core unless the arc step is actually running (see below).

## Moving between steps

Spec always goes first when both change -- the plan is revised against the updated definition of done, never the other way round. Steps flow continuously in one `xoch-revise` invocation, each behind its own accept/modify gate:

- **Spec only** -- `revise-spec-core.md` runs to its end and routes onward (normally `xoch-do`).
- **Plan only** -- `revise-plan-core.md` runs to its end. If its spec-stability check finds the change actually alters the definition of done, it switches to the spec step in this same response, then returns to the plan step -- effectively becoming **Both**.
- **Both** -- `revise-spec-core.md` runs through its gate and writes, then continues directly into `revise-plan-core.md` in this same response. Do not print a `Ready for next step` line between them.
- **Arc** -- `revise-arc-core.md` runs to its end. If it finds the active job's spec or plan has to change too, it offers to continue into that step in this same response.
- **Job steps that touch the arc** -- if the spec or plan step finds the arc association or arc goal changed, it offers to continue into the arc step after the job steps finish, in this same response.

Whichever artifact the change originates in goes first. If any step uncovers impact outside the confirmed mode -- plan impact from a spec-only revision, arc impact from a job revision, job impact from an arc revision -- ask before continuing into that step rather than silently expanding the revision.

## Output

Follow each step's own ending as written in its core file. The response only stops at a step's own accept/modify gate, at the mode confirmation above, or at the final `Ready for next step` line after the last step finishes.
