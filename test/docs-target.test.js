'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'docs-target.js');

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

test('missing --path is required', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--path is required/);
  } finally {
    cleanup(ctx);
  }
});

test('a path escaping the project root is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd, '--path', '../../etc/passwd'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Path escapes project root/);
  } finally {
    cleanup(ctx);
  }
});

test('a nested file finds the nearest nested README, not a root-level one', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'README.md'), 'root readme');
    fs.mkdirSync(path.join(ctx.cwd, 'nested', 'deep'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'nested', 'README.md'), 'nested readme');
    fs.writeFileSync(path.join(ctx.cwd, 'nested', 'deep', 'file.js'), '');
    const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd, '--path', 'nested/deep/file.js', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.scope, 'feature');
    assert.strictEqual(data.target, 'nested/README.md');
    assert.strictEqual(data.reason, 'nearest nested README');
  } finally {
    cleanup(ctx);
  }
});

test('a directory path (not a file) is also resolved correctly', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'nested', 'README.md'), 'nested readme');
    const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd, '--path', 'nested', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.scope, 'feature');
    assert.strictEqual(data.target, 'nested/README.md');
  } finally {
    cleanup(ctx);
  }
});

test('a root-level file with no nested README and an existing manifest routes through it', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, '.xoch', 'docs'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, '.xoch', 'docs', 'readme-packets.json'), '{}');
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), '');
    const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd, '--path', 'top.js', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.scope, 'root');
    assert.strictEqual(data.target, '.xoch/docs/readme-packets.json');
    assert.strictEqual(data.reason, 'route through approved root packet manifest');
  } finally {
    cleanup(ctx);
  }
});

test('a root-level file with no nested README and no manifest falls back to README.md', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), '');
    const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd, '--path', 'top.js'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Scope: root/);
    assert.match(result.stdout, /Target: README\.md/);
    assert.match(result.stdout, /no nested README or packet manifest found/);
  } finally {
    cleanup(ctx);
  }
});

test('a README.md at the project root itself does not count as "nested"', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'README.md'), 'root readme');
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), '');
    const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd, '--path', 'top.js', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.scope, 'root');
  } finally {
    cleanup(ctx);
  }
});

test('omitting --root defaults to the current working directory', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), '');
    const result = runScript(SCRIPT, ['resolve', '--path', 'top.js'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Scope: root/);
  } finally {
    cleanup(ctx);
  }
});

test('a --manifest path that escapes the root is not stripped to a relative path', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), '');
    const outsideManifest = path.join(path.dirname(ctx.cwd), 'outside-manifest.json');
    fs.writeFileSync(outsideManifest, '{}');
    try {
      const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd, '--path', 'top.js', '--manifest', '../outside-manifest.json', '--json'], ctx);
      const data = JSON.parse(result.stdout);
      assert.strictEqual(data.scope, 'root');
      // The manifest resolves outside root, so it is reported as the full
      // absolute path rather than a root-relative slice.
      assert.strictEqual(data.target, outsideManifest);
    } finally {
      fs.rmSync(outsideManifest, { force: true });
    }
  } finally {
    cleanup(ctx);
  }
});

test('a custom --manifest path is honored', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'custom-manifest.json'), '{}');
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), '');
    const result = runScript(SCRIPT, ['resolve', '--root', ctx.cwd, '--path', 'top.js', '--manifest', 'custom-manifest.json', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.target, 'custom-manifest.json');
  } finally {
    cleanup(ctx);
  }
});

run();
