'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'token-estimator.js');

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage: token-estimator\.js/);
    assert.match(result.stdout, /--batch/);
  } finally {
    cleanup(ctx);
  }
});

test('no file path prints usage and exits 1', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, [], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Usage: token-estimator\.js/);
  } finally {
    cleanup(ctx);
  }
});

test('a nonexistent file exits 1 with an error', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['missing.md'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Error: File not found/);
  } finally {
    cleanup(ctx);
  }
});

test('--batch reports each file and skips missing ones in the totals', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'small.md'), 'x'.repeat(35));
    const result = runScript(SCRIPT, ['--batch', 'small.md', 'missing.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Skipping \(not found\): missing\.md/);
    assert.match(result.stdout, /small\.md.*10 tokens/);
    assert.match(result.stdout, /Files: 1/);
    assert.match(result.stdout, /Total Characters: 35/);
  } finally {
    cleanup(ctx);
  }
});

test('a small file passes the check in default report mode with no extra warnings', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'small.txt'), 'x'.repeat(35));
    const result = runScript(SCRIPT, ['small.txt'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Type: File README/);
    assert.match(result.stdout, /Status: ✅ PASS/);
    assert.ok(!result.stdout.includes('Over limit'));
    assert.ok(!result.stdout.includes('Approaching limit'));
  } finally {
    cleanup(ctx);
  }
});

test('a small file passes the check in "check" mode', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'small.txt'), 'x'.repeat(35));
    const result = runScript(SCRIPT, ['small.txt', 'check'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /✅ PASS - 10 \/ 3000 tokens \(0%\)/);
  } finally {
    cleanup(ctx);
  }
});

test('"json" mode prints a hand-spaced JSON line', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'small.txt'), 'x'.repeat(35));
    const result = runScript(SCRIPT, ['small.txt', 'json'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), '{"chars": 35, "tokens": 10, "limit": 3000, "percentage": 0, "status": 0}');
  } finally {
    cleanup(ctx);
  }
});

test('a file in the warn range reports "Approaching limit" and exits 1', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'warn.txt'), 'x'.repeat(9800));
    const result = runScript(SCRIPT, ['warn.txt'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Status: ⚠️ WARN/);
    assert.match(result.stdout, /Approaching limit \(~200 tokens remaining\)/);
  } finally {
    cleanup(ctx);
  }
});

test('a file in the warn range shows "WARN" in check mode', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'warn.txt'), 'x'.repeat(9800));
    const result = runScript(SCRIPT, ['warn.txt', 'check'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /⚠️ WARN - 2800 \/ 3000 tokens \(93%\)/);
  } finally {
    cleanup(ctx);
  }
});

test('an oversized file reports "Over limit" and exits 2', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'big.txt'), 'x'.repeat(10850));
    const result = runScript(SCRIPT, ['big.txt'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout, /Status: 🚫 FAIL/);
    assert.match(result.stdout, /Over limit by ~100 tokens/);
  } finally {
    cleanup(ctx);
  }
});

test('an oversized file shows "FAIL" in check mode', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'big.txt'), 'x'.repeat(10850));
    const result = runScript(SCRIPT, ['big.txt', 'check'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout, /🚫 FAIL - 3100 \/ 3000 tokens \(103%\)/);
  } finally {
    cleanup(ctx);
  }
});

test('a README.md next to a package.json is typed as an Application README', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'package.json'), '{}');
    fs.writeFileSync(path.join(ctx.cwd, 'README.md'), 'x'.repeat(35));
    const result = runScript(SCRIPT, ['README.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Type: Application README/);
  } finally {
    cleanup(ctx);
  }
});

test('a README.md with no build file is typed as a Feature README', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'README.md'), 'x'.repeat(35));
    const result = runScript(SCRIPT, ['README.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Type: Feature README/);
  } finally {
    cleanup(ctx);
  }
});

run();
