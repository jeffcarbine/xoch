'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const REMOVE_SCRIPT = path.join(__dirname, '..', 'bin', 'remove.js');

function xochDir(ctx) {
  return path.join(ctx.home, '.xoch');
}

function copilotDir(ctx) {
  return path.join(ctx.home, 'Library', 'Application Support', 'Code', 'User', 'prompts');
}

function codexDir(ctx) {
  return path.join(ctx.home, '.codex', 'skills');
}

function claudeDir(ctx) {
  return path.join(ctx.home, '.claude', 'skills');
}

function kiroDir(ctx) {
  return path.join(ctx.home, '.kiro', 'steering');
}

// Simulates what a prior `xoch init` run (plus a pre-migration leftover
// ~/.xoch/bin) would have left on disk, so remove.js has something real to
// reverse.
function buildInstalledFixture(ctx) {
  fs.mkdirSync(path.join(xochDir(ctx), 'prompts'), { recursive: true });
  fs.writeFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'Meow body.\n');
  fs.writeFileSync(path.join(xochDir(ctx), 'config.json'), '{"version":1}\n');
  fs.mkdirSync(path.join(xochDir(ctx), 'bin'), { recursive: true });
  fs.writeFileSync(path.join(xochDir(ctx), 'bin', 'leftover.js'), '// pre-migration leftover\n');

  fs.mkdirSync(copilotDir(ctx), { recursive: true });
  fs.writeFileSync(path.join(copilotDir(ctx), 'xoch-meow.prompt.md'), 'installed');
  fs.writeFileSync(path.join(copilotDir(ctx), 'unrelated.prompt.md'), 'not ours');

  fs.mkdirSync(path.join(codexDir(ctx), 'xoch-meow', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(codexDir(ctx), 'xoch-meow', 'SKILL.md'), 'installed');
  fs.mkdirSync(path.join(codexDir(ctx), 'not-ours'), { recursive: true });
  fs.writeFileSync(path.join(codexDir(ctx), 'not-ours', 'file'), 'not ours');

  fs.mkdirSync(path.join(claudeDir(ctx), 'xoch-meow'), { recursive: true });
  fs.writeFileSync(path.join(claudeDir(ctx), 'xoch-meow', 'SKILL.md'), 'installed');
  fs.mkdirSync(path.join(claudeDir(ctx), 'not-ours'), { recursive: true });
  fs.writeFileSync(path.join(claudeDir(ctx), 'not-ours', 'file'), 'not ours');

  fs.mkdirSync(kiroDir(ctx), { recursive: true });
  fs.writeFileSync(path.join(kiroDir(ctx), 'xoch-meow.md'), 'installed');
  fs.writeFileSync(path.join(kiroDir(ctx), 'not-ours.md'), 'not ours');
}

// No test here triggers isFileOrSymlink()'s catch branch
// (bin/remove.js:~29) -- see the DOCUMENTED COVERAGE EXCEPTION comment
// at that site in bin/remove.js. It's a TOCTOU guard reachable only by
// an external process deleting a just-listed path in the microtask gap
// before lstat, which can't be constructed deterministically without
// mocking fs.
test('xoch remove removes rendered skill files from all four tool directories', () => {
  const ctx = scratch();
  try {
    buildInstalledFixture(ctx);
    const result = runScript(REMOVE_SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);

    assert.ok(!fs.existsSync(path.join(copilotDir(ctx), 'xoch-meow.prompt.md')));
    assert.ok(!fs.existsSync(path.join(codexDir(ctx), 'xoch-meow')));
    assert.ok(!fs.existsSync(path.join(claudeDir(ctx), 'xoch-meow')));
    assert.ok(!fs.existsSync(path.join(kiroDir(ctx), 'xoch-meow.md')));
  } finally {
    cleanup(ctx);
  }
});

test('xoch remove cleans up ~/.xoch prompts, config, and a leftover legacy bin/ dir', () => {
  const ctx = scratch();
  try {
    buildInstalledFixture(ctx);
    const result = runScript(REMOVE_SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);

    assert.ok(!fs.existsSync(xochDir(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('xoch remove leaves unrelated files in each tool directory untouched', () => {
  const ctx = scratch();
  try {
    buildInstalledFixture(ctx);
    const result = runScript(REMOVE_SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);

    assert.ok(fs.existsSync(path.join(copilotDir(ctx), 'unrelated.prompt.md')));
    assert.ok(fs.existsSync(path.join(codexDir(ctx), 'not-ours', 'file')));
    assert.ok(fs.existsSync(path.join(claudeDir(ctx), 'not-ours', 'file')));
    assert.ok(fs.existsSync(path.join(kiroDir(ctx), 'not-ours.md')));
  } finally {
    cleanup(ctx);
  }
});

test('xoch remove is a no-op that still exits 0 when nothing was ever installed', () => {
  const ctx = scratch();
  try {
    const result = runScript(REMOVE_SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

// No test here triggers verify()'s "CLI version could not be determined"
// branch (bin/remove.js:~156) -- see the DOCUMENTED COVERAGE EXCEPTION
// comment at that site in bin/remove.js. pkg.version is read from this
// repo's own real package.json at module-load time, which npm
// guarantees has a non-empty version string; triggering the branch
// would require a malformed package.json, reachable only by relocating
// this script (as test/prompt-check.test.js's buildFixtureRoot() does
// for bin/xoch.js's equivalent require), not by exercising the real,
// installed file.
test('xoch verify reports success when both the CLI and rendered prompts are present', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(xochDir(ctx), 'prompts'), { recursive: true });
    fs.writeFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'Meow body.\n');
    const result = runScript(REMOVE_SCRIPT, ['verify'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /verified/i);
  } finally {
    cleanup(ctx);
  }
});

test('xoch verify fails clearly when rendered prompts are missing', () => {
  const ctx = scratch();
  try {
    const result = runScript(REMOVE_SCRIPT, ['verify'], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /no rendered prompts|run `xoch init`/i);
  } finally {
    cleanup(ctx);
  }
});

test('xoch verify fails clearly when the rendered prompts directory exists but is empty', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(xochDir(ctx), 'prompts'), { recursive: true });
    const result = runScript(REMOVE_SCRIPT, ['verify'], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /no rendered prompts|run `xoch init`/i);
  } finally {
    cleanup(ctx);
  }
});

run();
