'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { test, run: runTests } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'xoch-actions.js');

function run(args, ctx, input) {
  return runScript(SCRIPT, args, ctx, input);
}

// Direct in-process call to an exported function, isolated in its own
// subprocess via `node -e`. Used only for workflowAction's unknown-action
// branch, which is dead from the CLI's own dispatch (main() only ever
// passes the literal 'begin'/'update'/'complete'/'abandon' strings) but is
// still reachable through the exported function itself.
function callExported(fnName, args, ctx) {
  const script = `require(${JSON.stringify(SCRIPT)}).${fnName}(${args.map((a) => JSON.stringify(a)).join(', ')});`;
  return spawnSync(process.execPath, ['-e', script], {
    cwd: ctx.cwd,
    env: { ...process.env, HOME: ctx.home },
    encoding: 'utf8',
  });
}

function xochRootDir(ctx) {
  return path.join(ctx.cwd, '.xoch');
}

function jobDirOf(ctx, id) {
  return path.join(xochRootDir(ctx), 'work', 'jobs', id);
}

function arcDirOf(ctx, id) {
  return path.join(xochRootDir(ctx), 'work', 'arcs', id);
}

function pointerPath(ctx) {
  return path.join(xochRootDir(ctx), 'work', 'current.json');
}

function readJsonFile(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readStateLines(dir) {
  return fs.readFileSync(path.join(dir, 'state.md'), 'utf8').split('\n');
}

function fieldValue(dir, field) {
  const line = readStateLines(dir).find((l) => l.startsWith(`${field}:`));
  return line ? line.slice(field.length + 1).trim() : undefined;
}

// Seeds a job directory with a minimal, fully-scalar state.md -- bypassing
// `job open` -- for tests that only care about a later command's own
// behavior (evidence, state set, workflow, phase advance, ...).
function seedJob(ctx, id, overrides = {}) {
  const dir = jobDirOf(ctx, id);
  fs.mkdirSync(dir, { recursive: true });
  const fields = {
    job_id: id,
    title: id,
    description: id,
    status: 'phase_ready',
    arc: 'standalone',
    current_phase: '1',
    phase_count: '1',
    current_phase_title: 'Test Phase',
    current_phase_goal: 'Goal',
    next_command: 'xoch-make',
    started: '2026-08-19',
    last_updated: '2026-08-19',
    active_workflow: 'null',
    workflow_stage: 'null',
    pending_action: 'null',
    workflow_artifact: 'null',
    return_command: 'null',
    workflow_started_at: 'null',
    review_status: 'null',
    closure_status: 'null',
    ...overrides,
  };
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`);
  fs.writeFileSync(path.join(dir, 'state.md'), `${lines.join('\n')}\n`);
  return dir;
}

function seedArc(ctx, id, overrides = {}) {
  const dir = arcDirOf(ctx, id);
  fs.mkdirSync(dir, { recursive: true });
  const fields = { arc_id: id, title: id, status: 'active', started: '2026-08-19', last_updated: '2026-08-19', ...overrides };
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  fs.writeFileSync(path.join(dir, 'state.md'), `${lines.join('\n')}\n`);
  return dir;
}

function seedPointer(ctx, job, workflow = null, extra = {}) {
  const p = pointerPath(ctx);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // job.directory must match what xochRoot() itself would compute (the
  // relative ".xoch/..." form in default in-repo mode) -- validatePointer
  // compares against that exact string, not an absolute path.
  const data = {
    version: 1,
    job: { id: job.id, title: job.title || job.id, arc: job.arc || 'standalone', directory: job.directory || path.join('.xoch', 'work', 'jobs', job.id) },
    workflow,
    updated_at: '2026-08-19T00:00:00Z',
    ...extra,
  };
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

// ---------------------------------------------------------------------
// Dispatch / usage
// ---------------------------------------------------------------------

test('no arguments prints usage and exits 1, but still creates the storage root', () => {
  const ctx = scratch();
  try {
    const result = run([], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Usage:/);
    assert.ok(fs.existsSync(xochRootDir(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('--help prints usage and exits 0', () => {
  const ctx = scratch();
  try {
    const result = run(['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('-h prints usage and exits 0', () => {
  const ctx = scratch();
  try {
    const result = run(['-h'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown group:action pair exits 1 with an error', () => {
  const ctx = scratch();
  try {
    const result = run(['bogus', 'thing'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown action: bogus thing/);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown action within a known group exits 1 with an error', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown action: job bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('a group with no action at all exits 1 with a trailing-space error', () => {
  const ctx = scratch();
  try {
    const result = run(['job'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown action: job \n/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// config root
// ---------------------------------------------------------------------

test('config root defaults to the relative .xoch path', () => {
  const ctx = scratch();
  try {
    const result = run(['config', 'root'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), '.xoch');
  } finally {
    cleanup(ctx);
  }
});

test('config root resolves to an absolute centralized path when configured', () => {
  const ctx = scratch();
  try {
    const configPath = path.join(ctx.home, '.xoch', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ storage: { mode: 'centralized' } }));
    const result = run(['config', 'root'], ctx);
    assert.strictEqual(result.status, 0);
    const expected = path.join(ctx.home, '.xoch', 'projects', path.basename(ctx.cwd));
    assert.strictEqual(result.stdout.trim(), expected);
  } finally {
    cleanup(ctx);
  }
});

test('an invalid storage.mode value falls back to in-repo', () => {
  const ctx = scratch();
  try {
    const configPath = path.join(ctx.home, '.xoch', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ storage: { mode: 'bogus' } }));
    const result = run(['config', 'root'], ctx);
    assert.strictEqual(result.stdout.trim(), '.xoch');
  } finally {
    cleanup(ctx);
  }
});

test('a config file with no storage key at all falls back to in-repo', () => {
  const ctx = scratch();
  try {
    const configPath = path.join(ctx.home, '.xoch', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ version: 1 }));
    const result = run(['config', 'root'], ctx);
    assert.strictEqual(result.stdout.trim(), '.xoch');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// job open
// ---------------------------------------------------------------------

test('job open requires --title', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'open'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /job open requires --title/);
  } finally {
    cleanup(ctx);
  }
});

test('job open derives an id from the title when --id is omitted', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'open', '--title', 'My Cool Job!'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Job opened: my-cool-job/);
    const dir = jobDirOf(ctx, 'my-cool-job');
    assert.ok(fs.existsSync(path.join(dir, 'state.md')));
    for (const sub of ['notes', 'phases', 'revisions', 'snapshots']) {
      assert.ok(fs.statSync(path.join(dir, sub)).isDirectory());
    }
  } finally {
    cleanup(ctx);
  }
});

test('job open honors an explicit --id over the title', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'open', '--title', 'A Title', '--id', 'custom-id'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Job opened: custom-id/);
  } finally {
    cleanup(ctx);
  }
});

test('job open writes state.md with defaults and the given overrides', () => {
  const ctx = scratch();
  try {
    run(['job', 'open', '--title', 'T', '--id', 'j1', '--arc', 'my-arc', '--description', 'Desc', '--doc-scope', 'docs', '--doc-path', 'README.md'], ctx);
    const dir = jobDirOf(ctx, 'j1');
    assert.strictEqual(fieldValue(dir, 'job_id'), 'j1');
    assert.strictEqual(fieldValue(dir, 'title'), 'T');
    assert.strictEqual(fieldValue(dir, 'description'), 'Desc');
    assert.strictEqual(fieldValue(dir, 'status'), 'active');
    assert.strictEqual(fieldValue(dir, 'arc'), 'my-arc');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-spec');
    const content = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(content, /scope: docs\n\s+path: README\.md/);
  } finally {
    cleanup(ctx);
  }
});

test('job open defaults arc to standalone and description to the title', () => {
  const ctx = scratch();
  try {
    run(['job', 'open', '--title', 'Just A Title', '--id', 'j2'], ctx);
    const dir = jobDirOf(ctx, 'j2');
    assert.strictEqual(fieldValue(dir, 'arc'), 'standalone');
    assert.strictEqual(fieldValue(dir, 'description'), 'Just A Title');
  } finally {
    cleanup(ctx);
  }
});

test('job open writes the current pointer and removes a stale current.md', () => {
  const ctx = scratch();
  try {
    const staleMd = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(staleMd), { recursive: true });
    fs.writeFileSync(staleMd, '**Job ID**: stale\n');
    run(['job', 'open', '--title', 'New Job', '--id', 'newjob'], ctx);
    assert.ok(!fs.existsSync(staleMd));
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.job.id, 'newjob');
    assert.strictEqual(pointer.workflow, null);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// job set-current
// ---------------------------------------------------------------------

test('job set-current requires --job', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'set-current'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /job set-current requires --job/);
  } finally {
    cleanup(ctx);
  }
});

test('job set-current fails when the job state does not exist', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'set-current', '--job', 'missing'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /state not found/);
  } finally {
    cleanup(ctx);
  }
});

test('job set-current writes a pointer from the job state, defaulting missing fields', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { title: undefined, arc: undefined, started: undefined });
    const result = run(['job', 'set-current', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Current job set: j1/);
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.job.id, 'j1');
    assert.strictEqual(pointer.job.title, 'j1');
    assert.strictEqual(pointer.job.arc, 'standalone');
    assert.ok(pointer.started_at);
    assert.strictEqual(pointer.workflow, null);
  } finally {
    cleanup(ctx);
  }
});

test('job set-current projects an active workflow from state into the pointer', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { active_workflow: 'doing-thing', workflow_stage: 'in_progress', pending_action: 'continue_workflow' });
    run(['job', 'set-current', '--job', 'j1'], ctx);
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.workflow.name, 'doing-thing');
    assert.strictEqual(pointer.workflow.stage, 'in_progress');
    assert.strictEqual(pointer.workflow.return_command, 'xoch-make');
  } finally {
    cleanup(ctx);
  }
});

test('job set-current defaults workflow stage/pending action when state omits them', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { active_workflow: 'doing-thing', workflow_stage: undefined, pending_action: undefined, return_command: undefined });
    run(['job', 'set-current', '--job', 'j1'], ctx);
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.workflow.stage, 'in_progress');
    assert.strictEqual(pointer.workflow.pending_action, 'resume_workflow');
  } finally {
    cleanup(ctx);
  }
});

test('job set-current falls back to the workflow name for return_command when both return_command and next_command are absent', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { active_workflow: 'doing-thing', return_command: undefined, next_command: undefined });
    run(['job', 'set-current', '--job', 'j1'], ctx);
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.workflow.return_command, 'doing-thing');
  } finally {
    cleanup(ctx);
  }
});

test('job set-current removes a stale current.md', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const staleMd = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(staleMd), { recursive: true });
    fs.writeFileSync(staleMd, '**Job ID**: stale\n');
    run(['job', 'set-current', '--job', 'j1'], ctx);
    assert.ok(!fs.existsSync(staleMd));
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// job current
// ---------------------------------------------------------------------

test('job current with no pointer at all reports none, in text and json', () => {
  const ctx = scratch();
  try {
    const text = run(['job', 'current'], ctx);
    assert.strictEqual(text.status, 0);
    assert.match(text.stdout, /No active Xoch job\./);
    const json = run(['job', 'current', '--json'], ctx);
    assert.strictEqual(json.stdout.trim(), '{}');
  } finally {
    cleanup(ctx);
  }
});

test('job current reads an existing valid pointer, in text and json', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' });
    const text = run(['job', 'current'], ctx);
    assert.strictEqual(text.status, 0);
    assert.match(text.stdout, /job_id: j1/);
    assert.match(text.stdout, /active_workflow: none/);
    const json = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(json.stdout);
    assert.strictEqual(data.job.id, 'j1');
    assert.strictEqual(data.pointer, path.join('.xoch', 'work', 'current.json'));
  } finally {
    cleanup(ctx);
  }
});

test('job current text mode shows the active workflow name and stage when one is present', () => {
  const ctx = scratch();
  try {
    seedActiveWorkflow(ctx, 'j1', { stage: 'reviewing' });
    const result = run(['job', 'current'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /active_workflow: my-flow/);
    assert.match(result.stdout, /workflow_stage: reviewing/);
  } finally {
    cleanup(ctx);
  }
});

test('job current rejects invalid JSON in the pointer file', () => {
  const ctx = scratch();
  try {
    const p = pointerPath(ctx);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, '{ not json');
    const result = run(['job', 'current'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Invalid JSON in/);
  } finally {
    cleanup(ctx);
  }
});

test('job current rejects a pointer with the wrong version', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const p = pointerPath(ctx);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ version: 2, job: { id: 'j1', directory: jobDirOf(ctx, 'j1') } }));
    const result = run(['job', 'current'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Invalid Xoch pointer version/);
  } finally {
    cleanup(ctx);
  }
});

test('job current rejects a pointer missing job.id or job.directory', () => {
  const ctx = scratch();
  try {
    const p = pointerPath(ctx);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ version: 1, job: { id: 'j1' } }));
    const result = run(['job', 'current'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Invalid Xoch job pointer/);
  } finally {
    cleanup(ctx);
  }
});

test('job current rejects a pointer whose job.directory does not match the expected path', () => {
  const ctx = scratch();
  try {
    const p = pointerPath(ctx);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ version: 1, job: { id: 'j1', directory: '/wrong/path' } }));
    const result = run(['job', 'current'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Invalid Xoch job directory/);
  } finally {
    cleanup(ctx);
  }
});

test('job current rejects a pointer workflow missing required fields', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' }, { name: 'wf', stage: 'in_progress' });
    const result = run(['job', 'current'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Invalid Xoch workflow pointer/);
    assert.match(result.stderr, /pending_action, return_command/);
  } finally {
    cleanup(ctx);
  }
});

test('job current syncs the pointer workflow to match the job state when they differ', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { active_workflow: 'my-flow', workflow_stage: 'in_progress', pending_action: 'continue_workflow', next_command: 'xoch-make' });
    seedPointer(ctx, { id: 'j1' }, null);
    const before = readJsonFile(pointerPath(ctx));
    assert.strictEqual(before.workflow, null);

    const result = run(['job', 'current', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.workflow.name, 'my-flow');

    const after = readJsonFile(pointerPath(ctx));
    assert.strictEqual(after.workflow.name, 'my-flow');
    assert.notStrictEqual(after.updated_at, before.updated_at);
  } finally {
    cleanup(ctx);
  }
});

test('job current preserves the existing workflow\'s started_at when the job state omits it, while syncing other fields', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { active_workflow: 'my-flow', workflow_stage: 'new-stage', pending_action: 'continue_workflow', workflow_started_at: undefined });
    seedPointer(ctx, { id: 'j1' }, {
      name: 'my-flow',
      stage: 'old-stage',
      pending_action: 'continue_workflow',
      artifact: null,
      return_command: 'xoch-make',
      started_at: '2020-01-01T00:00:00Z',
    });
    const result = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.workflow.stage, 'new-stage');
    assert.strictEqual(data.workflow.started_at, '2020-01-01T00:00:00Z');
  } finally {
    cleanup(ctx);
  }
});

test('job current does not rewrite the pointer when the projected workflow is unchanged', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' }, null, { updated_at: '2020-01-01T00:00:00Z' });
    run(['job', 'current'], ctx);
    const after = readJsonFile(pointerPath(ctx));
    assert.strictEqual(after.updated_at, '2020-01-01T00:00:00Z');
  } finally {
    cleanup(ctx);
  }
});

test('job current migrates a target-model current.md pointer to current.json', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { title: 'Migrated Title', arc: 'my-arc' });
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Job ID**: j1\n');
    const result = run(['job', 'current', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.job.id, 'j1');
    assert.strictEqual(data.job.title, 'Migrated Title');
    assert.strictEqual(data.job.arc, 'my-arc');
    assert.ok(!fs.existsSync(md));
    assert.ok(fs.existsSync(pointerPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('a target-model current.md using **Task ID** also migrates', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Task ID**: j1\n');
    const result = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.job.id, 'j1');
  } finally {
    cleanup(ctx);
  }
});

test('a target-model current.md missing a job ID fails to migrate', () => {
  const ctx = scratch();
  try {
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Title**: No ID here\n');
    const result = run(['job', 'current'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Cannot migrate .* job ID is missing/);
  } finally {
    cleanup(ctx);
  }
});

test('a migrated current.md falls back to the job state for title and arc when the markdown omits them', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { title: 'From State', arc: 'state-arc' });
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Job ID**: j1\n');
    const result = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.job.title, 'From State');
    assert.strictEqual(data.job.arc, 'state-arc');
  } finally {
    cleanup(ctx);
  }
});

test('a migrated current.md falls all the way back to the job id and standalone when nothing else supplies title/arc', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { title: undefined, arc: undefined });
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Job ID**: j1\n');
    const result = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.job.title, 'j1');
    assert.strictEqual(data.job.arc, 'standalone');
  } finally {
    cleanup(ctx);
  }
});

test('a migrated current.md with an active workflow but no stage/pending/return/started_at defaults them (existing workflow is null)', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', {
      active_workflow: 'my-flow',
      workflow_stage: undefined,
      pending_action: undefined,
      return_command: undefined,
      next_command: undefined,
      workflow_started_at: undefined,
    });
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Job ID**: j1\n');
    const result = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.workflow.stage, 'in_progress');
    assert.strictEqual(data.workflow.pending_action, 'resume_workflow');
    // Neither return_command nor next_command is set, so it falls all the
    // way back to the workflow's own name.
    assert.strictEqual(data.workflow.return_command, 'my-flow');
    assert.strictEqual(data.workflow.started_at, null);
  } finally {
    cleanup(ctx);
  }
});

test('a migrated current.md workflow falls back to next_command when return_command is absent but next_command is set', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { active_workflow: 'my-flow', return_command: undefined, next_command: 'xoch-next-thing' });
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Job ID**: j1\n');
    const result = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.workflow.return_command, 'xoch-next-thing');
  } finally {
    cleanup(ctx);
  }
});

test('job current falls back to a legacy .xoch/context/current.md pointer, read-only', () => {
  const ctx = scratch();
  try {
    const legacyDir = path.join(ctx.cwd, '.xoch', 'context');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyDir, 'current.md'),
      '**Job ID**: legacy-job\n**Title**: Legacy Job\n**Job Directory**: /some/legacy/dir\n'
    );
    const result = run(['job', 'current', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.legacy, true);
    assert.strictEqual(data.job.id, 'legacy-job');
    assert.strictEqual(data.pointer, '.xoch/context/current.md');
    assert.ok(!fs.existsSync(pointerPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('a legacy pointer using **Task ID**/**Task Directory** is also read', () => {
  const ctx = scratch();
  try {
    const legacyDir = path.join(ctx.cwd, '.xoch', 'context');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'current.md'), '**Task ID**: legacy-job\n**Title**: Legacy Job\n**Task Directory**: /some/dir\n');
    const result = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.job.id, 'legacy-job');
    assert.strictEqual(data.job.directory, '/some/dir');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// job evidence
// ---------------------------------------------------------------------

test('job evidence requires --job', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'evidence'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /job evidence requires --job/);
  } finally {
    cleanup(ctx);
  }
});

test('job evidence fails for a job that does not exist', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'evidence', '--job', 'missing'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /job not found: missing/);
  } finally {
    cleanup(ctx);
  }
});

test('job evidence reports missing optional files as not found, in text and json', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { current_phase: undefined });
    const text = run(['job', 'evidence', '--job', 'j1'], ctx);
    assert.strictEqual(text.status, 0);
    assert.match(text.stdout, /spec: \(not found\)/);
    assert.match(text.stdout, /current_phase_snapshot: \(not found\)/);

    const json = run(['job', 'evidence', '--job', 'j1', '--json'], ctx);
    const data = JSON.parse(json.stdout);
    assert.strictEqual(data.spec, null);
    assert.strictEqual(data.current_phase, null);
    assert.strictEqual(data.current_phase_snapshot, null);
  } finally {
    cleanup(ctx);
  }
});

test('job evidence reports existing files and the current phase snapshot/body', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '3' });
    fs.writeFileSync(path.join(dir, 'spec.md'), 'spec');
    fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'snapshots', 'phase-3.md'), 'snap');
    fs.mkdirSync(path.join(dir, 'phases'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'phases', 'phase-3.md'), 'body');

    const json = run(['job', 'evidence', '--job', 'j1', '--json'], ctx);
    const data = JSON.parse(json.stdout);
    const relDir = path.join('.xoch', 'work', 'jobs', 'j1');
    assert.strictEqual(data.spec, path.join(relDir, 'spec.md'));
    assert.strictEqual(data.current_phase, '3');
    assert.strictEqual(data.current_phase_snapshot, path.join(relDir, 'snapshots', 'phase-3.md'));
    assert.strictEqual(data.current_phase_body, path.join(relDir, 'phases', 'phase-3.md'));
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// arc evidence
// ---------------------------------------------------------------------

test('arc evidence requires --arc', () => {
  const ctx = scratch();
  try {
    const result = run(['arc', 'evidence'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /arc evidence requires --arc/);
  } finally {
    cleanup(ctx);
  }
});

test('arc evidence fails for an arc that does not exist', () => {
  const ctx = scratch();
  try {
    const result = run(['arc', 'evidence', '--arc', 'missing'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /arc not found: missing/);
  } finally {
    cleanup(ctx);
  }
});

test('arc evidence reports files present and missing, in text and json', () => {
  const ctx = scratch();
  try {
    const dir = seedArc(ctx, 'a1');
    fs.writeFileSync(path.join(dir, 'jobs.md'), 'jobs');

    const text = run(['arc', 'evidence', '--arc', 'a1'], ctx);
    assert.match(text.stdout, /jobs: .*jobs\.md/);
    assert.match(text.stdout, /notes: \(not found\)/);

    const json = run(['arc', 'evidence', '--arc', 'a1', '--json'], ctx);
    const data = JSON.parse(json.stdout);
    const relDir = path.join('.xoch', 'work', 'arcs', 'a1');
    assert.strictEqual(data.jobs, path.join(relDir, 'jobs.md'));
    assert.strictEqual(data.notes, null);
    assert.strictEqual(data.revisions_dir, path.join(relDir, 'revisions'));
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// state set
// ---------------------------------------------------------------------

test('state set requires --job and --field', () => {
  const ctx = scratch();
  try {
    const missingJob = run(['state', 'set', '--field', 'f', '--value', 'v'], ctx);
    assert.strictEqual(missingJob.status, 1);
    assert.match(missingJob.stderr, /state set requires --job/);

    seedJob(ctx, 'j1');
    const missingField = run(['state', 'set', '--job', 'j1', '--value', 'v'], ctx);
    assert.strictEqual(missingField.status, 1);
    assert.match(missingField.stderr, /state set requires --field/);
  } finally {
    cleanup(ctx);
  }
});

test('state set fails when the job state does not exist', () => {
  const ctx = scratch();
  try {
    const result = run(['state', 'set', '--job', 'missing', '--field', 'f', '--value', 'v'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /state not found/);
  } finally {
    cleanup(ctx);
  }
});

test('state set replaces an existing field and bumps last_updated', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { last_updated: '2020-01-01' });
    const result = run(['state', 'set', '--job', 'j1', '--field', 'status', '--value', 'phase_ready'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Updated .*state\.md: status=phase_ready/);
    assert.strictEqual(fieldValue(dir, 'status'), 'phase_ready');
    assert.notStrictEqual(fieldValue(dir, 'last_updated'), '2020-01-01');
  } finally {
    cleanup(ctx);
  }
});

test('state set appends a field that does not already exist in the file', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    run(['state', 'set', '--job', 'j1', '--field', 'brand_new_field', '--value', 'hello'], ctx);
    assert.strictEqual(fieldValue(dir, 'brand_new_field'), 'hello');
  } finally {
    cleanup(ctx);
  }
});

test('state set appends last_updated when the file has no such line at all', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { last_updated: undefined });
    assert.strictEqual(fieldValue(dir, 'last_updated'), undefined);
    run(['state', 'set', '--job', 'j1', '--field', 'status', '--value', 'active'], ctx);
    assert.ok(fieldValue(dir, 'last_updated'));
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// pointer clear
// ---------------------------------------------------------------------

test('pointer clear requires --job', () => {
  const ctx = scratch();
  try {
    const result = run(['pointer', 'clear'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /pointer clear requires --job/);
  } finally {
    cleanup(ctx);
  }
});

test('pointer clear removes current.json only when its job id matches', () => {
  const ctx = scratch();
  try {
    seedPointer(ctx, { id: 'other-job' });
    const resultNoMatch = run(['pointer', 'clear', '--job', 'j1'], ctx);
    assert.strictEqual(resultNoMatch.status, 0);
    assert.ok(fs.existsSync(pointerPath(ctx)));
    assert.ok(!resultNoMatch.stdout.includes('Cleared pointer'));

    seedPointer(ctx, { id: 'j1' });
    const resultMatch = run(['pointer', 'clear', '--job', 'j1'], ctx);
    assert.match(resultMatch.stdout, /Cleared pointer:/);
    assert.ok(!fs.existsSync(pointerPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('pointer clear removes a matching current.md and legacy pointer, leaves non-matching alone', () => {
  const ctx = scratch();
  try {
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Job ID**: j1\n');

    const legacyDir = path.join(ctx.cwd, '.xoch', 'context');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'current.md'), '**Task ID**: other\n');

    const result = run(['pointer', 'clear', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(!fs.existsSync(md));
    assert.ok(fs.existsSync(path.join(legacyDir, 'current.md')));
  } finally {
    cleanup(ctx);
  }
});

test('pointer clear is a no-op when none of the pointer files exist', () => {
  const ctx = scratch();
  try {
    const result = run(['pointer', 'clear', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, '');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// arc open
// ---------------------------------------------------------------------

test('arc open requires --title', () => {
  const ctx = scratch();
  try {
    const result = run(['arc', 'open'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /arc open requires --title/);
  } finally {
    cleanup(ctx);
  }
});

test('arc open derives an id from the title and writes state/jobs/notes', () => {
  const ctx = scratch();
  try {
    const result = run(['arc', 'open', '--title', 'My Arc!'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Arc opened: my-arc/);
    const dir = arcDirOf(ctx, 'my-arc');
    assert.ok(fs.existsSync(path.join(dir, 'state.md')));
    assert.ok(fs.existsSync(path.join(dir, 'jobs.md')));
    assert.ok(fs.existsSync(path.join(dir, 'notes.md')));
    const jobs = fs.readFileSync(path.join(dir, 'jobs.md'), 'utf8');
    assert.match(jobs, /## Active\n\n- None/);
  } finally {
    cleanup(ctx);
  }
});

test('arc open honors an explicit --id, --purpose, and --success', () => {
  const ctx = scratch();
  try {
    run(['arc', 'open', '--title', 'T', '--id', 'custom-arc', '--purpose', 'P', '--success', 'S'], ctx);
    const dir = arcDirOf(ctx, 'custom-arc');
    const state = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(state, /purpose: P/);
    assert.match(state, /success_outcome: S/);
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active with no current job leaves the active section as None', () => {
  const ctx = scratch();
  try {
    const result = run(['arc', 'open', '--title', 'T', '--adopt-active'], ctx);
    assert.strictEqual(result.status, 0);
    const dir = arcDirOf(ctx, 't');
    const jobs = fs.readFileSync(path.join(dir, 'jobs.md'), 'utf8');
    assert.match(jobs, /## Active\n\n- None/);
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active with only a legacy pointer still shows None (legacy is not promoted)', () => {
  const ctx = scratch();
  try {
    const legacyDir = path.join(ctx.cwd, '.xoch', 'context');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'current.md'), '**Job ID**: legacy-job\n');
    run(['arc', 'open', '--title', 'T', '--adopt-active'], ctx);
    const jobs = fs.readFileSync(path.join(arcDirOf(ctx, 't'), 'jobs.md'), 'utf8');
    assert.match(jobs, /## Active\n\n- None/);
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active migrates a target-model current.md pointer and adopts it', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { title: 'Adopted Job' });
    const md = path.join(xochRootDir(ctx), 'work', 'current.md');
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '**Job ID**: j1\n');
    run(['arc', 'open', '--title', 'T', '--adopt-active'], ctx);
    const jobs = fs.readFileSync(path.join(arcDirOf(ctx, 't'), 'jobs.md'), 'utf8');
    assert.match(jobs, /`j1` - Adopted Job/);
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active with an existing pointer adopts it and stamps the job\'s arc field', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { title: 'Existing Job', arc: 'old-arc' });
    seedPointer(ctx, { id: 'j1', title: 'Existing Job', arc: 'old-arc' });
    run(['arc', 'open', '--title', 'T', '--id', 'new-arc', '--adopt-active'], ctx);
    const jobs = fs.readFileSync(path.join(arcDirOf(ctx, 'new-arc'), 'jobs.md'), 'utf8');
    assert.match(jobs, /`j1` - Existing Job/);
    assert.strictEqual(fieldValue(dir, 'arc'), 'new-arc');
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active shows "unknown" when the current pointer has no job title', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const p = pointerPath(ctx);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ version: 1, job: { id: 'j1', directory: path.join('.xoch', 'work', 'jobs', 'j1') }, workflow: null }));
    run(['arc', 'open', '--title', 'T', '--adopt-active'], ctx);
    const jobs = fs.readFileSync(path.join(arcDirOf(ctx, 't'), 'jobs.md'), 'utf8');
    assert.match(jobs, /`j1` - unknown/);
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active appends an arc: field when the job state does not already have one', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { arc: undefined });
    seedPointer(ctx, { id: 'j1' });
    run(['arc', 'open', '--title', 'T', '--id', 'new-arc', '--adopt-active'], ctx);
    assert.strictEqual(fieldValue(dir, 'arc'), 'new-arc');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// workflow begin
// ---------------------------------------------------------------------

test('workflow begin requires --job and --name', () => {
  const ctx = scratch();
  try {
    const missingJob = run(['workflow', 'begin', '--name', 'wf'], ctx);
    assert.strictEqual(missingJob.status, 1);
    assert.match(missingJob.stderr, /workflow begin requires --job/);

    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' });
    const missingName = run(['workflow', 'begin', '--job', 'j1'], ctx);
    assert.strictEqual(missingName.status, 1);
    assert.match(missingName.stderr, /workflow begin requires --name/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow begin fails when there is no current pointer or matching job state', () => {
  const ctx = scratch();
  try {
    const noPointer = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf'], ctx);
    assert.strictEqual(noPointer.status, 1);
    assert.match(noPointer.stderr, /Current Xoch pointer not found/);

    fs.mkdirSync(path.dirname(pointerPath(ctx)), { recursive: true });
    fs.writeFileSync(pointerPath(ctx), JSON.stringify({ version: 1, job: { id: 'j1', directory: path.join('.xoch', 'work', 'jobs', 'j1') }, workflow: null }));
    const noState = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf'], ctx);
    assert.strictEqual(noState.status, 1);
    assert.match(noState.stderr, /Job state not found/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow begin fails when the current pointer is for a different job', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'other' });
    const result = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Current job is other, not j1/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow begin fails when a workflow is already active', () => {
  const ctx = scratch();
  try {
    seedActiveWorkflow(ctx, 'j1', { name: 'existing' });
    const result = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Workflow already active: existing/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow begin validates the workflow name, stage, pending action, and return command tokens', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' });
    const badName = run(['workflow', 'begin', '--job', 'j1', '--name', 'Bad Name!'], ctx);
    assert.strictEqual(badName.status, 1);
    assert.match(badName.stderr, /Invalid workflow name/);

    const badStage = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf', '--stage', 'Bad Stage'], ctx);
    assert.strictEqual(badStage.status, 1);
    assert.match(badStage.stderr, /Invalid workflow stage/);

    const badPending = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf', '--pending', 'Bad Pending'], ctx);
    assert.strictEqual(badPending.status, 1);
    assert.match(badPending.stderr, /Invalid pending action/);

    const badReturn = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf', '--return', 'Bad Return'], ctx);
    assert.strictEqual(badReturn.status, 1);
    assert.match(badReturn.stderr, /Invalid return command/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow begin rejects an artifact path that escapes the job directory', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' });
    const absolute = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf', '--artifact', '/etc/passwd'], ctx);
    assert.strictEqual(absolute.status, 1);
    assert.match(absolute.stderr, /Workflow artifact must be job-relative/);

    const traversal = run(['workflow', 'begin', '--job', 'j1', '--name', 'wf2', '--artifact', '../escape.md'], ctx);
    assert.strictEqual(traversal.status, 1);
    assert.match(traversal.stderr, /Workflow artifact must be job-relative/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow begin defaults stage, pending action, and return command, then writes state and pointer', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { next_command: 'xoch-review' });
    seedPointer(ctx, { id: 'j1' });
    const result = run(['workflow', 'begin', '--job', 'j1', '--name', 'my-flow'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Workflow begin: my-flow \(in_progress\)/);

    assert.strictEqual(fieldValue(dir, 'active_workflow'), 'my-flow');
    assert.strictEqual(fieldValue(dir, 'workflow_stage'), 'in_progress');
    assert.strictEqual(fieldValue(dir, 'pending_action'), 'continue_workflow');
    assert.strictEqual(fieldValue(dir, 'return_command'), 'xoch-review');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'my-flow');

    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.workflow.name, 'my-flow');
    assert.strictEqual(pointer.workflow.return_command, 'xoch-review');
  } finally {
    cleanup(ctx);
  }
});

test('workflow begin falls back to the workflow name for return_command when the job state has no next_command either', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { next_command: undefined });
    seedPointer(ctx, { id: 'j1' });
    run(['workflow', 'begin', '--job', 'j1', '--name', 'my-flow'], ctx);
    assert.strictEqual(fieldValue(dir, 'return_command'), 'my-flow');
  } finally {
    cleanup(ctx);
  }
});

test('workflow begin honors explicit stage, pending, artifact, and return flags', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' });
    fs.writeFileSync(path.join(dir, 'artifact.md'), 'content');
    const result = run(
      ['workflow', 'begin', '--job', 'j1', '--name', 'my-flow', '--stage', 'gathering', '--pending', 'write_summary', '--artifact', 'artifact.md', '--return', 'xoch-custom'],
      ctx
    );
    assert.strictEqual(result.status, 0);
    assert.strictEqual(fieldValue(dir, 'workflow_stage'), 'gathering');
    assert.strictEqual(fieldValue(dir, 'pending_action'), 'write_summary');
    assert.strictEqual(fieldValue(dir, 'workflow_artifact'), 'artifact.md');
    assert.strictEqual(fieldValue(dir, 'return_command'), 'xoch-custom');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// workflow update
// ---------------------------------------------------------------------

// Seeds both the job's state.md and the pointer's workflow object in sync
// with each other. This matters because every workflow action starts by
// calling resolveCurrentPointer(), which re-derives the pointer's
// workflow from the job's *own* state.md and rewrites the pointer if they
// differ -- so seeding only the pointer (leaving state.md's
// active_workflow at its 'null' default) gets silently wiped before the
// action's own logic ever runs.
function seedActiveWorkflow(ctx, jobId, wf = {}, jobOverrides = {}) {
  const workflow = {
    name: 'my-flow',
    stage: 'in_progress',
    pending_action: 'continue_workflow',
    artifact: null,
    return_command: 'xoch-make',
    started_at: '2026-08-19T00:00:00Z',
    updated_at: '2026-08-19T00:00:00Z',
    ...wf,
  };
  const dir = seedJob(ctx, jobId, {
    active_workflow: workflow.name,
    workflow_stage: workflow.stage,
    pending_action: workflow.pending_action,
    workflow_artifact: workflow.artifact || 'null',
    return_command: workflow.return_command,
    workflow_started_at: workflow.started_at,
    ...jobOverrides,
  });
  seedPointer(ctx, { id: jobId }, workflow);
  return dir;
}

function beginWorkflow(ctx, jobId, overrides = {}) {
  return seedActiveWorkflow(ctx, jobId, {}, overrides);
}

test('workflow update fails when there is no active workflow', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' });
    const result = run(['workflow', 'update', '--job', 'j1', '--stage', 'x'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /No active workflow/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow update fails when --name does not match the active workflow', () => {
  const ctx = scratch();
  try {
    beginWorkflow(ctx, 'j1');
    const result = run(['workflow', 'update', '--job', 'j1', '--name', 'other-flow'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Workflow name does not match: my-flow/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow update partially updates only the fields given', () => {
  const ctx = scratch();
  try {
    const dir = beginWorkflow(ctx, 'j1');
    const result = run(['workflow', 'update', '--job', 'j1', '--stage', 'reviewing'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Workflow update: my-flow \(reviewing\)/);
    assert.strictEqual(fieldValue(dir, 'workflow_stage'), 'reviewing');
    assert.strictEqual(fieldValue(dir, 'pending_action'), 'continue_workflow');

    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.workflow.stage, 'reviewing');
    assert.strictEqual(pointer.workflow.pending_action, 'continue_workflow');
  } finally {
    cleanup(ctx);
  }
});

test('workflow update validates stage, pending, and return tokens when given', () => {
  const ctx = scratch();
  try {
    beginWorkflow(ctx, 'j1');
    const badStage = run(['workflow', 'update', '--job', 'j1', '--stage', 'Bad Stage'], ctx);
    assert.strictEqual(badStage.status, 1);
    assert.match(badStage.stderr, /Invalid workflow stage/);

    const badPending = run(['workflow', 'update', '--job', 'j1', '--pending', 'Bad'], ctx);
    assert.strictEqual(badPending.status, 1);
    assert.match(badPending.stderr, /Invalid pending action/);

    const badReturn = run(['workflow', 'update', '--job', 'j1', '--return', 'Bad'], ctx);
    assert.strictEqual(badReturn.status, 1);
    assert.match(badReturn.stderr, /Invalid return command/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow update sets a job-relative artifact and rejects an escaping one', () => {
  const ctx = scratch();
  try {
    const dir = beginWorkflow(ctx, 'j1');
    fs.writeFileSync(path.join(dir, 'a.md'), 'x');
    const good = run(['workflow', 'update', '--job', 'j1', '--artifact', 'a.md'], ctx);
    assert.strictEqual(good.status, 0);
    assert.strictEqual(fieldValue(dir, 'workflow_artifact'), 'a.md');

    const bad = run(['workflow', 'update', '--job', 'j1', '--artifact', '../escape.md'], ctx);
    assert.strictEqual(bad.status, 1);
    assert.match(bad.stderr, /Workflow artifact must be job-relative/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow update updates the return command', () => {
  const ctx = scratch();
  try {
    const dir = beginWorkflow(ctx, 'j1');
    run(['workflow', 'update', '--job', 'j1', '--return', 'xoch-review'], ctx);
    assert.strictEqual(fieldValue(dir, 'return_command'), 'xoch-review');
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.workflow.return_command, 'xoch-review');
  } finally {
    cleanup(ctx);
  }
});

test('workflow update fills in a missing started_at with the current time', () => {
  const ctx = scratch();
  try {
    const dir = seedActiveWorkflow(ctx, 'j1', { started_at: null }, { workflow_started_at: 'null' });
    run(['workflow', 'update', '--job', 'j1', '--stage', 'reviewing'], ctx);
    assert.ok(fieldValue(dir, 'workflow_started_at') !== 'null');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// workflow complete / abandon
// ---------------------------------------------------------------------

test('workflow complete fails when there is no active workflow', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' });
    const result = run(['workflow', 'complete', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /No active workflow/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow abandon requires --reason', () => {
  const ctx = scratch();
  try {
    beginWorkflow(ctx, 'j1');
    const result = run(['workflow', 'abandon', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /workflow abandon requires --reason/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow complete/abandon fail when --name does not match', () => {
  const ctx = scratch();
  try {
    beginWorkflow(ctx, 'j1');
    const result = run(['workflow', 'complete', '--job', 'j1', '--name', 'other'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Workflow name does not match: my-flow/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow complete without an artifact-gated pending action completes cleanly', () => {
  const ctx = scratch();
  try {
    const dir = beginWorkflow(ctx, 'j1');
    const result = run(['workflow', 'complete', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Workflow completed: my-flow/);
    assert.strictEqual(fieldValue(dir, 'active_workflow'), 'null');
    assert.strictEqual(fieldValue(dir, 'last_workflow'), 'my-flow');
    assert.strictEqual(fieldValue(dir, 'last_workflow_status'), 'complete');
    assert.strictEqual(fieldValue(dir, 'last_workflow_reason'), 'completed');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-make');

    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.workflow, null);
  } finally {
    cleanup(ctx);
  }
});

test('completing with an artifact but a pending action that is not finalize_/write_/record_ skips the artifact gate entirely', () => {
  const ctx = scratch();
  try {
    seedActiveWorkflow(ctx, 'j1', { pending_action: 'continue_workflow', artifact: 'nonexistent.md' });
    const result = run(['workflow', 'complete', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('workflow complete validates the destination command (--next or the return command)', () => {
  const ctx = scratch();
  try {
    beginWorkflow(ctx, 'j1');
    const result = run(['workflow', 'complete', '--job', 'j1', '--next', 'Bad Command'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Invalid next command/);
  } finally {
    cleanup(ctx);
  }
});

test('workflow complete uses --next over the workflow\'s own return command', () => {
  const ctx = scratch();
  try {
    const dir = beginWorkflow(ctx, 'j1');
    run(['workflow', 'complete', '--job', 'j1', '--next', 'xoch-custom-next'], ctx);
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-custom-next');
  } finally {
    cleanup(ctx);
  }
});

test('workflow abandon records the reason with newlines collapsed to spaces', () => {
  const ctx = scratch();
  try {
    const dir = beginWorkflow(ctx, 'j1');
    const result = run(['workflow', 'abandon', '--job', 'j1', '--reason', 'line one\nline two\r\nline three'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Workflow abandoned: my-flow/);
    assert.strictEqual(fieldValue(dir, 'last_workflow_status'), 'abandoned');
    assert.strictEqual(fieldValue(dir, 'last_workflow_reason'), 'line one line two line three');
  } finally {
    cleanup(ctx);
  }
});

test('completing a workflow with an artifact-gated pending action requires the artifact to exist', () => {
  const ctx = scratch();
  try {
    seedActiveWorkflow(ctx, 'j1', { stage: 'gathering', pending_action: 'finalize_summary', artifact: 'summary.md' });
    const result = run(['workflow', 'complete', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Required workflow artifact not found/);
  } finally {
    cleanup(ctx);
  }
});

test('an artifact-gated workflow with a path escaping the job directory is rejected', () => {
  const ctx = scratch();
  try {
    seedActiveWorkflow(ctx, 'j1', { stage: 'gathering', pending_action: 'write_summary', artifact: '../../escape.md' });
    const result = run(['workflow', 'complete', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Workflow artifact escapes job directory/);
  } finally {
    cleanup(ctx);
  }
});

test('completing with a "finalize_" pending action rejects an artifact still marked Draft', () => {
  const ctx = scratch();
  try {
    const dir = seedActiveWorkflow(ctx, 'j1', { stage: 'gathering', pending_action: 'finalize_summary', artifact: 'summary.md' });
    fs.writeFileSync(path.join(dir, 'summary.md'), '# Summary\n\n**Status**: Draft\n');
    const result = run(['workflow', 'complete', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /still marked Draft/);
  } finally {
    cleanup(ctx);
  }
});

test('completing with a "finalize_" pending action succeeds once the artifact is no longer Draft', () => {
  const ctx = scratch();
  try {
    const dir = seedActiveWorkflow(ctx, 'j1', { stage: 'gathering', pending_action: 'finalize_summary', artifact: 'summary.md' });
    fs.writeFileSync(path.join(dir, 'summary.md'), '# Summary\n\n**Status**: Final\n');
    const result = run(['workflow', 'complete', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('a "write_"/"record_" pending action requires the artifact to exist but does not check Draft status', () => {
  const ctx = scratch();
  try {
    const dir = seedActiveWorkflow(ctx, 'j1', { stage: 'gathering', pending_action: 'record_note', artifact: 'note.md' });
    fs.writeFileSync(path.join(dir, 'note.md'), '**Status**: Draft\n');
    const result = run(['workflow', 'complete', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('abandon never applies the artifact gate, even with a finalize_ pending action and no artifact', () => {
  const ctx = scratch();
  try {
    seedActiveWorkflow(ctx, 'j1', { stage: 'gathering', pending_action: 'finalize_summary', artifact: 'nonexistent.md' });
    const result = run(['workflow', 'abandon', '--job', 'j1', '--reason', 'changed plans'], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('workflowAction rejects an unknown action (reachable only via the exported function directly)', () => {
  const ctx = scratch();
  try {
    beginWorkflow(ctx, 'j1');
    const result = callExported('workflowAction', ['bogus-action', ['--job', 'j1']], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Unknown workflow action: bogus-action/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// snapshot create
// ---------------------------------------------------------------------

test('snapshot create requires --job and --phase', () => {
  const ctx = scratch();
  try {
    const missingJob = run(['snapshot', 'create', '--phase', '1'], ctx);
    assert.strictEqual(missingJob.status, 1);
    assert.match(missingJob.stderr, /snapshot create requires --job/);

    const missingPhase = run(['snapshot', 'create', '--job', 'j1'], ctx);
    assert.strictEqual(missingPhase.status, 1);
    assert.match(missingPhase.stderr, /snapshot create requires --phase/);
  } finally {
    cleanup(ctx);
  }
});

test('snapshot create writes a templated file with defaults', () => {
  const ctx = scratch();
  try {
    const result = run(['snapshot', 'create', '--job', 'j1', '--phase', '2'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Snapshot written: \.xoch\/work\/jobs\/j1\/snapshots\/phase-2\.md/);
    const file = path.join(jobDirOf(ctx, 'j1'), 'snapshots', 'phase-2.md');
    const content = fs.readFileSync(file, 'utf8');
    assert.match(content, /# Phase 2 Snapshot - Phase 2/);
    assert.match(content, /\*\*Status\*\*: Complete/);
    assert.match(content, /## Next\n\nTBD/);
  } finally {
    cleanup(ctx);
  }
});

test('snapshot create honors --title, --status, and --next', () => {
  const ctx = scratch();
  try {
    run(['snapshot', 'create', '--job', 'j1', '--phase', '2', '--title', 'Custom Title', '--status', 'Deferred', '--next', 'Do the thing'], ctx);
    const content = fs.readFileSync(path.join(jobDirOf(ctx, 'j1'), 'snapshots', 'phase-2.md'), 'utf8');
    assert.match(content, /# Phase 2 Snapshot - Custom Title/);
    assert.match(content, /\*\*Status\*\*: Deferred/);
    assert.match(content, /## Next\n\nDo the thing/);
  } finally {
    cleanup(ctx);
  }
});

test('snapshot create with --body-file copies the file verbatim', () => {
  const ctx = scratch();
  try {
    const bodyFile = path.join(ctx.cwd, 'body.md');
    fs.writeFileSync(bodyFile, 'Custom snapshot body.\n');
    run(['snapshot', 'create', '--job', 'j1', '--phase', '2', '--body-file', bodyFile], ctx);
    const content = fs.readFileSync(path.join(jobDirOf(ctx, 'j1'), 'snapshots', 'phase-2.md'), 'utf8');
    assert.strictEqual(content, 'Custom snapshot body.\n');
  } finally {
    cleanup(ctx);
  }
});

test('snapshot create fails when --body-file does not exist', () => {
  const ctx = scratch();
  try {
    const result = run(['snapshot', 'create', '--job', 'j1', '--phase', '2', '--body-file', path.join(ctx.cwd, 'missing.md')], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /body file not found/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// phase advance
// ---------------------------------------------------------------------

function phasesFixture() {
  return `# Phases - test

## Current Phase: 1

---

## Phase 1: First Phase

**Files to modify/create:**
- a.js

**Status**: Not Started

---

## Phase 2: Second Phase

**Status**: In Progress

---

## Phase 3: Third Phase

**Status**: Not Started
`;
}

test('phase advance requires --job and --phase', () => {
  const ctx = scratch();
  try {
    const missingJob = run(['phase', 'advance', '--phase', '1'], ctx);
    assert.strictEqual(missingJob.status, 1);
    assert.match(missingJob.stderr, /phase advance requires --job/);

    const missingPhase = run(['phase', 'advance', '--job', 'j1'], ctx);
    assert.strictEqual(missingPhase.status, 1);
    assert.match(missingPhase.stderr, /phase advance requires --phase/);
  } finally {
    cleanup(ctx);
  }
});

test('phase advance fails when the job state does not exist', () => {
  const ctx = scratch();
  try {
    const result = run(['phase', 'advance', '--job', 'missing', '--phase', '1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /state not found/);
  } finally {
    cleanup(ctx);
  }
});

test('phase advance without a phases.md just updates state.md fields', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    const result = run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'Phase Two', '--next-goal', 'Do things'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Phase advanced for job j1: 1 -> 2/);
    assert.strictEqual(fieldValue(dir, 'current_phase'), '2');
    assert.strictEqual(fieldValue(dir, 'current_phase_title'), 'Phase Two');
    assert.strictEqual(fieldValue(dir, 'status'), 'phase_ready');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-make');
  } finally {
    cleanup(ctx);
  }
});

test('advancing to a next phase updates phases.md status, current-phase marker, and phase_index', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    fs.writeFileSync(path.join(dir, 'phases.md'), phasesFixture());

    run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'Second Phase', '--next-goal', 'G'], ctx);

    const phasesText = fs.readFileSync(path.join(dir, 'phases.md'), 'utf8');
    assert.match(phasesText, /## Current Phase: 2/);
    assert.match(phasesText, /## Phase 1: First Phase\n\n\*\*Files to modify\/create:\*\*\n- a\.js\n\n\*\*Status\*\*: Complete/);
    // Only phase 1's own status changed -- phase 2's stays "In Progress".
    assert.match(phasesText, /## Phase 2: Second Phase\n\n\*\*Status\*\*: In Progress/);

    const stateText = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(stateText, /phase_index:\n\s+- phase: 1, title: First Phase, status: complete, type: implementation\n\s+- phase: 2, title: Second Phase, status: in_progress, type: implementation\n\s+- phase: 3, title: Third Phase, status: not_started, type: implementation/);
    assert.strictEqual(fieldValue(dir, 'phase_count'), '3');
  } finally {
    cleanup(ctx);
  }
});

test('advancing with next-files/next-ac/next-validation writes them as CSV-derived list blocks', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    fs.writeFileSync(path.join(dir, 'phases.md'), phasesFixture());
    run(
      [
        'phase', 'advance', '--job', 'j1', '--phase', '1',
        '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G',
        '--next-files', ' a.js, b.js ,,c.js',
        '--next-ac', 'AC-001,AC-002',
        '--next-validation', 'npm test',
      ],
      ctx
    );
    const stateText = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(stateText, /current_phase_files:\n\s+- a\.js\n\s+- b\.js\n\s+- c\.js/);
    assert.match(stateText, /current_phase_acceptance_criteria:\n\s+- AC-001\n\s+- AC-002/);
    assert.match(stateText, /current_phase_validation:\n\s+- npm test/);
  } finally {
    cleanup(ctx);
  }
});

test('advancing replaces pre-existing list blocks rather than duplicating their entries', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    const original = fs.readFileSync(path.join(dir, 'state.md'), 'utf8').replace(/\n$/, '');
    fs.writeFileSync(
      path.join(dir, 'state.md'),
      `${original}\ncurrent_phase_files:\n  - old-file.js\ncurrent_phase_acceptance_criteria:\n  - AC-OLD\ncurrent_phase_validation:\n  - old validation\nphase_index:\n  - phase: 1, title: Old, status: not_started\n`
    );
    run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G', '--next-files', 'new-file.js'], ctx);
    const stateText = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.ok(!stateText.includes('old-file.js'));
    assert.ok(!stateText.includes('AC-OLD'));
    assert.ok(!stateText.includes('old validation'));
    assert.match(stateText, /current_phase_files:\n\s+- new-file\.js/);
  } finally {
    cleanup(ctx);
  }
});

test('advancing with an empty --next-phase marks the job implementation-complete', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '3' });
    fs.writeFileSync(path.join(dir, 'phases.md'), phasesFixture());
    const result = run(['phase', 'advance', '--job', 'j1', '--phase', '3'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Phase advanced for job j1: 3 -> review/);
    assert.strictEqual(fieldValue(dir, 'status'), 'implementation_complete');
    assert.strictEqual(fieldValue(dir, 'current_phase'), 'null');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-review');
    const stateText = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(stateText, /current_phase_files: \[\]/);
  } finally {
    cleanup(ctx);
  }
});

test('a phase entry with no explicit Status line defaults to "unknown"', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    fs.writeFileSync(
      path.join(dir, 'phases.md'),
      `## Current Phase: 1

---

## Phase 1: No Status Here

Just a description, no status field.
`
    );
    run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G'], ctx);
    const stateText = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(stateText, /- phase: 1, title: No Status Here, status: unknown/);
  } finally {
    cleanup(ctx);
  }
});

test('phase advance with --next-type checkpoint persists current_phase_type to state.md', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    run(
      ['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G', '--next-type', 'checkpoint'],
      ctx
    );
    assert.strictEqual(fieldValue(dir, 'current_phase_type'), 'checkpoint');
  } finally {
    cleanup(ctx);
  }
});

test('phase advance without --next-type defaults current_phase_type to implementation', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G'], ctx);
    assert.strictEqual(fieldValue(dir, 'current_phase_type'), 'implementation');
  } finally {
    cleanup(ctx);
  }
});

test('advancing with an empty --next-phase resets current_phase_type to null', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '3' });
    fs.writeFileSync(path.join(dir, 'phases.md'), phasesFixture());
    run(['phase', 'advance', '--job', 'j1', '--phase', '3'], ctx);
    assert.strictEqual(fieldValue(dir, 'current_phase_type'), 'null');
  } finally {
    cleanup(ctx);
  }
});

test("a phase's Type field in phases.md is parsed into its phase_index entry", () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    fs.writeFileSync(
      path.join(dir, 'phases.md'),
      `## Current Phase: 1

---

## Phase 1: First Phase

**Type**: Checkpoint

**Status**: Not Started
`
    );
    run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G'], ctx);
    const stateText = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(stateText, /- phase: 1, title: First Phase, status: complete, type: checkpoint/);
  } finally {
    cleanup(ctx);
  }
});

test('a phase with no Type field defaults to implementation in its phase_index entry', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    fs.writeFileSync(path.join(dir, 'phases.md'), phasesFixture());
    run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G'], ctx);
    const stateText = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(stateText, /- phase: 1, title: First Phase, status: complete, type: implementation/);
  } finally {
    cleanup(ctx);
  }
});

test('a custom field not touched by phase advance survives unchanged', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    const original = fs.readFileSync(path.join(dir, 'state.md'), 'utf8').replace(/\n$/, '');
    fs.writeFileSync(path.join(dir, 'state.md'), `${original}\nmy_custom_field: keep-me\n`);
    run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G'], ctx);
    assert.strictEqual(fieldValue(dir, 'my_custom_field'), 'keep-me');
  } finally {
    cleanup(ctx);
  }
});

test('an indented sub-list under a non-skipped key passes through phase advance unchanged', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1' });
    const original = fs.readFileSync(path.join(dir, 'state.md'), 'utf8').replace(/\n$/, '');
    fs.writeFileSync(path.join(dir, 'state.md'), `${original}\ndocumentation_targets:\n  - scope: docs\n    path: README.md\n`);
    run(['phase', 'advance', '--job', 'j1', '--phase', '1', '--next-phase', '2', '--next-title', 'T', '--next-goal', 'G'], ctx);
    const content = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
    assert.match(content, /documentation_targets:\n\s+- scope: docs\n\s+path: README\.md/);
  } finally {
    cleanup(ctx);
  }
});

test('file write: creates file and parent dirs, content is exact', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const result = run(['file', 'write', '--job', 'j1', '--path', 'notes/deep/note.md'], ctx, 'hello\nworld\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /File written:/);
    const content = fs.readFileSync(path.join(jobDirOf(ctx, 'j1'), 'notes', 'deep', 'note.md'), 'utf8');
    assert.strictEqual(content, 'hello\nworld\n');
  } finally {
    cleanup(ctx);
  }
});

test('file write --append: appends to existing file, creates it if missing', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const target = path.join(jobDirOf(ctx, 'j1'), 'notes.md');

    const created = run(['file', 'write', '--job', 'j1', '--path', 'notes.md', '--append'], ctx, 'first\n');
    assert.match(created.stdout, /File written:/);
    assert.strictEqual(fs.readFileSync(target, 'utf8'), 'first\n');

    const appended = run(['file', 'write', '--job', 'j1', '--path', 'notes.md', '--append'], ctx, 'second\n');
    assert.match(appended.stdout, /File appended:/);
    assert.strictEqual(fs.readFileSync(target, 'utf8'), 'first\nsecond\n');
  } finally {
    cleanup(ctx);
  }
});

test('file write: rejects path traversal (relative and absolute)', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const relResult = run(['file', 'write', '--job', 'j1', '--path', '../escape.md'], ctx, 'x');
    assert.strictEqual(relResult.status, 1);
    assert.match(relResult.stderr, /job-relative/);
    const absResult = run(['file', 'write', '--job', 'j1', '--path', '/etc/escape.md'], ctx, 'x');
    assert.strictEqual(absResult.status, 1);
    assert.match(absResult.stderr, /job-relative/);
  } finally {
    cleanup(ctx);
  }
});

test('file write: missing --job, missing --path, and unknown job all error cleanly', () => {
  const ctx = scratch();
  try {
    const noJob = run(['file', 'write', '--path', 'spec.md'], ctx, 'x');
    assert.strictEqual(noJob.status, 1);
    assert.match(noJob.stderr, /--job is required/);

    const noPath = run(['file', 'write', '--job', 'j1'], ctx, 'x');
    assert.strictEqual(noPath.status, 1);
    assert.match(noPath.stderr, /--path is required/);

    const unknownJob = run(['file', 'write', '--job', 'does-not-exist', '--path', 'spec.md'], ctx, 'x');
    assert.strictEqual(unknownJob.status, 1);
    assert.match(unknownJob.stderr, /job not found/);
  } finally {
    cleanup(ctx);
  }
});

test('file read: exact round trip, missing file errors cleanly', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    run(['file', 'write', '--job', 'j1', '--path', 'spec.md'], ctx, '# Spec\n\ncontent here\n');
    const readResult = run(['file', 'read', '--job', 'j1', '--path', 'spec.md'], ctx);
    assert.strictEqual(readResult.status, 0);
    assert.strictEqual(readResult.stdout, '# Spec\n\ncontent here\n');

    const missingResult = run(['file', 'read', '--job', 'j1', '--path', 'plan.md'], ctx);
    assert.strictEqual(missingResult.status, 1);
    assert.match(missingResult.stderr, /file not found/);
  } finally {
    cleanup(ctx);
  }
});

test('file edit: replaces a unique match', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    run(['file', 'write', '--job', 'j1', '--path', 'plan.md'], ctx, '# Plan\n\nStatus: Draft\n');
    const result = run(
      ['file', 'edit', '--job', 'j1', '--path', 'plan.md'],
      ctx,
      'Status: Draft\n-----XOCH-EDIT-SEPARATOR-----\nStatus: Accepted\n',
    );
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /File edited:.*1 replacement/);
    const content = fs.readFileSync(path.join(jobDirOf(ctx, 'j1'), 'plan.md'), 'utf8');
    assert.strictEqual(content, '# Plan\n\nStatus: Accepted\n');
  } finally {
    cleanup(ctx);
  }
});

test('file edit: errors when old text is missing, ambiguous, or the file is missing', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');

    const missingFile = run(
      ['file', 'edit', '--job', 'j1', '--path', 'plan.md'],
      ctx,
      'a\n-----XOCH-EDIT-SEPARATOR-----\nb\n',
    );
    assert.strictEqual(missingFile.status, 1);
    assert.match(missingFile.stderr, /file not found/);

    run(['file', 'write', '--job', 'j1', '--path', 'plan.md'], ctx, 'AC-001\nAC-001\n');

    const noSeparator = run(['file', 'edit', '--job', 'j1', '--path', 'plan.md'], ctx, 'AC-001\nAC-002\n');
    assert.strictEqual(noSeparator.status, 1);
    assert.match(noSeparator.stderr, /XOCH-EDIT-SEPARATOR/);

    const noMatch = run(
      ['file', 'edit', '--job', 'j1', '--path', 'plan.md'],
      ctx,
      'AC-999\n-----XOCH-EDIT-SEPARATOR-----\nAC-000\n',
    );
    assert.strictEqual(noMatch.status, 1);
    assert.match(noMatch.stderr, /old text not found/);

    const ambiguous = run(
      ['file', 'edit', '--job', 'j1', '--path', 'plan.md'],
      ctx,
      'AC-001\n-----XOCH-EDIT-SEPARATOR-----\nAC-002\n',
    );
    assert.strictEqual(ambiguous.status, 1);
    assert.match(ambiguous.stderr, /ambiguous/);
  } finally {
    cleanup(ctx);
  }
});

test('file edit --replace-all: replaces every occurrence', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    run(['file', 'write', '--job', 'j1', '--path', 'plan.md'], ctx, 'AC-001\nAC-001\nAC-001\n');
    const result = run(
      ['file', 'edit', '--job', 'j1', '--path', 'plan.md', '--replace-all'],
      ctx,
      'AC-001\n-----XOCH-EDIT-SEPARATOR-----\nAC-002\n',
    );
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /File edited:.*3 replacements/);
    const content = fs.readFileSync(path.join(jobDirOf(ctx, 'j1'), 'plan.md'), 'utf8');
    assert.strictEqual(content, 'AC-002\nAC-002\nAC-002\n');
  } finally {
    cleanup(ctx);
  }
});

test('file write/read round trip under centralized storage mode', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.home, '.xoch'), { recursive: true });
    fs.writeFileSync(path.join(ctx.home, '.xoch', 'config.json'), JSON.stringify({ storage: { mode: 'centralized' } }));
    const centralJobDir = path.join(ctx.home, '.xoch', 'projects', path.basename(ctx.cwd), 'work', 'jobs', 'j1');
    fs.mkdirSync(centralJobDir, { recursive: true });
    fs.writeFileSync(path.join(centralJobDir, 'state.md'), 'job_id: j1\n');

    run(['file', 'write', '--job', 'j1', '--path', 'spec.md'], ctx, 'centralized content\n');
    assert.strictEqual(fs.readFileSync(path.join(centralJobDir, 'spec.md'), 'utf8'), 'centralized content\n');
    assert.strictEqual(fs.existsSync(jobDirOf(ctx, 'j1')), false);

    const readResult = run(['file', 'read', '--job', 'j1', '--path', 'spec.md'], ctx);
    assert.strictEqual(readResult.stdout, 'centralized content\n');
  } finally {
    cleanup(ctx);
  }
});

runTests();
