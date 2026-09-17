## Phase Boundary

Treat the current phase as a hard stop boundary.

- `xoch-build` may implement, review, and advance the current phase -- moving from its `implement` step to its `advance` step within that same phase, in the same response, is expected. The phase itself does not change without a fresh invocation.
- Do not begin work on the next phase in the same response or the same command run.
- Do not continue just because the next phase is obvious, small, related, or already planned.
- `Ready for next step: ...` is a stop sign. Report it as the final line and stop; do not execute or simulate that next command.

Only start the next phase after the engineer explicitly invokes the next Xoch command for that phase.
