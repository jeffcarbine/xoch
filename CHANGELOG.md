# Changelog

All notable changes to Xoch are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-10-28

### Changed

- Replaced the package's npm keywords with ones that describe Xoch and the AI tools it supports, so it can be found on npm.
- Normalized the `bin` path in `package.json`, which removes a warning npm printed on every publish.

## [1.0.0] - 2026-10-28

First public release on npm.

### Added

- Global install with `npm i -g @jeffcarbine/xoch`; `xoch init` installs the skills into each supported AI tool, and `xoch remove` uninstalls them.
- Standard job workflow: `xoch-open` (spec and phase plan), `xoch-do` (implement, advance, final review), `xoch-doc`, and `xoch-close`, with closing gates for review, coverage, and documentation.
- Arcs for grouping related jobs, with `xoch-next` to move between them.
- QA jobs via `xoch-qa`: planned test cases against `dev` or `staging`, on-the-spot patches, and a QA report with handoffs for deferred failures.
- Supporting commands: `xoch-revise`, `xoch-pr`, `xoch-discovery`, `xoch-trace`, `xoch-patch`, `xoch-conventions`, `xoch-roadmap`, `xoch-map`, `xoch-sidebar`, `xoch-pause`, and `xoch-help`.
- Documented coding conventions, mined from review history and applied during planning, implementation, and review.
- Multi-project jobs spanning several repositories.
- `xoch` CLI for configuration (`xoch config`) and validated job, arc, and phase state.

[Unreleased]: https://github.com/jeffcarbine/xoch/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/jeffcarbine/xoch/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jeffcarbine/xoch/releases/tag/v1.0.0
