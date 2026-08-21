## Behavior Tests

When a phase adds or changes testable code behavior, write the test(s) describing that behavior before writing the implementation. Run them and confirm they fail for the right reason — the behavior doesn't exist yet, not a broken test or a syntax error — before making any implementation edit for that behavior.

Write test descriptions in plain, human-readable language. Someone with no prior knowledge of the code should be able to read a test's description and understand the behavior it checks, without first learning project-specific jargon or implementation terms.

Each test should address one distinct behavior. If a behavior is already covered by an existing test, do not write another test that re-asserts it — extend or reference the existing one instead.

This does not apply to phases that don't add or change testable code behavior — pure documentation, pure configuration, or pure research/investigation phases are exempt. Coverage backfill for pre-existing, already-correct code is a related but separate concern (see `coverage-gate.md`): those tests are expected to pass immediately, not fail first, since they document behavior that already exists.
