'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'coverage-actions.js');

function makeJob(ctx, jobId, { spec = '', plan = '', review = '', snapshots = {} } = {}) {
  const jobDir = path.join(ctx.cwd, '.xoch', 'work', 'jobs', jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  if (spec !== null) fs.writeFileSync(path.join(jobDir, 'spec.md'), spec);
  if (plan !== null) fs.writeFileSync(path.join(jobDir, 'plan.md'), plan);
  if (review !== null) fs.writeFileSync(path.join(jobDir, 'review.md'), review);
  if (Object.keys(snapshots).length) {
    const snapDir = path.join(jobDir, 'snapshots');
    fs.mkdirSync(snapDir, { recursive: true });
    for (const [name, content] of Object.entries(snapshots)) {
      fs.writeFileSync(path.join(snapDir, name), content);
    }
  }
  return jobDir;
}

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

test('no command prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, [], ctx);
    assert.strictEqual(result.status, 2);
  } finally {
    cleanup(ctx);
  }
});

test('an unrecognized command (with a valid job) exits 1 with "Unknown command"', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', { spec: 'AC-001' });
    const result = runScript(SCRIPT, ['bogus', '--job', 'job1', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Unknown command: bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('missing --job exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['compare'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--job is required/);
  } finally {
    cleanup(ctx);
  }
});

test('a job folder that does not exist exits 1', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['compare', '--job', 'nope', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Job folder not found/);
  } finally {
    cleanup(ctx);
  }
});

test('compare with no acceptance criteria in spec.md exits 1', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', { spec: 'no criteria here' });
    const result = runScript(SCRIPT, ['compare', '--job', 'job1', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /No acceptance criteria found/);
  } finally {
    cleanup(ctx);
  }
});

test('compare with an invalid --require exits 1', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', { spec: 'AC-001' });
    const result = runScript(SCRIPT, ['compare', '--job', 'job1', '--root', ctx.cwd, '--require', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /--require must be plan, snapshots, review, or all/);
  } finally {
    cleanup(ctx);
  }
});

test('compare defaults --require to "all" and reports missing/orphaned AC ids across every stage, in JSON mode', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', {
      spec: 'AC-001, AC-002, AC-NF-003',
      plan: 'AC-001, AC-orphan-in-plan reference AC-9',
      review: 'AC-001',
      snapshots: { 'phase-1.md': 'AC-001' },
    });
    const result = runScript(SCRIPT, ['compare', '--job', 'job1', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.spec, ['AC-001', 'AC-002', 'AC-NF-003']);
    assert.deepStrictEqual(data.missing_from_plan, ['AC-002', 'AC-NF-003']);
    assert.deepStrictEqual(data.missing_from_snapshots, ['AC-002', 'AC-NF-003']);
    assert.deepStrictEqual(data.missing_from_review, ['AC-002', 'AC-NF-003']);
    assert.deepStrictEqual(data.orphaned_in_plan, ['AC-9']);
    assert.deepStrictEqual(data.orphaned_in_snapshots, []);
    assert.deepStrictEqual(data.orphaned_in_review, []);
  } finally {
    cleanup(ctx);
  }
});

test('compare with everything covered exits 0, in text mode, with lowercase AC ids uppercased and deduped', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', {
      spec: 'ac-001 AC-001 AC-001',
      plan: 'AC-001',
      review: 'AC-001',
      snapshots: { 'phase-1.md': 'AC-001', 'phase-2.md': 'AC-001' },
    });
    const result = runScript(SCRIPT, ['compare', '--job', 'job1', '--root', ctx.cwd, '--require', 'all'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /spec: AC-001/);
    assert.match(result.stdout, /missing_from_plan: none/);
  } finally {
    cleanup(ctx);
  }
});

test('compare --require plan only checks the plan stage, ignoring snapshot/review gaps', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', {
      spec: 'AC-001',
      plan: 'AC-001',
      review: '',
      snapshots: {},
    });
    const result = runScript(SCRIPT, ['compare', '--job', 'job1', '--root', ctx.cwd, '--require', 'plan'], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('compare --require snapshots checks plan and snapshots but not review', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', {
      spec: 'AC-001',
      plan: 'AC-001',
      review: '',
      snapshots: { 'phase-1.md': 'AC-001' },
    });
    const result = runScript(SCRIPT, ['compare', '--job', 'job1', '--root', ctx.cwd, '--require', 'snapshots'], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('compare with a job that has no snapshots directory treats snapshot ids as empty', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', { spec: 'AC-001', plan: 'AC-001', review: 'AC-001' });
    const result = runScript(SCRIPT, ['compare', '--job', 'job1', '--root', ctx.cwd, '--require', 'review', '--json'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.snapshots, []);
    assert.deepStrictEqual(data.missing_from_snapshots, ['AC-001']);
  } finally {
    cleanup(ctx);
  }
});

test('create-review with no acceptance criteria in spec.md exits 1', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', { spec: 'no criteria' });
    const result = runScript(SCRIPT, ['create-review', '--job', 'job1', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /No acceptance criteria found/);
  } finally {
    cleanup(ctx);
  }
});

test('create-review scaffolds a review.md with a row per AC id', () => {
  const ctx = scratch();
  try {
    const jobDir = makeJob(ctx, 'job1', { spec: 'AC-001 AC-002', review: null });
    const result = runScript(SCRIPT, ['create-review', '--job', 'job1', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Review scaffolded/);
    const content = fs.readFileSync(path.join(jobDir, 'review.md'), 'utf8');
    assert.match(content, /\| AC-001 \| Not Verified \| \| \|/);
    assert.match(content, /\| AC-002 \| Not Verified \| \| \|/);
  } finally {
    cleanup(ctx);
  }
});

test('create-review refuses to overwrite an existing review.md without --force', () => {
  const ctx = scratch();
  try {
    makeJob(ctx, 'job1', { spec: 'AC-001', review: 'existing content' });
    const result = runScript(SCRIPT, ['create-review', '--job', 'job1', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Review already exists/);
  } finally {
    cleanup(ctx);
  }
});

test('create-review --force overwrites an existing review.md', () => {
  const ctx = scratch();
  try {
    const jobDir = makeJob(ctx, 'job1', { spec: 'AC-001', review: 'existing content' });
    const result = runScript(SCRIPT, ['create-review', '--job', 'job1', '--root', ctx.cwd, '--force'], ctx);
    assert.strictEqual(result.status, 0);
    const content = fs.readFileSync(path.join(jobDir, 'review.md'), 'utf8');
    assert.notStrictEqual(content, 'existing content');
    assert.match(content, /AC-001/);
  } finally {
    cleanup(ctx);
  }
});

run();
