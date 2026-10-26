---
name: xoch-conventions
description: Generate or update the project's documented coding conventions, or validate files against them
---

# Xoch - Conventions

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-conventions" pending="continue_conventions"}}

The conventions document lives at `$(xoch config root)/docs/conventions.md`. Its location follows the configured storage mode; never ask where to keep it.

Choose exactly one core from the engineer's message and whether the document exists:

- **Generate** -- the engineer asks to generate, create, learn, refresh, or update conventions, or the document does not exist yet:
  ```text
  ~/.xoch/prompts/core/conventions-generate-core.md
  ```
- **Validate** -- the engineer asks to validate, check, or compare files, or invokes bare while the document exists:
  ```text
  ~/.xoch/prompts/core/conventions-validate-core.md
  ```
- **Ambiguous** -- for example, asked to check files when no document exists. Ask:
  ```text
  Do you want to [G]enerate conventions or [V]alidate files against them?
  ```

If you already know the chosen core's flow from this conversation, continue from context. Never read both cores.
