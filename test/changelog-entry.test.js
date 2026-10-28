'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup, runScript } from './lib/cli.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRIPT = path.join(__dirname, '..', 'scripts', 'changelog-entry.js');

const CHANGELOG = `# Changelog

Intro text.

## [Unreleased]

- Not released yet.

## [1.1.0] - 2026-11-01

### Added

- Second feature.

## [1.0.0] - 2026-10-28

First release.

### Added

- First feature.

[Unreleased]: https://example.com/compare/v1.1.0...HEAD
[1.1.0]: https://example.com/releases/tag/v1.1.0
`;

function withChangelog(fn) {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'CHANGELOG.md'), CHANGELOG);
    fn(ctx);
  } finally {
    cleanup(ctx);
  }
}

test('prints only the requested version\'s notes, stopping before the next version', () => {
  withChangelog((ctx) => {
    const result = runScript(SCRIPT, ['1.1.0'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, '### Added\n\n- Second feature.\n');
  });
});

test('prints the last version\'s notes without the link definitions that follow it', () => {
  withChangelog((ctx) => {
    const result = runScript(SCRIPT, ['1.0.0'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, 'First release.\n\n### Added\n\n- First feature.\n');
  });
});

test('never treats the Unreleased section as a version\'s notes', () => {
  withChangelog((ctx) => {
    const result = runScript(SCRIPT, ['Unreleased'], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.strictEqual(result.stdout, '');
    assert.match(result.stderr, /No changelog entry for Unreleased/);
  });
});

test('fails and names the version when the changelog has no notes for it', () => {
  withChangelog((ctx) => {
    const result = runScript(SCRIPT, ['2.0.0'], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.strictEqual(result.stdout, '');
    assert.match(result.stderr, /2\.0\.0/);
  });
});

test('fails when the version has a heading but no notes under it', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'CHANGELOG.md'), '# Changelog\n\n## [3.0.0] - 2026-12-01\n\n## [2.0.0] - 2026-11-15\n\n- Notes.\n');
    const result = runScript(SCRIPT, ['3.0.0'], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /3\.0\.0/);
  } finally {
    cleanup(ctx);
  }
});

test('fails when there is no CHANGELOG.md in the current directory', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['1.0.0'], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /CHANGELOG\.md/);
  } finally {
    cleanup(ctx);
  }
});

test('fails with usage help when no version is given', () => {
  withChangelog((ctx) => {
    const result = runScript(SCRIPT, [], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Usage/);
  });
});

run();
