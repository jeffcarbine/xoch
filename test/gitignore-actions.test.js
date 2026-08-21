'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'gitignore-actions.js');

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown subcommand prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 2);
  } finally {
    cleanup(ctx);
  }
});

test('an invalid --mode is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd, '--mode', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /--mode must be shared-docs or local-all/);
  } finally {
    cleanup(ctx);
  }
});

test('omitting --root defaults to the current working directory', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['ensure'], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(fs.existsSync(path.join(ctx.cwd, '.gitignore')));
  } finally {
    cleanup(ctx);
  }
});

test('a fresh directory gets the default shared-docs block, no existing .gitignore', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /gitignore rules updated/);
    const content = fs.readFileSync(path.join(ctx.cwd, '.gitignore'), 'utf8');
    assert.ok(content.includes('/.xoch/*'));
    assert.ok(content.includes('!/.xoch/docs/'));
  } finally {
    cleanup(ctx);
  }
});

test('re-running with the block already present is idempotent (already current)', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['ensure', '--root', ctx.cwd], ctx);
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /already current/);
  } finally {
    cleanup(ctx);
  }
});

test('--mode local-all writes the single-line ignore block', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd, '--mode', 'local-all'], ctx);
    assert.strictEqual(result.status, 0);
    const content = fs.readFileSync(path.join(ctx.cwd, '.gitignore'), 'utf8');
    assert.ok(content.includes('/.xoch/'));
    assert.ok(!content.includes('!/.xoch/docs/'));
  } finally {
    cleanup(ctx);
  }
});

test('a broad .xoch rule without --repair is refused', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, '.gitignore'), '/.xoch/\n');
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /broad \.xoch ignore rule/);
  } finally {
    cleanup(ctx);
  }
});

test('--repair removes the broad rule and adds the shared-docs block', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, '.gitignore'), '/.xoch/\n');
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd, '--repair'], ctx);
    assert.strictEqual(result.status, 0);
    const content = fs.readFileSync(path.join(ctx.cwd, '.gitignore'), 'utf8');
    assert.ok(!content.split('\n').includes('/.xoch/') || content.includes('!/.xoch/docs/'));
    assert.ok(content.includes('!/.xoch/docs/'));
  } finally {
    cleanup(ctx);
  }
});

test('--dry-run prints the rendered file without writing it', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd, '--dry-run'], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.includes('/.xoch/*'));
    assert.ok(!fs.existsSync(path.join(ctx.cwd, '.gitignore')));
  } finally {
    cleanup(ctx);
  }
});

test('an existing .gitignore without a trailing blank line gets one inserted before the new block', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, '.gitignore'), 'node_modules/');
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    const content = fs.readFileSync(path.join(ctx.cwd, '.gitignore'), 'utf8');
    const lines = content.split('\n');
    assert.strictEqual(lines[0], 'node_modules/');
    assert.strictEqual(lines[1], '');
  } finally {
    cleanup(ctx);
  }
});

test('an existing .gitignore that already ends with a blank line does not get a second one', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, '.gitignore'), 'node_modules/\n\n');
    const result = runScript(SCRIPT, ['ensure', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    const content = fs.readFileSync(path.join(ctx.cwd, '.gitignore'), 'utf8');
    const lines = content.split('\n');
    assert.strictEqual(lines[0], 'node_modules/');
    assert.strictEqual(lines[1], '');
    assert.notStrictEqual(lines[2], '');
  } finally {
    cleanup(ctx);
  }
});

run();
