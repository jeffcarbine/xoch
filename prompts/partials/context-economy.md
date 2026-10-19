## Context Economy

Read selectively. Budgets are limits, not targets.

- Do not reread a file whose current content is already in this conversation. Reread only for exact text, fresh state, line numbers, recent edits, or validation evidence.
- Before any full-file read other than active Xoch pointer/state files, run the budget check and show its output in your response before reading:

  ```bash
  xoch token-estimator budget check --skill [skill] --files [files...]
  ```

- Prefer the smallest useful read: `rg`, `git diff`, `git status`, file outlines, targeted line ranges, or snippets around relevant symbols.
- If `budget check` reports FAIL, stop. Do not read further without an explicit engineer waiver:

  ```text
  This read is over the [skill] budget ([tokens] / [budget] tokens). Reading it needs your explicit approval -- give a reason to proceed, or say how to narrow the read instead.
  ```

  Narrow the read, rely on existing context, or proceed once the engineer gives a reason. With an active job, record the waiver:

  ```bash
  xoch token-estimator budget record --skill [skill] --job [job-id] --waiver "[engineer-approved reason]" --files [files...]
  ```

- To learn unfamiliar code, read nearby README/docs, then current tests, then source; stop once you understand enough. Go straight to source when docs or tests are missing or do not cover the area. This order does not apply to reviewing a diff: always read the actual change.
- When recording token usage, separate files actually read from files only inspected by search, diff, or prior context.
