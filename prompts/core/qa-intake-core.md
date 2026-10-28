---
name: xoch-qa-intake-core
description: Full reference workflow for xoch-qa's intake step
---

# Xoch - QA Intake Core

The `intake` step of `xoch-qa`. Before any test input is sent, establish what is being QA'd, that the target is a confirmed dev or staging environment, and what the agent can exercise itself. Produces `intake.md` and the state fields `qa_environment`, `qa_target`, `qa_environment_confirmed`, and `qa_capabilities` (set through the `xoch qa` helpers).

{{xoch-partial:context-economy.md}}

## Process

### Step 1: Capture The QA Target

Do not plan QA from only a job name, branch name, or file name. If the engineer has not described what is being QA'd, ask. Gather:

- **what** is being QA'd -- feature, flow, page, endpoint, CLI command, or release
- **where** -- the exact URLs, routes, endpoints, commands, or screens in scope
- **related job** -- an optional job ID whose work is being QA'd; when given, read its `spec.md` acceptance criteria (via `xoch job evidence --job "[related-job-id]" --json`) as a source of expected behavior
- **known risk areas** -- recent changes, past bugs, inputs the engineer is worried about
- **out of scope** -- anything explicitly not to be exercised (payments, email sending, destructive admin actions, third-party calls)
- **test data and accounts** -- logins, seed data, or fixtures the engineer wants used, and anything that must not be touched

When reading application code or docs to understand expected behavior, read only; never edit.

{{xoch-partial:budget-check.md skill="qa"}}

### Step 2: Confirm The Environment

QA phases may send malformed, hostile, or injection-style input. That is only acceptable against a non-production target.

Ask exactly:

```text
Which environment is the QA target, and what is its exact address? It must be [D]ev or [S]taging -- I will not run QA against production.
```

- Never infer the environment from a URL, hostname, or branch. The engineer must state it.
- If the engineer says production, is unsure, or the target is shared with real users or real data, stop. Explain that QA cannot proceed against that target and ask for a dev or staging target instead. Do not offer an override.
- Once the engineer confirms dev or staging and the exact target, record it:

  ```bash
  xoch qa confirm-env --job "[job-id]" --env "[dev|staging]" --target "[exact URL, host, or description]"
  ```

`phase advance` refuses to enter phase 1 of a QA job until this has succeeded.

### Step 3: Check And State Capabilities

Determine what this agent can exercise itself, from its own available tools -- not from assumption:

- **browser** -- a browser-automation tool is available (for example `mcp__claude-in-chrome__*`, a built-in browser pane, or a Playwright/Puppeteer tool). If such a tool is listed but may be deferred or disconnected, confirm it with one cheap, read-only call (for example listing tabs) before marking it `yes`. If the call fails, mark it `no`.
- **http** -- the agent can send arbitrary HTTP requests (shell `curl` or an equivalent fetch tool that supports methods, headers, and bodies) to the confirmed target.
- **shell** -- the agent can run shell commands (CLI-level QA, log inspection, database reads against the confirmed environment when the engineer allows it).

Record the result:

```bash
xoch qa capabilities --job "[job-id]" --browser "[yes|no]" --http "[yes|no]" --shell "[yes|no]"
```

Then tell the engineer plainly what that means, for example:

```text
I can drive a browser, send HTTP requests, and run shell commands, so I can run UI, API, and CLI cases myself.
```

```text
I have no browser tool in this session, so I can't run UI cases myself. I'll still write every UI case out in full -- exact values and steps -- for you to run, and I can run the HTTP-level checks directly.
```

### Step 4: Present Intake

Present the intake summary in chat:

```markdown
# QA Intake - [job-id]

**Date**: [today]

## Target

[what is being QA'd; related job ID if any]

## Scope

- In scope: [URLs / routes / endpoints / commands / screens]
- Out of scope: [explicit exclusions]

## Environment

- Environment: [dev | staging] (confirmed by the engineer)
- Target: [exact address]

## Capabilities

- Browser: [yes | no]
- HTTP: [yes | no]
- Shell: [yes | no]
- What the agent can run itself: [summary]
- What must be handed to the engineer: [summary]

## Test Data And Accounts

[accounts, seed data, fixtures; anything not to touch]

## Known Risk Areas

[list]

## Expected Behavior Sources

[related spec ACs, docs, engineer statements]
```

Then ask:

{{xoch-partial:accept-or-modify.md artifact="intake"}}

On `[M]`, revise and ask again. If the modification changes the environment or target, rerun `qa confirm-env` with the corrected values before asking again.

### Step 5: Write Accepted Intake

```bash
xoch file write --job "[job-id]" --path intake.md <<'XOCHEOF'
[intake.md content]
XOCHEOF
```

## Output

Report:

```text
QA intake captured.
Job: [job-id]
Environment: [dev | staging] - [target]
```

Then run `xoch job step-advance --job "[job-id]"` (`intake` -> `plan`) and continue directly into `~/.xoch/prompts/core/qa-plan-core.md` in this same response. Do not print a `Ready for next step` line for this transition.

## Rules

{{xoch-partial:response-ending.md}}

{{xoch-partial:xoch-file-helper-rule.md}}

- Never send any request, form submission, or command at the target during intake beyond a capability probe that does not touch it.
- Never edit source files.
- Never accept production as a QA target, and never infer the environment on the engineer's behalf.
- Capabilities are reported as checked, not as hoped for.
