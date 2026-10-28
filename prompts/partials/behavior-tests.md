## Behavior Tests

When a phase adds or changes testable code behavior, write its tests before the implementation. Run them and confirm they fail because the behavior is missing, not because of a broken test or syntax error, before editing implementation code for that behavior.

- Describe each test in plain language that a reader unfamiliar with the code can understand without project jargon.
- Cover one distinct behavior per test. If an existing test already covers a behavior, extend or reference it instead of adding another.

Exempt: phases that do not add or change testable code behavior (documentation, configuration, research). Coverage-backfill tests for existing, correct code are expected to pass immediately, not fail first.
