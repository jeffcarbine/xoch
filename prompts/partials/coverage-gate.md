## Coverage Gate

Before planning phases, check whether each file targeted for modification has full coverage. If not, add phase work now to backfill coverage for its existing code, rather than discovering the gap mid-`xoch-do` and forcing an `xoch-revise`.

{{xoch-config:coverage.strictness required="Any file a job modifies with executable code must reach 100% line, branch, and function coverage (as the tooling reports them) across the whole file, not just changed lines, before the job can close." default="Any file a job modifies with executable code should reach 100% line, branch, and function coverage (as the tooling reports them) across the whole file, not just changed lines, before the job closes. Under `recommended` strictness a gap is not auto-blocking: `xoch-do`'s `final_review` step or `xoch-close` reports the specific gap and asks the engineer whether to close it now or accept it and proceed. The engineer's answer decides; do not assume either outcome."}} Markdown, configuration, and prose files are exempt.

{{xoch-config:coverage.strictness required="Coverage is not waivable in `final_review` or `xoch-close`. Only an `xoch-patch` session may waive it." default="An `xoch-patch` session may waive coverage outright."}}

A specific branch may instead be recorded as a **documented exception**. This is not a waiver and has a higher bar. It is valid only when both conditions are verified, not asserted:

- (a) The branch is not dead code: deleting it would change behavior for a real input.
- (b) No known technique (direct function calls, subprocess isolation, dependency injection, signal/error simulation, or similar) can trigger it deterministically.

A documented exception requires:

- the file and line/branch
- investigation findings for (a) and (b), in the job's review/closure record
- a comment at the exception site in the source file explaining why it is uncovered
- a comment in the test file, where the missing test would go, cross-referencing the source comment

Nothing re-verifies these comments. The next job that touches the file re-confirms the exception during its own coverage-gate pass.

If the target project has no coverage tooling, surface that as a plan-time gap and recommend adding a coverage-capable test command as phase work.
