---
name: xoch-discovery-core
description: Full reference workflow for xoch-discovery
---

# Xoch - Discovery Core

This is the full reference workflow for `xoch-discovery`. It is rendered to `~/.xoch/prompts/core/discovery-core.md` and is not installed as a command.

Resolve an important unknown before specification, planning, or implementation continues.

## Purpose

Guide the engineer and agent through focused research that combines their complementary knowledge without confusing prior knowledge, evidence, assumptions, and decisions.

Use `xoch-discovery` for product, domain, design, API, dependency, workflow, compatibility, or implementation questions whose answers materially affect a spec. Use `xoch-trace` instead for an observed defect or failure that needs root-cause investigation.

## Work Model

When a job is active, read job pointers in this order:

1. `.xoch/work/current.md`
2. `.xoch/context/current.md` for legacy migration jobs

Target-model discovery notes live under:

```text
.xoch/work/jobs/[job-id]/notes/discovery-[topic]-[date].md
```

If no job exists, discovery may continue in chat. Ask before writing an ad hoc note or opening a job.

{{xoch-partial:project-routing.md}}

## Source Types

Keep these source types distinct:

- **Engineer knowledge**: business context, intent, constraints, history, and unpublished behavior supplied by the engineer.
- **Local evidence**: files, code, logs, images, schemas, screenshots, or other resources available locally.
- **External evidence**: supplied URLs or targeted web research, with links, version/date context, and access limitations recorded.
- **Model background knowledge**: useful orientation from training, explicitly labeled and verified when current or exact behavior matters.
- **Inference**: conclusions derived from evidence, labeled with confidence and reasoning.

Never present model background knowledge or inference as externally verified fact. Prefer primary documentation for technical claims and current behavior.

## Process

### Step 1: Frame The Unknown

Ask or establish:

- the question to resolve
- why it matters
- which spec requirement, acceptance criterion, constraint, or decision it blocks
- what is already known
- what has already been tried
- acceptable confidence and stopping conditions
- time, access, privacy, or source constraints

Turn a broad uncertainty into a short list of answerable discovery questions.

### Step 2: Inventory Available Sources

Ask what the engineer can provide:

- direct knowledge or organizational context
- local files, folders, images, screenshots, logs, or examples
- external URLs or named documentation
- access limitations or sensitive material that must stay local

Propose only the additional sources needed. Do not request broad repository reads or open-ended web research when a narrow source can answer the question.

### Step 3: Choose Investigation Ownership

Ask:

```text
How should we investigate? [A]gent researches, [E]ngineer provides context, or [C]ollaborate?
```

- `[A]`: the agent performs focused local or external research and reports sources.
- `[E]`: the agent asks concise questions and structures the engineer's answers.
- `[C]`: alternate research, evidence review, and decisions interactively.

### Step 4: Gather Evidence

{{xoch-partial:context-economy.md}}

For broad local reads, estimate candidates first:

```bash
~/.xoch/bin/token-estimator.sh --batch [files...]
```

When local images or screenshots are provided, inspect them directly and record what is visible versus inferred. When external URLs are provided, read the relevant sections and retain direct links. Use targeted web research when the engineer requests it or when current external facts are necessary to answer the approved question.

Do not expose secrets or send sensitive local content to external services. Stop and ask if source access or privacy boundaries are unclear.

### Step 5: Compare And Test Findings

For each discovery question, record:

- evidence found
- source type and source location
- agreements or conflicts between sources
- current best answer
- confidence
- remaining uncertainty

When sources conflict, show the conflict instead of silently choosing one. Ask the engineer to decide when the conflict depends on product intent, proprietary context, or acceptable risk.

### Step 6: Form Conclusions

Classify each question:

- `resolved`
- `resolved_with_assumption`
- `partially_resolved`
- `blocked`
- `inconclusive`

For assumptions, state what would invalidate them and require explicit engineer acceptance before using them in a spec.

### Step 7: Present Findings

Present a concise draft containing:

- discovery question
- answer or current conclusion
- strongest evidence and links/paths
- assumptions
- unresolved questions
- spec impact
- recommended next step

Then ask:

```text
Do you want to [A]ccept the findings, request [M]odifications, or [R]esearch further?
```

If `[M]`, ask what should change and revise the findings. If `[R]`, agree on the next focused question or source before continuing. Do not record findings as accepted until the engineer chooses `[A]`.

### Step 8: Record Accepted Discovery

When a job exists, write:

```text
.xoch/work/jobs/[job-id]/notes/discovery-[topic]-[date].md
```

Normalize the topic portion when needed with `~/.xoch/bin/generate-job-id.sh --id "[topic]"`. If that note path already exists, add a short numeric suffix rather than overwriting prior discovery.

Use this structure:

```markdown
# Discovery - [Topic]

**Date**: [today]
**Status**: [resolved | resolved_with_assumption | partially_resolved | blocked | inconclusive]
**Spec Impact**: [requirement, AC, constraint, decision, or none]

## Questions

- [question]

## Findings

| Question | Conclusion | Confidence | Source Type |
|---|---|---|---|
| [question] | [answer] | [high/medium/low] | [engineer/local/external/model/inference] |

## Evidence

- [path, URL, engineer statement, or labeled model background]

## Assumptions

- [accepted assumption, invalidation condition, or "None"]

## Unresolved

- [remaining unknown or "None"]

## Spec Guidance

[What spec should include, avoid, or leave unresolved]

## Next Step

[xoch-spec | xoch-revise-spec | more discovery | blocked]
```

For legacy jobs, write the note in the legacy job folder. For multi-project jobs, write through the primary job and synchronize accepted findings.

Update `state.md` only when discovery affects active workflow routing. Keep it compact:

```yaml
discovery_status: [status]
last_discovery: notes/discovery-[topic]-[date].md
unresolved_questions:
  - [question]
next_command: [xoch-spec | xoch-revise-spec | xoch-discovery]
last_updated: [today]
```

### Step 9: Route

Recommend:

- `xoch-spec` when discovery supplies missing pre-spec information
- `xoch-revise-spec` when an accepted spec must change
- another `xoch-discovery` pass when a narrower unknown remains
- `xoch-map` when local project or dependency resolution is the remaining need
- `xoch-doc` when accepted findings belong in durable project documentation
- stop as blocked when required access or authority is unavailable

## Output

End with:

```text
Discovery status: [status]
Findings: [note path or chat only]
{{xoch-partial:next-step.md command="[recommended command]"}}
```

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:engineer-git-rule.md}}

- Discovery resolves unknowns; it does not implement changes or advance phases.
- Label engineer knowledge, local evidence, external evidence, model background, and inference distinctly.
- Cite external sources and record local paths without reproducing unnecessary sensitive content.
- Do not manufacture certainty to unblock a spec.
- Assumptions require explicit engineer acceptance before becoming spec inputs.
- Preserve unresolved questions when evidence is insufficient.
