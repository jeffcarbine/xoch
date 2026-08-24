'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'context-tracker.js');

function jobDir(ctx, job) {
  return path.join(ctx.cwd, '.xoch', 'work', 'jobs', job);
}

function ledgerPath(ctx, job) {
  return path.join(jobDir(ctx, job), 'context-ledger.json');
}

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /context-tracker\.js check/);
    assert.match(result.stdout, /context-tracker\.js record/);
  } finally {
    cleanup(ctx);
  }
});

test('an unrecognized command prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('check requires --file', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['check', '--job', 'job-1'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout + result.stderr, /--file is required/);
  } finally {
    cleanup(ctx);
  }
});

test('check requires --job', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['check', '--file', 'a.md'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout + result.stderr, /--job is required/);
  } finally {
    cleanup(ctx);
  }
});

test('check errors when the job folder does not exist', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'nope'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout + result.stderr, /Job folder not found/);
  } finally {
    cleanup(ctx);
  }
});

test('checking a file that was never recorded reports "unknown"', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    const result = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'job-1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'unknown');
  } finally {
    cleanup(ctx);
  }
});

test('record requires --file', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['record', '--job', 'job-1'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout + result.stderr, /--file is required/);
  } finally {
    cleanup(ctx);
  }
});

test('record requires --job', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['record', '--file', 'a.md'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout + result.stderr, /--job is required/);
  } finally {
    cleanup(ctx);
  }
});

test('record errors when the job folder does not exist', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    const result = runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'nope'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout + result.stderr, /Job folder not found/);
  } finally {
    cleanup(ctx);
  }
});

test('record errors when the file itself does not exist', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    const result = runScript(SCRIPT, ['record', '--file', 'missing.md', '--job', 'job-1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout + result.stderr, /File not found: missing\.md/);
  } finally {
    cleanup(ctx);
  }
});

test('recording a file writes it into the job ledger', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    const result = runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1'], ctx);
    assert.strictEqual(result.status, 0);
    const ledger = JSON.parse(fs.readFileSync(ledgerPath(ctx, 'job-1'), 'utf8'));
    assert.ok(ledger.files['a.md']);
    assert.ok(ledger.files['a.md'].hash);
    assert.ok(ledger.files['a.md'].recordedAt);
  } finally {
    cleanup(ctx);
  }
});

test('checking an unchanged file after recording it reports "fresh"', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1'], ctx);
    const result = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'job-1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'fresh');
  } finally {
    cleanup(ctx);
  }
});

test('checking a file whose content changed since recording reports "stale"', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1'], ctx);
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'goodbye');
    const result = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'job-1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'stale');
  } finally {
    cleanup(ctx);
  }
});

test('checking a file that was deleted since recording reports "stale"', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1'], ctx);
    fs.rmSync(path.join(ctx.cwd, 'a.md'));
    const result = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'job-1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'stale');
  } finally {
    cleanup(ctx);
  }
});

test('re-recording an already-tracked file overwrites its ledger entry rather than duplicating it', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1'], ctx);
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'updated content');
    runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1'], ctx);
    const ledger = JSON.parse(fs.readFileSync(ledgerPath(ctx, 'job-1'), 'utf8'));
    assert.strictEqual(Object.keys(ledger.files).length, 1);
    const result = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'job-1'], ctx);
    assert.strictEqual(result.stdout.trim(), 'fresh');
  } finally {
    cleanup(ctx);
  }
});

test('two different files tracked under the same job do not interfere with each other', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello a');
    fs.writeFileSync(path.join(ctx.cwd, 'b.md'), 'hello b');
    runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1'], ctx);
    runScript(SCRIPT, ['record', '--file', 'b.md', '--job', 'job-1'], ctx);
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'changed a');
    const staleResult = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'job-1'], ctx);
    const freshResult = runScript(SCRIPT, ['check', '--file', 'b.md', '--job', 'job-1'], ctx);
    assert.strictEqual(staleResult.stdout.trim(), 'stale');
    assert.strictEqual(freshResult.stdout.trim(), 'fresh');
  } finally {
    cleanup(ctx);
  }
});

test('check --json prints a machine-readable summary', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1'], ctx);
    const result = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'job-1', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.file, 'a.md');
    assert.strictEqual(data.status, 'fresh');
    assert.ok(data.recorded.hash);
  } finally {
    cleanup(ctx);
  }
});

test('check --json on a never-recorded file has a null "recorded" field', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    const result = runScript(SCRIPT, ['check', '--file', 'a.md', '--job', 'job-1', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.status, 'unknown');
    assert.strictEqual(data.recorded, null);
  } finally {
    cleanup(ctx);
  }
});

test('record --json prints the recorded entry as JSON', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'hello');
    const result = runScript(SCRIPT, ['record', '--file', 'a.md', '--job', 'job-1', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.file, 'a.md');
    assert.strictEqual(data.recorded, true);
    assert.ok(data.hash);
  } finally {
    cleanup(ctx);
  }
});

run();
