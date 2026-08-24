'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'token-estimator.js');

function writeConfig(ctx, data) {
  const configPath = path.join(ctx.home, '.xoch', 'config.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(data));
}

function jobDir(ctx, job) {
  return path.join(ctx.cwd, '.xoch', 'work', 'jobs', job);
}

function arcDir(ctx, arc) {
  return path.join(ctx.cwd, '.xoch', 'work', 'arcs', arc);
}

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage: token-estimator\.js/);
    assert.match(result.stdout, /--batch/);
    assert.match(result.stdout, /budget check/);
    assert.match(result.stdout, /budget record/);
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
    assert.match(result.stdout, /small\.md.*12 tokens/);
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
    assert.match(result.stdout, /✅ PASS - 12 \/ 3000 tokens \(0%\)/);
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
    assert.strictEqual(result.stdout.trim(), '{"chars": 35, "tokens": 12, "limit": 3000, "percentage": 0, "status": 0}');
  } finally {
    cleanup(ctx);
  }
});

test('a file in the warn range reports "Approaching limit" and exits 1', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'warn.txt'), 'x'.repeat(8410));
    const result = runScript(SCRIPT, ['warn.txt'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Status: ⚠️ WARN/);
    assert.match(result.stdout, /Approaching limit \(~100 tokens remaining\)/);
  } finally {
    cleanup(ctx);
  }
});

test('a file in the warn range shows "WARN" in check mode', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'warn.txt'), 'x'.repeat(8410));
    const result = runScript(SCRIPT, ['warn.txt', 'check'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /⚠️ WARN - 2900 \/ 3000 tokens \(96%\)/);
  } finally {
    cleanup(ctx);
  }
});

test('an oversized file reports "Over limit" and exits 2', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'big.txt'), 'x'.repeat(8990));
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
    fs.writeFileSync(path.join(ctx.cwd, 'big.txt'), 'x'.repeat(8990));
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

// --- budget check ---

test('budget check requires --skill', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['budget', 'check', '--files'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout + result.stderr, /--skill is required/);
  } finally {
    cleanup(ctx);
  }
});

test('budget check reports PASS for a file list under the configured skill budget', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(145));
    const result = runScript(SCRIPT, ['budget', 'check', '--skill', 'testskill', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Tokens: 50 \/ 100 \(50%\)/);
    assert.match(result.stdout, /Status: PASS/);
  } finally {
    cleanup(ctx);
  }
});

test('budget check reports WARN for a file list approaching the configured skill budget', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(276));
    const result = runScript(SCRIPT, ['budget', 'check', '--skill', 'testskill', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Tokens: 95 \/ 100 \(95%\)/);
    assert.match(result.stdout, /Status: WARN/);
  } finally {
    cleanup(ctx);
  }
});

test('budget check reports FAIL for a file list over the configured skill budget', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(348));
    const result = runScript(SCRIPT, ['budget', 'check', '--skill', 'testskill', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout, /Tokens: 120 \/ 100 \(120%\)/);
    assert.match(result.stdout, /Status: FAIL/);
  } finally {
    cleanup(ctx);
  }
});

test('budget check with no --files flag at all treats the file list as empty', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    const result = runScript(SCRIPT, ['budget', 'check', '--skill', 'testskill'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Tokens: 0 \/ 100 \(0%\)/);
  } finally {
    cleanup(ctx);
  }
});

test('budget check falls back to the built-in default budget for a known skill with no config override', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['budget', 'check', '--skill', 'spec', '--files'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /\/ 5000 /);
  } finally {
    cleanup(ctx);
  }
});

test('budget check falls back to the generic default budget for an unrecognized skill', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['budget', 'check', '--skill', 'some-unknown-skill', '--files'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /\/ 5000 /);
  } finally {
    cleanup(ctx);
  }
});

test('budget check lists missing files without crashing', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['budget', 'check', '--skill', 'spec', '--files', 'missing.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Missing files: missing\.md/);
  } finally {
    cleanup(ctx);
  }
});

test('budget check --json prints a machine-readable summary', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(145));
    const result = runScript(SCRIPT, ['budget', 'check', '--skill', 'testskill', '--json', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.skill, 'testskill');
    assert.strictEqual(data.tokens, 50);
    assert.strictEqual(data.budget, 100);
    assert.strictEqual(data.status, 'pass');
    assert.deepStrictEqual(data.files, ['a.md']);
  } finally {
    cleanup(ctx);
  }
});

// --- budget record ---

test('budget record requires --skill', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['budget', 'record', '--job', 'job-1', '--files'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout + result.stderr, /--skill is required/);
  } finally {
    cleanup(ctx);
  }
});

test('an unrecognized budget subcommand prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['budget', 'bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout, /Usage: token-estimator\.js/);
  } finally {
    cleanup(ctx);
  }
});

test('budget record requires --job', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['budget', 'record', '--skill', 'spec', '--files'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout + result.stderr, /--job is required/);
  } finally {
    cleanup(ctx);
  }
});

test('budget record errors when the job folder does not exist', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['budget', 'record', '--skill', 'spec', '--job', 'nope', '--files'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout + result.stderr, /Job folder not found/);
  } finally {
    cleanup(ctx);
  }
});

test('budget record within budget appends an entry to the job token usage report', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(145));
    const result = runScript(SCRIPT, ['budget', 'record', '--skill', 'testskill', '--job', 'job-1', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    const report = JSON.parse(fs.readFileSync(path.join(jobDir(ctx, 'job-1'), 'token-usage.json'), 'utf8'));
    assert.strictEqual(report.entries.length, 1);
    assert.strictEqual(report.entries[0].skill, 'testskill');
    assert.strictEqual(report.entries[0].tokens, 50);
    assert.strictEqual(report.entries[0].budget, 100);
    assert.strictEqual(report.entries[0].status, 'pass');
    assert.strictEqual(report.entries[0].waiver, null);
    assert.ok(report.entries[0].timestamp);
    assert.strictEqual(report.totalTokens, 50);
  } finally {
    cleanup(ctx);
  }
});

test('budget record accumulates totalTokens and entries across repeated calls', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(145));
    runScript(SCRIPT, ['budget', 'record', '--skill', 'testskill', '--job', 'job-1', '--files', 'a.md'], ctx);
    runScript(SCRIPT, ['budget', 'record', '--skill', 'testskill', '--job', 'job-1', '--files', 'a.md'], ctx);
    const report = JSON.parse(fs.readFileSync(path.join(jobDir(ctx, 'job-1'), 'token-usage.json'), 'utf8'));
    assert.strictEqual(report.entries.length, 2);
    assert.strictEqual(report.totalTokens, 100);
  } finally {
    cleanup(ctx);
  }
});

test('budget record also writes to the arc token usage report when --arc is given', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(145));
    const result = runScript(SCRIPT, ['budget', 'record', '--skill', 'testskill', '--job', 'job-1', '--arc', 'arc-1', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    const report = JSON.parse(fs.readFileSync(path.join(arcDir(ctx, 'arc-1'), 'token-usage.json'), 'utf8'));
    assert.strictEqual(report.entries.length, 1);
    assert.strictEqual(report.entries[0].tokens, 50);
  } finally {
    cleanup(ctx);
  }
});

test('budget record over budget without --waiver refuses to write and exits non-zero', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(348));
    const result = runScript(SCRIPT, ['budget', 'record', '--skill', 'testskill', '--job', 'job-1', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout + result.stderr, /Refusing to record without --waiver/);
    assert.ok(!fs.existsSync(path.join(jobDir(ctx, 'job-1'), 'token-usage.json')));
  } finally {
    cleanup(ctx);
  }
});

test('budget record over budget without --waiver, in --json mode, reports the refusal as JSON', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(348));
    const result = runScript(SCRIPT, ['budget', 'record', '--skill', 'testskill', '--job', 'job-1', '--json', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 2);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.recorded, false);
    assert.match(data.error, /Refusing to record without --waiver/);
    assert.ok(!fs.existsSync(path.join(jobDir(ctx, 'job-1'), 'token-usage.json')));
  } finally {
    cleanup(ctx);
  }
});

test('budget record --json prints the recorded entry as JSON', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(145));
    const result = runScript(SCRIPT, ['budget', 'record', '--skill', 'testskill', '--job', 'job-1', '--json', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.recorded, true);
    assert.strictEqual(data.tokens, 50);
    assert.strictEqual(data.skill, 'testskill');
  } finally {
    cleanup(ctx);
  }
});

test('budget record over budget with --waiver succeeds and records the reason', () => {
  const ctx = scratch();
  try {
    writeConfig(ctx, { tokenBudgets: { testskill: 100 } });
    fs.mkdirSync(jobDir(ctx, 'job-1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'x'.repeat(348));
    const result = runScript(SCRIPT, ['budget', 'record', '--skill', 'testskill', '--job', 'job-1', '--waiver', 'engineer approved, one-off large read', '--files', 'a.md'], ctx);
    assert.strictEqual(result.status, 2);
    const report = JSON.parse(fs.readFileSync(path.join(jobDir(ctx, 'job-1'), 'token-usage.json'), 'utf8'));
    assert.strictEqual(report.entries.length, 1);
    assert.strictEqual(report.entries[0].status, 'fail');
    assert.strictEqual(report.entries[0].waiver, 'engineer approved, one-off large read');
  } finally {
    cleanup(ctx);
  }
});

run();
