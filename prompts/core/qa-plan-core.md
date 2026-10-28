---
name: xoch-qa-plan-core
description: Full reference workflow for xoch-qa's plan step
---

# Xoch - QA Plan Core

The `plan` step of `xoch-qa`: turn the accepted intake into ordered QA phases in which every case is spelled out (what is exercised, the exact input or steps, the expected result, and why it exists), so someone who has never seen the application can run any case from the plan alone. Produces `plan.md`, the phases document, and updated job state, written through helpers.

{{xoch-partial:context-economy.md}}

## Process

### Step 1: Load Intake

Use `xoch job evidence --job "[job-id]" --json` to resolve paths, then read `state` and `intake.md`. Confirm `qa_environment_confirmed: true` and `qa_capabilities` are present in state. If either is missing, return to `qa-intake-core.md` Step 2 or Step 3 rather than planning without them.

### Step 2: Order The Phases

Group cases into phases that can each be run and reviewed in one sitting. Order by dependency and risk; a typical order is:

1. **Smoke** -- the target is reachable, pages/endpoints load, login works. Later phases are meaningless if this fails.
2. **Happy paths** -- the primary flows with valid, ordinary input.
3. **Validation and boundaries** -- required fields, lengths, formats, numeric limits, empty/whitespace input, Unicode.
4. **Hostile and injection-style input** -- quoting/escaping, SQL/NoSQL injection, script injection, path traversal, header manipulation -- only within the confirmed dev/staging target.
5. **State and permissions** -- auth boundaries, other users' data, repeated or concurrent submissions, back-button and refresh behavior.
6. **Regression** -- previously broken behavior and anything the related job's spec says must stay the same.

Drop or merge phases that do not apply. Add phases the target needs (accessibility, responsive layout, file uploads, API contract) when the intake calls for them.

### Step 3: Write Every Case Explicitly

Each phase lists its cases in a table:

| ID | Target | Action | Exact input / steps | Expected result | Rationale |
|---|---|---|---|---|---|
| QA-P[n]-[nnn] | [page / field / endpoint] | [what is done] | [literal values and numbered steps] | [observable pass condition] | [what this case probes and why it matters] |

Rules for cases:

- **Exact values, always.** Write every input literally, including quotes, whitespace, and encoding -- for example `O'Brien`, `a"b@example.com`, `' OR '1'='1' --`, `<script>alert(1)</script>`, `../../etc/passwd`, a 256-character string written as `"a" x 256`. Never write "an invalid email" or "a long string".
- **Expected result is observable.** State what pass looks like: the status code, the message shown, the record stored or not stored, the absence of a 500 or stack trace, the value rendered escaped rather than executed.
- **Rationale says what the case probes.** For example: an unescaped `"` checks that quoting is handled in validation, persistence, and re-rendering; `' OR '1'='1' --` checks that queries are parameterized rather than string-built; `<script>alert(1)</script>` checks that user input is escaped on output; a duplicate submit checks idempotency.
- **One behavior per case.** Split cases that check two things.
- **No destructive cases outside scope.** Do not plan cases that delete shared data, send real email or payments, or call third parties unless the intake explicitly put them in scope.

### Step 4: Assign Capability And Allowed Owners

For each phase, state:

- **Required capability** -- `browser`, `http`, `shell`, or `none` (manual-only).
- **Allowed owners**:
  - capability recorded `yes` -> `[E]`, `[A]`, or `[C]`
  - capability recorded `no` -> `[E]` or `[C]` only

When a phase requires a capability the agent lacks, still write every case in full, and add **engineer instructions**: numbered, click-by-click (or command-by-command) steps that reference the case IDs and their exact values, plus what to record (actual result, screenshot or response body when useful).

### Step 5: Present Draft QA Plan

Present in chat: the phase order and why, each phase's required capability and allowed owners, every case table, and any cases deliberately excluded and why. Then ask:

{{xoch-partial:accept-or-modify.md artifact="QA plan"}}

On `[M]`, revise and ask again. Do not write plan artifacts until `[A]`.

### Step 6: Write Accepted Plan

Write `plan.md`:

```bash
xoch file write --job "[job-id]" --path plan.md <<'XOCHEOF'
# QA Plan - [job-id]

**Date**: [today]
**Intake**: intake.md
**Status**: Accepted
**Environment**: [dev | staging] - [target]
**Capabilities**: [browser=.., http=.., shell=..]

## Approach

[phase order and rationale]

## Excluded

[cases or areas deliberately not covered, and why]

## Phase Summary

| Phase | Title | Required capability | Allowed owners | Cases |
|---|---|---|---|---|
XOCHEOF
```

Write the phases document through the helper, which validates it before saving. Phases are numbered by their position in the list:

```bash
xoch phase write --job "[job-id]" <<'XOCHEOF'
{
  "phases": [
    {
      "title": "[Title]",
      "goal": "[one-sentence goal]",
      "description": "[What this phase exercises and why it comes here]",
      "required_capability": "browser | http | shell | none",
      "allowed_owners": "[E]/[A]/[C] | [E]/[C] only",
      "cases": [
        { "id": "[case ID]", "target": "[target]", "action": "[action]", "input": "[exact input / steps]", "expected": "[expected result]", "rationale": "[rationale]" }
      ],
      "engineer_instructions": ["[numbered step, when the agent lacks the capability]"]
    }
  ]
}
XOCHEOF
```

Leave `engineer_instructions` empty (`[]`) when the agent can run every case itself. Check the result with `xoch phase show --job "[job-id]"`.

### Step 7: Update State And Enter Phase 1

```bash
xoch state set --job "[job-id]" --field status --value plan_complete
xoch state set --job "[job-id]" --field plan_status --value accepted
xoch phase advance --job "[job-id]" --phase 0
```

If `phase advance` refuses because the environment is not confirmed, return to `qa-intake-core.md` Step 2 -- never work around the guard.

## Output

```text
QA plan created.
Current phase: Phase 1 - [title]
{{xoch-partial:next-step.md command="xoch-do"}}
```

Entering phase 1 is `xoch-do`'s job; stop here.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Never send test input during planning.
- Never edit source files.
