## Phase Boundary

The current phase is a hard stop.

- `xoch-do` may implement, review, and advance the current phase. Moving from its `implement` step to its `advance` step in the same response is expected.
- The phase changes only on a fresh invocation. Do not begin the next phase in the same response or command run, even if it is obvious, small, related, or already planned.
- `Ready for next step: ...` is a stop sign. Print it as the final line and stop; do not execute or simulate the next command.
