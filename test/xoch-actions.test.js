'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { test, run as runTests } from './lib/runner.js';
import { scratch, cleanup, runScript } from './lib/cli.js';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const specifier = JSON.stringify(pathToFileURL(SCRIPT).href);
  const script = `import(${specifier}).then((m) => m.${fnName}(${args.map((a) => JSON.stringify(a)).join(', ')}));`;
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

function readState(dir) {
  return readJsonFile(path.join(dir, 'state.json'));
}

function fieldValue(dir, field) {
  return readState(dir)[field];
}

// Fixture overrides may be written the way state.md used to spell them
// ('null', '1', 'true'); convert those to the real JSON values state.json
// holds so older call sites keep meaning the same thing.
const INT_FIELDS = ['current_phase', 'phase_count'];
function typedFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value === 'null') out[key] = null;
    else if (value === 'true') out[key] = true;
    else if (INT_FIELDS.includes(key) && typeof value === 'string' && /^\d+$/.test(value)) out[key] = Number(value);
    else out[key] = value;
  }
  return out;
}

// Seeds a job directory with a minimal state.json -- bypassing `job open`
// -- for tests that only care about a later command's own behavior
// (evidence, state set, workflow, phase advance, ...).
function seedJob(ctx, id, overrides = {}) {
  const dir = jobDirOf(ctx, id);
  fs.mkdirSync(dir, { recursive: true });
  const fields = typedFields({
    job_id: id,
    title: id,
    description: id,
    status: 'phase_ready',
    arc: 'standalone',
    current_phase: 1,
    phase_count: 1,
    current_phase_title: 'Test Phase',
    current_phase_goal: 'Goal',
    next_command: 'xoch-do',
    started: '2026-08-19',
    last_updated: '2026-08-19',
    active_workflow: null,
    workflow_stage: null,
    pending_action: null,
    workflow_artifact: null,
    return_command: null,
    workflow_started_at: null,
    review_status: null,
    closure_status: null,
    ...overrides,
  });
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(fields, null, 2));
  return dir;
}

function seedArc(ctx, id, overrides = {}) {
  const dir = arcDirOf(ctx, id);
  fs.mkdirSync(dir, { recursive: true });
  const fields = typedFields({ arc_id: id, title: id, status: 'active', started: '2026-08-19', last_updated: '2026-08-19', ...overrides });
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(fields, null, 2));
  return dir;
}

function seedPhases(ctx, id, doc) {
  const file = path.join(jobDirOf(ctx, id), 'phases.json');
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  return file;
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
    assert.ok(fs.existsSync(path.join(dir, 'state.json')));
    for (const sub of ['notes', 'revisions', 'snapshots']) {
      assert.ok(fs.statSync(path.join(dir, sub)).isDirectory());
    }
    assert.ok(!fs.existsSync(path.join(dir, 'phases')));
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

test('job open writes state.json with defaults and the given overrides', () => {
  const ctx = scratch();
  try {
    run(['job', 'open', '--title', 'T', '--id', 'j1', '--arc', 'my-arc', '--description', 'Desc', '--doc-scope', 'docs', '--doc-path', 'README.md'], ctx);
    const dir = jobDirOf(ctx, 'j1');
    assert.strictEqual(fieldValue(dir, 'job_id'), 'j1');
    assert.strictEqual(fieldValue(dir, 'title'), 'T');
    assert.strictEqual(fieldValue(dir, 'description'), 'Desc');
    assert.strictEqual(fieldValue(dir, 'status'), 'active');
    assert.strictEqual(fieldValue(dir, 'arc'), 'my-arc');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-open');
    assert.deepStrictEqual(fieldValue(dir, 'documentation_targets'), [{ scope: 'docs', path: 'README.md' }]);
    assert.strictEqual(fieldValue(dir, 'current_phase'), null);
    assert.deepStrictEqual(fieldValue(dir, 'phase_index'), []);
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

test('job open writes the current pointer', () => {
  const ctx = scratch();
  try {
    run(['job', 'open', '--title', 'New Job', '--id', 'newjob'], ctx);
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.job.id, 'newjob');
    assert.strictEqual(pointer.workflow, null);
  } finally {
    cleanup(ctx);
  }
});

test('job open sets current_step to title in state.md and projects it into the pointer', () => {
  const ctx = scratch();
  try {
    run(['job', 'open', '--title', 'New Job', '--id', 'newjob'], ctx);
    const dir = jobDirOf(ctx, 'newjob');
    assert.strictEqual(fieldValue(dir, 'current_step'), 'title');
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.next_command, 'xoch-open');
    assert.strictEqual(pointer.current_step, 'title');
  } finally {
    cleanup(ctx);
  }
});

test('job open --type qa records a qa job type, routes to xoch-qa, and projects the type into the pointer', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'open', '--title', 'Checkout QA', '--id', 'qa1', '--type', 'qa'], ctx);
    assert.strictEqual(result.status, 0);
    const dir = jobDirOf(ctx, 'qa1');
    assert.strictEqual(fieldValue(dir, 'job_type'), 'qa');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-qa');
    const pointer = readJsonFile(pointerPath(ctx));
    assert.strictEqual(pointer.job_type, 'qa');
    assert.strictEqual(pointer.next_command, 'xoch-qa');
  } finally {
    cleanup(ctx);
  }
});

test('job open without --type records a standard job type', () => {
  const ctx = scratch();
  try {
    run(['job', 'open', '--title', 'Plain Job', '--id', 'plain'], ctx);
    assert.strictEqual(fieldValue(jobDirOf(ctx, 'plain'), 'job_type'), 'standard');
    assert.strictEqual(readJsonFile(pointerPath(ctx)).job_type, 'standard');
  } finally {
    cleanup(ctx);
  }
});

test('job open rejects a job type other than standard or qa and creates nothing', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'open', '--title', 'Odd', '--id', 'odd', '--type', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /job open --type must be one of: standard, qa/);
    assert.ok(!fs.existsSync(jobDirOf(ctx, 'odd')));
  } finally {
    cleanup(ctx);
  }
});

test('job current treats a job whose state has no job_type as a standard job', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'old');
    seedPointer(ctx, { id: 'old' });
    const json = JSON.parse(run(['job', 'current', '--json'], ctx).stdout);
    assert.strictEqual(json.job_type, 'standard');
    const text = run(['job', 'current'], ctx);
    assert.match(text.stdout, /job_type: standard/);
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
    seedJob(ctx, 'j1', { arc: 'null', started: undefined });
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
    assert.strictEqual(pointer.workflow.return_command, 'xoch-do');
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

test('job current text mode falls back to "none" for a job with no next_command set', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { next_command: undefined });
    seedPointer(ctx, { id: 'j1' });
    const result = run(['job', 'current'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /next_command: none/);
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
    seedJob(ctx, 'j1', { active_workflow: 'my-flow', workflow_stage: 'in_progress', pending_action: 'continue_workflow', next_command: 'xoch-do' });
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

test('job current syncs the pointer next_command and current_step to match the job state when they differ', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { next_command: 'xoch-do', current_step: 'advance' });
    seedPointer(ctx, { id: 'j1' }, null, { next_command: 'xoch-do', current_step: 'implement' });

    const result = run(['job', 'current', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.next_command, 'xoch-do');
    assert.strictEqual(data.current_step, 'advance');

    const after = readJsonFile(pointerPath(ctx));
    assert.strictEqual(after.next_command, 'xoch-do');
    assert.strictEqual(after.current_step, 'advance');
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
      return_command: 'xoch-do',
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

test('job current does not rewrite the pointer when the projected workflow, next_command, current_step, and job_type are all unchanged', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPointer(ctx, { id: 'j1' }, null, {
      next_command: 'xoch-do',
      current_step: null,
      job_type: 'standard',
      updated_at: '2020-01-01T00:00:00Z',
    });
    run(['job', 'current'], ctx);
    const after = readJsonFile(pointerPath(ctx));
    assert.strictEqual(after.updated_at, '2020-01-01T00:00:00Z');
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

test('job evidence reports existing files and the current phase snapshot', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '3' });
    fs.writeFileSync(path.join(dir, 'spec.md'), 'spec');
    fs.writeFileSync(path.join(dir, 'phases.json'), '{}');
    fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'snapshots', 'phase-3.md'), 'snap');

    const json = run(['job', 'evidence', '--job', 'j1', '--json'], ctx);
    const data = JSON.parse(json.stdout);
    const relDir = path.join('.xoch', 'work', 'jobs', 'j1');
    assert.strictEqual(data.spec, path.join(relDir, 'spec.md'));
    assert.strictEqual(data.current_phase, '3');
    assert.strictEqual(data.current_phase_snapshot, path.join(relDir, 'snapshots', 'phase-3.md'));
    assert.strictEqual(data.state, path.join(relDir, 'state.json'));
    assert.strictEqual(data.phases, path.join(relDir, 'phases.json'));
    assert.ok(!('current_phase_body' in data));
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
    fs.writeFileSync(path.join(dir, 'jobs.json'), '{}');

    const text = run(['arc', 'evidence', '--arc', 'a1'], ctx);
    assert.match(text.stdout, /state: .*state\.json/);
    assert.match(text.stdout, /jobs: .*jobs\.json/);
    assert.match(text.stdout, /notes: \(not found\)/);

    const json = run(['arc', 'evidence', '--arc', 'a1', '--json'], ctx);
    const data = JSON.parse(json.stdout);
    const relDir = path.join('.xoch', 'work', 'arcs', 'a1');
    assert.strictEqual(data.jobs, path.join(relDir, 'jobs.json'));
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
    assert.match(result.stdout, /Updated .*state\.json: status=phase_ready/);
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

test('pointer clear removes a matching legacy pointer and leaves a non-matching one alone', () => {
  const ctx = scratch();
  try {
    const legacyDir = path.join(ctx.cwd, '.xoch', 'context');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'current.md'), '**Task ID**: other\n');

    const other = run(['pointer', 'clear', '--job', 'j1'], ctx);
    assert.strictEqual(other.status, 0);
    assert.ok(fs.existsSync(path.join(legacyDir, 'current.md')));

    fs.writeFileSync(path.join(legacyDir, 'current.md'), '**Job ID**: j1\n');
    const matching = run(['pointer', 'clear', '--job', 'j1'], ctx);
    assert.match(matching.stdout, /Cleared pointer: .*context\/current\.md/);
    assert.ok(!fs.existsSync(path.join(legacyDir, 'current.md')));
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
    assert.ok(fs.existsSync(path.join(dir, 'notes.md')));
    const jobs = readJsonFile(path.join(dir, 'jobs.json'));
    assert.deepStrictEqual(jobs, { active: [], planned: [], complete: [], parked: [] });
    const state = readJsonFile(path.join(dir, 'state.json'));
    assert.strictEqual(state.next_command, 'xoch-open');
    assert.strictEqual(state.purpose, 'My Arc!');
  } finally {
    cleanup(ctx);
  }
});

test('arc open honors an explicit --id, --purpose, and --success', () => {
  const ctx = scratch();
  try {
    run(['arc', 'open', '--title', 'T', '--id', 'custom-arc', '--purpose', 'P', '--success', 'S'], ctx);
    const dir = arcDirOf(ctx, 'custom-arc');
    const state = readJsonFile(path.join(dir, 'state.json'));
    assert.strictEqual(state.purpose, 'P');
    assert.strictEqual(state.success_outcome, 'S');
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active with no current job leaves the active section as None', () => {
  const ctx = scratch();
  try {
    const result = run(['arc', 'open', '--title', 'T', '--adopt-active'], ctx);
    assert.strictEqual(result.status, 0);
    const jobs = readJsonFile(path.join(arcDirOf(ctx, 't'), 'jobs.json'));
    assert.deepStrictEqual(jobs.active, []);
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
    const jobs = readJsonFile(path.join(arcDirOf(ctx, 't'), 'jobs.json'));
    assert.deepStrictEqual(jobs.active, []);
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
    const jobs = readJsonFile(path.join(arcDirOf(ctx, 'new-arc'), 'jobs.json'));
    assert.deepStrictEqual(jobs.active, [{ id: 'j1', title: 'Existing Job' }]);
    assert.strictEqual(fieldValue(dir, 'arc'), 'new-arc');
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active takes the adopted job\'s title from its state when the pointer has none', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const p = pointerPath(ctx);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ version: 1, job: { id: 'j1', directory: path.join('.xoch', 'work', 'jobs', 'j1') }, workflow: null }));
    run(['arc', 'open', '--title', 'T', '--adopt-active'], ctx);
    const jobs = readJsonFile(path.join(arcDirOf(ctx, 't'), 'jobs.json'));
    assert.deepStrictEqual(jobs.active, [{ id: 'j1', title: 'j1' }]);
  } finally {
    cleanup(ctx);
  }
});

test('arc open --adopt-active sets the arc field when the job state does not already have one', () => {
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
    return_command: 'xoch-do',
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
    assert.strictEqual(fieldValue(dir, 'active_workflow'), null);
    assert.strictEqual(fieldValue(dir, 'last_workflow'), 'my-flow');
    assert.strictEqual(fieldValue(dir, 'last_workflow_status'), 'complete');
    assert.strictEqual(fieldValue(dir, 'last_workflow_reason'), 'completed');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-do');

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
  return {
    current_phase: 1,
    phases: [
      { title: 'First Phase', files: [{ path: 'a.js' }] },
      { title: 'Second Phase', status: 'in_progress' },
      { title: 'Third Phase' },
    ],
  };
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

test('a custom field not touched by phase advance survives unchanged', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: '1', my_custom_field: 'keep-me', my_custom_list: ['a', 'b'] });
    seedPhases(ctx, 'j1', phasesFixture());
    assert.strictEqual(run(['phase', 'advance', '--job', 'j1', '--phase', '1'], ctx).status, 0);
    assert.strictEqual(fieldValue(dir, 'my_custom_field'), 'keep-me');
    assert.deepStrictEqual(fieldValue(dir, 'my_custom_list'), ['a', 'b']);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// qa confirm-env / qa capabilities / QA phase-1 environment guard
// ---------------------------------------------------------------------

test('qa confirm-env records a dev or staging environment and its target as confirmed', () => {
  for (const env of ['dev', 'staging']) {
    const ctx = scratch();
    try {
      const dir = seedJob(ctx, 'q1', { job_type: 'qa' });
      const result = run(['qa', 'confirm-env', '--job', 'q1', '--env', env, '--target', 'http://localhost:3000'], ctx);
      assert.strictEqual(result.status, 0);
      assert.match(result.stdout, new RegExp(`QA environment confirmed for job q1: ${env}`));
      assert.strictEqual(fieldValue(dir, 'qa_environment'), env);
      assert.strictEqual(fieldValue(dir, 'qa_target'), 'http://localhost:3000');
      assert.strictEqual(fieldValue(dir, 'qa_environment_confirmed'), true);
    } finally {
      cleanup(ctx);
    }
  }
});

test('qa confirm-env refuses production or any environment other than dev or staging, and records nothing', () => {
  for (const env of ['production', 'prod', 'local']) {
    const ctx = scratch();
    try {
      const dir = seedJob(ctx, 'q1', { job_type: 'qa' });
      const result = run(['qa', 'confirm-env', '--job', 'q1', '--env', env, '--target', 'https://example.com'], ctx);
      assert.strictEqual(result.status, 1);
      assert.match(result.stderr, /qa confirm-env --env must be one of: dev, staging/);
      assert.strictEqual(fieldValue(dir, 'qa_environment_confirmed'), undefined);
    } finally {
      cleanup(ctx);
    }
  }
});

test('qa confirm-env requires --job, --env, and --target, and an existing job', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'q1', { job_type: 'qa' });
    assert.match(run(['qa', 'confirm-env', '--env', 'dev', '--target', 't'], ctx).stderr, /qa confirm-env requires --job/);
    assert.match(run(['qa', 'confirm-env', '--job', 'q1', '--target', 't'], ctx).stderr, /qa confirm-env requires --env/);
    assert.match(run(['qa', 'confirm-env', '--job', 'q1', '--env', 'dev'], ctx).stderr, /qa confirm-env requires --target/);
    const missing = run(['qa', 'confirm-env', '--job', 'nope', '--env', 'dev', '--target', 't'], ctx);
    assert.strictEqual(missing.status, 1);
    assert.match(missing.stderr, /state not found/);
  } finally {
    cleanup(ctx);
  }
});

test('qa capabilities records browser, http, and shell as yes or no', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'q1', { job_type: 'qa' });
    const result = run(['qa', 'capabilities', '--job', 'q1', '--browser', 'no', '--http', 'yes', '--shell', 'yes'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /QA capabilities recorded for job q1: browser=no, http=yes, shell=yes/);
    assert.strictEqual(fieldValue(dir, 'qa_capabilities'), 'browser=no, http=yes, shell=yes');
  } finally {
    cleanup(ctx);
  }
});

test('qa capabilities requires every capability flag and an existing job, and rejects values other than yes or no', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'q1', { job_type: 'qa' });
    assert.match(run(['qa', 'capabilities', '--browser', 'yes', '--http', 'yes', '--shell', 'yes'], ctx).stderr, /qa capabilities requires --job/);
    assert.match(run(['qa', 'capabilities', '--job', 'q1', '--http', 'yes', '--shell', 'yes'], ctx).stderr, /qa capabilities --browser must be yes or no/);
    assert.match(run(['qa', 'capabilities', '--job', 'q1', '--browser', 'maybe', '--http', 'yes', '--shell', 'yes'], ctx).stderr, /qa capabilities --browser must be yes or no/);
    assert.match(run(['qa', 'capabilities', '--job', 'q1', '--browser', 'yes', '--http', 'yes'], ctx).stderr, /qa capabilities --shell must be yes or no/);
    assert.strictEqual(fieldValue(dir, 'qa_capabilities'), undefined);
    const missing = run(['qa', 'capabilities', '--job', 'nope', '--browser', 'yes', '--http', 'yes', '--shell', 'yes'], ctx);
    assert.strictEqual(missing.status, 1);
    assert.match(missing.stderr, /state not found/);
  } finally {
    cleanup(ctx);
  }
});

test('phase advance refuses to enter phase 1 of a qa job until a dev or staging environment is confirmed', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'q1', { job_type: 'qa', current_phase: 'null', current_step: 'plan' });
    seedPhases(ctx, 'q1', { phases: [{ title: 'Forms' }] });
    const result = run(['phase', 'advance', '--job', 'q1', '--phase', '0'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /QA job q1 cannot enter phase 1 until its environment is confirmed/);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'plan');
  } finally {
    cleanup(ctx);
  }
});

test('phase advance enters phase 1 of a qa job once its environment is confirmed', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'q1', { job_type: 'qa', current_phase: 'null', current_step: 'plan', qa_environment_confirmed: 'true' });
    seedPhases(ctx, 'q1', { phases: [{ title: 'Forms' }] });
    const result = run(['phase', 'advance', '--job', 'q1', '--phase', '0'], ctx);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(fieldValue(dir, 'current_phase'), 1);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'implement');
  } finally {
    cleanup(ctx);
  }
});

test('phase advance into phase 1 of a standard job needs no environment confirmation', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 's1', { job_type: 'standard', current_phase: 'null', current_step: 'plan' });
    seedPhases(ctx, 's1', { phases: [{ title: 'Build' }] });
    const result = run(['phase', 'advance', '--job', 's1', '--phase', '0'], ctx);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(fieldValue(dir, 'current_phase'), 1);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// job step-advance
// ---------------------------------------------------------------------

test('job step-advance requires --job', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'step-advance'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /job step-advance requires --job/);
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance fails when the job state does not exist', () => {
  const ctx = scratch();
  try {
    const result = run(['job', 'step-advance', '--job', 'missing'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /state not found/);
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance fails when the job has no current_step set', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_step: undefined });
    const result = run(['job', 'step-advance', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /has no current_step set/);
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-do');
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance moves title -> spec -> plan without touching next_command', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_step: 'title', next_command: 'xoch-open' });
    let result = run(['job', 'step-advance', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Step advanced for job j1: title -> spec/);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'spec');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-open');

    result = run(['job', 'step-advance', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Step advanced for job j1: spec -> plan/);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'plan');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-open');
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance moves implement -> advance without touching next_command', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_step: 'implement', next_command: 'xoch-do' });
    const result = run(['job', 'step-advance', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Step advanced for job j1: implement -> advance/);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'advance');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-do');
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance on a qa job moves title -> intake -> plan instead of through spec', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'q1', { job_type: 'qa', current_step: 'title', next_command: 'xoch-qa' });
    let result = run(['job', 'step-advance', '--job', 'q1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Step advanced for job q1: title -> intake/);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'intake');

    result = run(['job', 'step-advance', '--job', 'q1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Step advanced for job q1: intake -> plan/);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'plan');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-qa');
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance on an explicitly standard job still moves title -> spec', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 's1', { job_type: 'standard', current_step: 'title', next_command: 'xoch-open' });
    const result = run(['job', 'step-advance', '--job', 's1'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'spec');
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance refuses a job whose job_type it does not recognize', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'w1', { job_type: 'weird', current_step: 'title' });
    const result = run(['job', 'step-advance', '--job', 'w1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown job_type 'weird'/);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'title');
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance refuses to move past final_review -- that outcome is judgment-dependent, not mechanical', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_step: 'final_review', next_command: 'xoch-do' });
    const result = run(['job', 'step-advance', '--job', 'j1'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /no deterministic follow-up for 'final_review'/);
    assert.strictEqual(fieldValue(dir, 'current_step'), 'final_review');
    assert.strictEqual(fieldValue(dir, 'next_command'), 'xoch-do');
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance refuses to move past plan or advance -- those cross a phase boundary via phase advance', () => {
  const ctx = scratch();
  try {
    for (const step of ['plan', 'advance']) {
      const dir = seedJob(ctx, `j-${step}`, { current_step: step });
      const result = run(['job', 'step-advance', '--job', `j-${step}`], ctx);
      assert.strictEqual(result.status, 1);
      assert.match(result.stderr, /no deterministic follow-up for '.+'/);
      assert.strictEqual(fieldValue(dir, 'current_step'), step);
    }
  } finally {
    cleanup(ctx);
  }
});

test('job step-advance projects the new current_step into current.json via job current', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { current_step: 'implement', next_command: 'xoch-do' });
    seedPointer(ctx, { id: 'j1' }, null, { next_command: 'xoch-do', current_step: 'implement' });
    run(['job', 'step-advance', '--job', 'j1'], ctx);
    const result = run(['job', 'current', '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.current_step, 'advance');
    assert.strictEqual(data.next_command, 'xoch-do');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// arc job-move
// ---------------------------------------------------------------------

// Seeds an arc's jobs.json from entries written the way jobs.md used to
// list them ("- `id` - title"), keyed by section name ('Active', ...).
function seedArcJobs(ctx, arcId, sections) {
  const dir = seedArc(ctx, arcId);
  const data = {};
  for (const name of ['Active', 'Planned', 'Complete', 'Parked']) {
    data[name.toLowerCase()] = (sections[name] || []).map((line) => {
      const m = line.match(/^- `([^`]+)`(?: - (.*))?$/);
      return { id: m[1], title: m[2] || null };
    });
  }
  fs.writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify(data, null, 2));
  return dir;
}

// A section's entries from jobs.json, formatted "- `id` - title" so tests
// read the same way the arc's membership is described.
function sectionLines(dir, name) {
  const data = readJsonFile(path.join(dir, 'jobs.json'));
  return data[name.toLowerCase()].map((e) => `- \`${e.id}\`${e.title ? ` - ${e.title}` : ''}`);
}

test('moving a planned job to active takes it out of Planned and lists it under Active with its title', () => {
  const ctx = scratch();
  try {
    const dir = seedArcJobs(ctx, 'a1', {
      Active: ['- `first` - First job'],
      Planned: ['- `second` - Second job', '- `third` - Third job'],
    });

    const result = run(['arc', 'job-move', '--arc', 'a1', '--job', 'second', '--to', 'active'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /second -> Active/);
    assert.deepStrictEqual(sectionLines(dir, 'Active'), ['- `first` - First job', '- `second` - Second job']);
    assert.deepStrictEqual(sectionLines(dir, 'Planned'), ['- `third` - Third job']);
  } finally {
    cleanup(ctx);
  }
});

test('moving a job the arc does not list yet adds it under the target section', () => {
  const ctx = scratch();
  try {
    const dir = seedArcJobs(ctx, 'a1', {});

    run(['arc', 'job-move', '--arc', 'a1', '--job', 'fresh', '--title', 'Fresh job', '--to', 'active'], ctx);
    assert.deepStrictEqual(sectionLines(dir, 'Active'), ['- `fresh` - Fresh job']);

    run(['arc', 'job-move', '--arc', 'a1', '--job', 'untitled', '--to', 'parked'], ctx);
    assert.deepStrictEqual(sectionLines(dir, 'Parked'), ['- `untitled`']);
  } finally {
    cleanup(ctx);
  }
});

test('--from swaps a planned placeholder entry for the real job ID that was opened for it', () => {
  const ctx = scratch();
  try {
    const dir = seedArcJobs(ctx, 'a1', { Planned: ['- `api-work` - Build the API'] });

    run(['arc', 'job-move', '--arc', 'a1', '--job', 'build-the-api', '--from', 'api-work', '--to', 'active'], ctx);
    assert.deepStrictEqual(sectionLines(dir, 'Active'), ['- `build-the-api` - Build the API']);
    assert.deepStrictEqual(sectionLines(dir, 'Planned'), []);
  } finally {
    cleanup(ctx);
  }
});

test('an explicit --title replaces the title an existing entry already had', () => {
  const ctx = scratch();
  try {
    const dir = seedArcJobs(ctx, 'a1', { Planned: ['- `second` - Old title'] });

    run(['arc', 'job-move', '--arc', 'a1', '--job', 'second', '--title', 'New title', '--to', 'active'], ctx);
    assert.deepStrictEqual(sectionLines(dir, 'Active'), ['- `second` - New title']);
  } finally {
    cleanup(ctx);
  }
});

test('a job listed more than once, or alongside its --from placeholder, ends up listed exactly once', () => {
  const ctx = scratch();
  try {
    const dir = seedArcJobs(ctx, 'a1', {
      Active: ['- `real-id` - Real title'],
      Planned: ['- `placeholder` - Placeholder title'],
    });

    run(['arc', 'job-move', '--arc', 'a1', '--job', 'real-id', '--from', 'placeholder', '--to', 'complete'], ctx);
    assert.deepStrictEqual(sectionLines(dir, 'Complete'), ['- `real-id` - Real title']);
    assert.deepStrictEqual(sectionLines(dir, 'Active'), []);
    assert.deepStrictEqual(sectionLines(dir, 'Planned'), []);
  } finally {
    cleanup(ctx);
  }
});

test('arc job-move refuses missing flags, an unknown target section, and a missing arc, and starts membership for an arc that has none', () => {
  const ctx = scratch();
  try {
    seedArcJobs(ctx, 'a1', {});
    const noArc = run(['arc', 'job-move', '--job', 'j', '--to', 'active'], ctx);
    assert.strictEqual(noArc.status, 1);
    assert.match(noArc.stderr, /arc job-move requires --arc, --job, and --to/);

    const badSection = run(['arc', 'job-move', '--arc', 'a1', '--job', 'j', '--to', 'someday'], ctx);
    assert.strictEqual(badSection.status, 1);
    assert.match(badSection.stderr, /--to must be one of active, planned, complete, parked/);

    const missing = run(['arc', 'job-move', '--arc', 'ghost', '--job', 'j', '--to', 'active'], ctx);
    assert.strictEqual(missing.status, 1);
    assert.match(missing.stderr, /arc not found: ghost/);

    const dir = seedArc(ctx, 'a2');
    const noJobs = run(['arc', 'job-move', '--arc', 'a2', '--job', 'j', '--to', 'active'], ctx);
    assert.strictEqual(noJobs.status, 0, noJobs.stderr);
    assert.deepStrictEqual(sectionLines(dir, 'Active'), ['- `j`']);
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
    fs.writeFileSync(path.join(centralJobDir, 'state.json'), JSON.stringify({ job_id: 'j1', title: 'j1' }));

    run(['file', 'write', '--job', 'j1', '--path', 'spec.md'], ctx, 'centralized content\n');
    assert.strictEqual(fs.readFileSync(path.join(centralJobDir, 'spec.md'), 'utf8'), 'centralized content\n');
    assert.strictEqual(fs.existsSync(jobDirOf(ctx, 'j1')), false);

    const readResult = run(['file', 'read', '--job', 'j1', '--path', 'spec.md'], ctx);
    assert.strictEqual(readResult.stdout, 'centralized content\n');
  } finally {
    cleanup(ctx);
  }
});

function discoveriesDirOf(ctx) {
  return path.join(xochRootDir(ctx), 'discoveries');
}

function soleFileMatching(dir, pattern) {
  const matches = fs.readdirSync(dir).filter((name) => pattern.test(name));
  assert.strictEqual(matches.length, 1, `expected exactly one match for ${pattern} in ${dir}, found: ${matches.join(', ')}`);
  return matches[0];
}

test('discovery write: creates the discoveries dir and a dated, topic-slugged file with exact content', () => {
  const ctx = scratch();
  try {
    const result = run(['discovery', 'write', '--topic', 'Auth Flow'], ctx, '# Discovery - Auth Flow\n\nFindings here.\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Discovery written:/);
    const name = soleFileMatching(discoveriesDirOf(ctx), /^\d{4}-\d{2}-\d{2}-auth-flow-discovery\.md$/);
    const content = fs.readFileSync(path.join(discoveriesDirOf(ctx), name), 'utf8');
    assert.strictEqual(content, '# Discovery - Auth Flow\n\nFindings here.\n');
  } finally {
    cleanup(ctx);
  }
});

test('discovery write: works with no active job at all', () => {
  const ctx = scratch();
  try {
    const result = run(['discovery', 'write', '--topic', 'No Job Yet'], ctx, 'content\n');
    assert.strictEqual(result.status, 0);
    soleFileMatching(discoveriesDirOf(ctx), /^\d{4}-\d{2}-\d{2}-no-job-yet-discovery\.md$/);
  } finally {
    cleanup(ctx);
  }
});

test('discovery write: still writes to the shared directory, not the active job\'s notes dir, when a job is active', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const result = run(['discovery', 'write', '--topic', 'With Active Job'], ctx, 'content\n');
    assert.strictEqual(result.status, 0);
    soleFileMatching(discoveriesDirOf(ctx), /^\d{4}-\d{2}-\d{2}-with-active-job-discovery\.md$/);
    assert.strictEqual(fs.existsSync(path.join(jobDirOf(ctx, 'j1'), 'notes')), false);
  } finally {
    cleanup(ctx);
  }
});

test('discovery write: a second write for the same topic on the same day gets a numeric suffix rather than overwriting', () => {
  const ctx = scratch();
  try {
    const first = run(['discovery', 'write', '--topic', 'Repeat Topic'], ctx, 'first\n');
    assert.strictEqual(first.status, 0);
    const second = run(['discovery', 'write', '--topic', 'Repeat Topic'], ctx, 'second\n');
    assert.strictEqual(second.status, 0);

    const names = fs.readdirSync(discoveriesDirOf(ctx)).filter((name) => name.includes('repeat-topic'));
    assert.strictEqual(names.length, 2);
    const firstName = names.find((name) => !/-2-discovery\.md$/.test(name));
    const secondName = names.find((name) => /-2-discovery\.md$/.test(name));
    assert.strictEqual(fs.readFileSync(path.join(discoveriesDirOf(ctx), firstName), 'utf8'), 'first\n');
    assert.strictEqual(fs.readFileSync(path.join(discoveriesDirOf(ctx), secondName), 'utf8'), 'second\n');
  } finally {
    cleanup(ctx);
  }
});

test('discovery write: rejects a missing --topic and a topic that slugs to empty', () => {
  const ctx = scratch();
  try {
    const missing = run(['discovery', 'write'], ctx, 'content\n');
    assert.strictEqual(missing.status, 1);
    assert.match(missing.stderr, /--topic is required/);

    const empty = run(['discovery', 'write', '--topic', '!!!'], ctx, 'content\n');
    assert.strictEqual(empty.status, 1);
    assert.match(empty.stderr, /empty slug/);
  } finally {
    cleanup(ctx);
  }
});

test('discovery read: exact round trip, missing file errors cleanly', () => {
  const ctx = scratch();
  try {
    run(['discovery', 'write', '--topic', 'Read Back'], ctx, 'round trip content\n');
    const name = soleFileMatching(discoveriesDirOf(ctx), /^\d{4}-\d{2}-\d{2}-read-back-discovery\.md$/);

    const readResult = run(['discovery', 'read', '--path', name], ctx);
    assert.strictEqual(readResult.status, 0);
    assert.strictEqual(readResult.stdout, 'round trip content\n');

    const missingResult = run(['discovery', 'read', '--path', 'does-not-exist-discovery.md'], ctx);
    assert.strictEqual(missingResult.status, 1);
    assert.match(missingResult.stderr, /discovery not found/);
  } finally {
    cleanup(ctx);
  }
});

test('discovery read: rejects a missing --path', () => {
  const ctx = scratch();
  try {
    const result = run(['discovery', 'read'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /--path is required/);
  } finally {
    cleanup(ctx);
  }
});

test('discovery read: rejects path traversal (relative and absolute)', () => {
  const ctx = scratch();
  try {
    const relResult = run(['discovery', 'read', '--path', '../escape.md'], ctx);
    assert.strictEqual(relResult.status, 1);
    assert.match(relResult.stderr, /traversal/);
    const absResult = run(['discovery', 'read', '--path', '/etc/escape.md'], ctx);
    assert.strictEqual(absResult.status, 1);
    assert.match(absResult.stderr, /traversal/);
  } finally {
    cleanup(ctx);
  }
});

test('discovery write/read round trip under centralized storage mode', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.home, '.xoch'), { recursive: true });
    fs.writeFileSync(path.join(ctx.home, '.xoch', 'config.json'), JSON.stringify({ storage: { mode: 'centralized' } }));
    const centralDiscoveriesDir = path.join(ctx.home, '.xoch', 'projects', path.basename(ctx.cwd), 'discoveries');

    run(['discovery', 'write', '--topic', 'Central Mode'], ctx, 'centralized content\n');
    const name = soleFileMatching(centralDiscoveriesDir, /^\d{4}-\d{2}-\d{2}-central-mode-discovery\.md$/);
    assert.strictEqual(fs.readFileSync(path.join(centralDiscoveriesDir, name), 'utf8'), 'centralized content\n');
    assert.strictEqual(fs.existsSync(discoveriesDirOf(ctx)), false);

    const readResult = run(['discovery', 'read', '--path', name], ctx);
    assert.strictEqual(readResult.stdout, 'centralized content\n');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// JSON state helpers: state get / update, typed state set
// ---------------------------------------------------------------------

test('state get prints the whole job state as JSON, or one field', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1', { risks: ['slow disk'] });
    const whole = run(['state', 'get', '--job', 'j1', '--json'], ctx);
    assert.strictEqual(whole.status, 0, whole.stderr);
    assert.strictEqual(JSON.parse(whole.stdout).job_id, 'j1');
    const text = run(['state', 'get', '--job', 'j1', '--field', 'status'], ctx);
    assert.strictEqual(text.stdout, 'phase_ready\n');
    const list = run(['state', 'get', '--job', 'j1', '--field', 'risks'], ctx);
    assert.deepStrictEqual(JSON.parse(list.stdout), ['slow disk']);
    const missing = run(['state', 'get', '--job', 'j1', '--field', 'nope'], ctx);
    assert.strictEqual(missing.stdout, 'null\n');
  } finally {
    cleanup(ctx);
  }
});

test('state get requires --job and an existing job', () => {
  const ctx = scratch();
  try {
    assert.match(run(['state', 'get'], ctx).stderr, /requires --job/);
    assert.match(run(['state', 'get', '--job', 'ghost'], ctx).stderr, /state not found/);
  } finally {
    cleanup(ctx);
  }
});

test('state set with --json stores a list or number, and a plain "null" value clears a field', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    assert.strictEqual(run(['state', 'set', '--job', 'j1', '--field', 'risks', '--value', '["a","b"]', '--json'], ctx).status, 0);
    assert.strictEqual(run(['state', 'set', '--job', 'j1', '--field', 'current_phase', '--value', '2', '--json'], ctx).status, 0);
    assert.strictEqual(run(['state', 'set', '--job', 'j1', '--field', 'review_status', '--value', 'null'], ctx).status, 0);
    assert.deepStrictEqual(fieldValue(dir, 'risks'), ['a', 'b']);
    assert.strictEqual(fieldValue(dir, 'current_phase'), 2);
    assert.strictEqual(fieldValue(dir, 'review_status'), null);
  } finally {
    cleanup(ctx);
  }
});

test('state set refuses a value that does not fit the field, or JSON that does not parse, and writes nothing', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    const before = fs.readFileSync(path.join(dir, 'state.json'), 'utf8');
    const wrongType = run(['state', 'set', '--job', 'j1', '--field', 'current_phase', '--value', 'two'], ctx);
    assert.strictEqual(wrongType.status, 1);
    assert.match(wrongType.stderr, /current_phase/);
    const badJson = run(['state', 'set', '--job', 'j1', '--field', 'risks', '--value', '[oops', '--json'], ctx);
    assert.strictEqual(badJson.status, 1);
    assert.match(badJson.stderr, /not valid JSON/);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'), before);
  } finally {
    cleanup(ctx);
  }
});

test('state update merges a JSON object from stdin and stamps last_updated', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    const r = run(['state', 'update', '--job', 'j1'], ctx, '{"status": "spec_complete", "spec_status": "accepted", "current_step": null}');
    assert.strictEqual(r.status, 0, r.stderr);
    const state = readState(dir);
    assert.strictEqual(state.status, 'spec_complete');
    assert.strictEqual(state.spec_status, 'accepted');
    assert.strictEqual(state.current_step, null);
    assert.notStrictEqual(state.last_updated, '2026-08-19');
    assert.strictEqual(state.title, 'j1');
  } finally {
    cleanup(ctx);
  }
});

test('state update refuses input that is not a JSON object, or a mistyped field, and writes nothing', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    const before = fs.readFileSync(path.join(dir, 'state.json'), 'utf8');
    assert.match(run(['state', 'update', '--job', 'j1'], ctx, 'not json').stderr, /not valid JSON/);
    assert.match(run(['state', 'update', '--job', 'j1'], ctx, '[1, 2]').stderr, /JSON object/);
    assert.match(run(['state', 'update', '--job', 'j1'], ctx, '{"phase_count": "x"}').stderr, /phase_count/);
    assert.match(run(['state', 'update'], ctx, '{}').stderr, /requires --job/);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'), before);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// phase write / get / show
// ---------------------------------------------------------------------

function threePhases() {
  return {
    phases: [
      {
        title: 'Build', goal: 'Make it', files: [{ path: 'a.js' }], acceptance_criteria: ['AC-001'], testing_requirements: ['npm test'],
      },
      { title: 'Check it live', type: 'checkpoint', acceptance_criteria: ['AC-002'] },
      { title: 'Docs', goal: 'Write it down' },
    ],
  };
}

test('phase write stores a validated phases document and records the phase count and index in job state', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: null, phase_count: 0 });
    const r = run(['phase', 'write', '--job', 'j1'], ctx, JSON.stringify(threePhases()));
    assert.strictEqual(r.status, 0, r.stderr);
    const doc = readJsonFile(path.join(dir, 'phases.json'));
    assert.strictEqual(doc.phases.length, 3);
    assert.strictEqual(doc.phases[1].type, 'checkpoint');
    const state = readState(dir);
    assert.strictEqual(state.phase_count, 3);
    assert.deepStrictEqual(state.phase_index.map((e) => [e.phase, e.title, e.status]), [[1, 'Build', 'not_started'], [2, 'Check it live', 'not_started'], [3, 'Docs', 'not_started']]);
    assert.strictEqual(state.current_phase, null);
  } finally {
    cleanup(ctx);
  }
});

test('phase write with a current phase refreshes the current-phase fields in job state, keeping completed statuses', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    const doc = threePhases();
    doc.phases[0].status = 'complete';
    doc.current_phase = 3;
    assert.strictEqual(run(['phase', 'write', '--job', 'j1'], ctx, JSON.stringify(doc)).status, 0);
    const state = readState(dir);
    assert.strictEqual(state.current_phase, 3);
    assert.strictEqual(state.current_phase_title, 'Docs');
    assert.strictEqual(state.current_phase_goal, 'Write it down');
    assert.strictEqual(state.phase_index[0].status, 'complete');
  } finally {
    cleanup(ctx);
  }
});

test('phase write reports how many phases it wrote', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    assert.match(run(['phase', 'write', '--job', 'j1'], ctx, '{"phases": [{"title": "Only"}]}').stdout, /Phases written for job j1: 1 phase\n/);
    assert.match(run(['phase', 'write', '--job', 'j1'], ctx, JSON.stringify(threePhases())).stdout, /Phases written for job j1: 3 phases\n/);
  } finally {
    cleanup(ctx);
  }
});

test('phase write refuses a malformed document and writes nothing', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    const before = fs.readFileSync(path.join(dir, 'state.json'), 'utf8');
    const bad = run(['phase', 'write', '--job', 'j1'], ctx, '{"phases": [{"type": "checkpoint"}]}');
    assert.strictEqual(bad.status, 1);
    assert.match(bad.stderr, /phase 1: title is required/);
    assert.match(run(['phase', 'write', '--job', 'j1'], ctx, '{nope').stderr, /not valid JSON/);
    assert.ok(!fs.existsSync(path.join(dir, 'phases.json')));
    assert.strictEqual(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'), before);
  } finally {
    cleanup(ctx);
  }
});

test('phase get returns the whole phases document, or one phase by position with its number', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPhases(ctx, 'j1', threePhases());
    const whole = JSON.parse(run(['phase', 'get', '--job', 'j1', '--json'], ctx).stdout);
    assert.strictEqual(whole.phases.length, 3);
    const second = JSON.parse(run(['phase', 'get', '--job', 'j1', '--phase', '2'], ctx).stdout);
    assert.strictEqual(second.phase, 2);
    assert.strictEqual(second.title, 'Check it live');
    const outOfRange = run(['phase', 'get', '--job', 'j1', '--phase', '9'], ctx);
    assert.strictEqual(outOfRange.status, 1);
    assert.match(outOfRange.stderr, /phase 9/);
  } finally {
    cleanup(ctx);
  }
});

test('phase get and show refuse a job that has no phases yet', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    assert.match(run(['phase', 'get', '--job', 'j1'], ctx).stderr, /no phases/);
    assert.match(run(['phase', 'show', '--job', 'j1'], ctx).stderr, /no phases/);
  } finally {
    cleanup(ctx);
  }
});

test('phase show renders phases as readable text, marking the current phase', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedPhases(ctx, 'j1', { ...threePhases(), current_phase: 2 });
    const all = run(['phase', 'show', '--job', 'j1'], ctx);
    assert.strictEqual(all.status, 0, all.stderr);
    assert.match(all.stdout, /Current phase: 2/);
    assert.match(all.stdout, /## Phase 1: Build/);
    assert.match(all.stdout, /Goal: Make it/);
    assert.match(all.stdout, /- a\.js/);
    assert.match(all.stdout, /## Phase 2: Check it live\nType: checkpoint/);
    const one = run(['phase', 'show', '--job', 'j1', '--phase', '3'], ctx);
    assert.match(one.stdout, /## Phase 3: Docs/);
    assert.doesNotMatch(one.stdout, /Phase 1/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// phase advance by position
// ---------------------------------------------------------------------

test('phase advance --phase 0 enters phase 1, taking its details from the phases document', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: null });
    seedPhases(ctx, 'j1', threePhases());
    const r = run(['phase', 'advance', '--job', 'j1', '--phase', '0'], ctx);
    assert.strictEqual(r.status, 0, r.stderr);
    const state = readState(dir);
    assert.strictEqual(state.current_phase, 1);
    assert.strictEqual(state.current_phase_title, 'Build');
    assert.strictEqual(state.current_phase_goal, 'Make it');
    assert.strictEqual(state.current_phase_type, 'implementation');
    assert.deepStrictEqual(state.current_phase_files, ['a.js']);
    assert.deepStrictEqual(state.current_phase_acceptance_criteria, ['AC-001']);
    assert.deepStrictEqual(state.current_phase_validation, ['npm test']);
    assert.strictEqual(state.current_step, 'implement');
    assert.strictEqual(state.next_command, 'xoch-do');
    assert.strictEqual(readJsonFile(path.join(dir, 'phases.json')).current_phase, 1);
  } finally {
    cleanup(ctx);
  }
});

test('phase advance marks the Nth phase complete and the phase index matches the phases document exactly', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    const doc = threePhases();
    doc.phases[0].title = 'Phase 2: a title that looks like a heading';
    seedPhases(ctx, 'j1', { ...doc, current_phase: 1 });
    assert.strictEqual(run(['phase', 'advance', '--job', 'j1', '--phase', '1'], ctx).status, 0);
    const phases = readJsonFile(path.join(dir, 'phases.json')).phases;
    assert.deepStrictEqual(phases.map((p) => p.status), ['complete', 'not_started', 'not_started']);
    const state = readState(dir);
    assert.deepStrictEqual(state.phase_index, phases.map((p, i) => ({
      phase: i + 1, title: p.title, status: p.status, type: p.type,
    })));
    assert.strictEqual(state.current_phase, 2);
    assert.strictEqual(state.current_phase_type, 'checkpoint');
    assert.strictEqual(state.phase_count, 3);
  } finally {
    cleanup(ctx);
  }
});

test('advancing past the last phase routes the job to final review and clears the current phase', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1', { current_phase: 3 });
    seedPhases(ctx, 'j1', { ...threePhases(), current_phase: 3 });
    assert.strictEqual(run(['phase', 'advance', '--job', 'j1', '--phase', '3'], ctx).status, 0);
    const state = readState(dir);
    assert.strictEqual(state.status, 'implementation_complete');
    assert.strictEqual(state.current_phase, null);
    assert.strictEqual(state.current_phase_title, null);
    assert.deepStrictEqual(state.current_phase_files, []);
    assert.strictEqual(state.current_step, 'final_review');
    assert.strictEqual(readJsonFile(path.join(dir, 'phases.json')).current_phase, null);
  } finally {
    cleanup(ctx);
  }
});

test('a QA phase\'s validation is its case IDs', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'q1', { job_type: 'qa', qa_environment_confirmed: true, current_phase: null });
    seedPhases(ctx, 'q1', { phases: [{ title: 'Checkout', cases: [{ id: 'QA-1' }, { id: 'QA-2' }] }] });
    assert.strictEqual(run(['phase', 'advance', '--job', 'q1', '--phase', '0'], ctx).status, 0);
    assert.deepStrictEqual(fieldValue(dir, 'current_phase_validation'), ['QA-1', 'QA-2']);
  } finally {
    cleanup(ctx);
  }
});

test('phase advance refuses a phase number outside the phases document, or a job with no phases', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    assert.match(run(['phase', 'advance', '--job', 'j1', '--phase', '1'], ctx).stderr, /no phases/);
    seedPhases(ctx, 'j1', threePhases());
    assert.match(run(['phase', 'advance', '--job', 'j1', '--phase', '4'], ctx).stderr, /phase 4/);
    assert.match(run(['phase', 'advance', '--job', 'j1', '--phase', 'x'], ctx).stderr, /phase x/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// arc get / update
// ---------------------------------------------------------------------

test('arc get prints the arc state and membership as JSON, or as readable text', () => {
  const ctx = scratch();
  try {
    const dir = seedArc(ctx, 'a1', { purpose: 'Why' });
    fs.writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify({ active: [{ id: 'j1', title: 'One' }], planned: [{ id: 'j2', title: null }] }));
    const json = JSON.parse(run(['arc', 'get', '--arc', 'a1', '--json'], ctx).stdout);
    assert.strictEqual(json.state.purpose, 'Why');
    assert.deepStrictEqual(json.jobs.active, [{ id: 'j1', title: 'One' }]);
    assert.deepStrictEqual(json.jobs.complete, []);
    const text = run(['arc', 'get', '--arc', 'a1'], ctx).stdout;
    assert.match(text, /arc_id: a1/);
    assert.match(text, /Active:\n {2}- j1 - One/);
    assert.match(text, /Planned:\n {2}- j2\n/);
    assert.match(text, /Complete:\n {2}- None/);
  } finally {
    cleanup(ctx);
  }
});

test('arc get works for an arc with state but no membership file yet, and refuses a missing arc', () => {
  const ctx = scratch();
  try {
    seedArc(ctx, 'a1');
    const json = JSON.parse(run(['arc', 'get', '--arc', 'a1', '--json'], ctx).stdout);
    assert.deepStrictEqual(json.jobs, { active: [], planned: [], complete: [], parked: [] });
    assert.match(run(['arc', 'get', '--arc', 'ghost'], ctx).stderr, /arc not found/);
    assert.match(run(['arc', 'get'], ctx).stderr, /requires --arc/);
  } finally {
    cleanup(ctx);
  }
});

test('arc update merges a JSON object into arc state, refusing bad input without writing', () => {
  const ctx = scratch();
  try {
    const dir = seedArc(ctx, 'a1');
    const r = run(['arc', 'update', '--arc', 'a1'], ctx, '{"status": "closed", "closed": "2026-10-20", "next_command": null}');
    assert.strictEqual(r.status, 0, r.stderr);
    const state = readJsonFile(path.join(dir, 'state.json'));
    assert.strictEqual(state.status, 'closed');
    assert.strictEqual(state.closed, '2026-10-20');
    assert.strictEqual(state.next_command, null);
    const before = fs.readFileSync(path.join(dir, 'state.json'), 'utf8');
    assert.match(run(['arc', 'update', '--arc', 'a1'], ctx, '{"risks": "none"}').stderr, /risks/);
    assert.match(run(['arc', 'update', '--arc', 'a1'], ctx, 'nope').stderr, /not valid JSON/);
    assert.match(run(['arc', 'update', '--arc', 'a1'], ctx, '[1]').stderr, /must be a JSON object/);
    assert.match(run(['arc', 'update'], ctx, '{}').stderr, /requires --arc/);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'), before);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// markdown-only jobs and arcs, and helper-owned files
// ---------------------------------------------------------------------

test('a job or arc that still has only markdown state is refused as an old format this version no longer reads', () => {
  const ctx = scratch();
  try {
    const job = jobDirOf(ctx, 'old');
    fs.mkdirSync(job, { recursive: true });
    fs.writeFileSync(path.join(job, 'state.md'), 'job_id: old\ntitle: Old\n');
    const arc = arcDirOf(ctx, 'old-arc');
    fs.mkdirSync(arc, { recursive: true });
    fs.writeFileSync(path.join(arc, 'state.md'), 'arc_id: old-arc\ntitle: Old\n');
    for (const args of [['state', 'get', '--job', 'old'], ['job', 'set-current', '--job', 'old'], ['job', 'evidence', '--job', 'old'], ['arc', 'get', '--arc', 'old-arc']]) {
      const r = run(args, ctx);
      assert.strictEqual(r.status, 1, args.join(' '));
      assert.match(r.stderr, /old markdown state format.*no longer reads/, args.join(' '));
      assert.doesNotMatch(r.stderr, /md-to-json/, args.join(' '));
    }
  } finally {
    cleanup(ctx);
  }
});

test('job current refuses an old markdown current.md pointer as a format this version no longer reads', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(xochRootDir(ctx), 'work'), { recursive: true });
    fs.writeFileSync(path.join(xochRootDir(ctx), 'work', 'current.md'), '**Job ID**: j1\n');
    const r = run(['job', 'current', '--json'], ctx);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /current\.md.*old markdown pointer format.*no longer reads/);
  } finally {
    cleanup(ctx);
  }
});

test('file write and file edit refuse state.json and phases.json, which only helpers may change', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    seedPhases(ctx, 'j1', threePhases());
    const before = fs.readFileSync(path.join(dir, 'state.json'), 'utf8');
    for (const file of ['state.json', 'phases.json', './state.json']) {
      const w = run(['file', 'write', '--job', 'j1', '--path', file], ctx, '{}');
      assert.strictEqual(w.status, 1, file);
      assert.match(w.stderr, /managed by xoch/, file);
      const e = run(['file', 'edit', '--job', 'j1', '--path', file], ctx, 'a\n-----XOCH-EDIT-SEPARATOR-----\nb');
      assert.match(e.stderr, /managed by xoch/, file);
    }
    assert.strictEqual(run(['file', 'read', '--job', 'j1', '--path', 'state.json'], ctx).status, 0);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'), before);
  } finally {
    cleanup(ctx);
  }
});

test('a corrupt state.json, phases.json, or arc state is refused with the file named', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    fs.writeFileSync(path.join(dir, 'phases.json'), '{bad');
    assert.match(run(['phase', 'get', '--job', 'j1'], ctx).stderr, /Invalid JSON in .*phases\.json/);
    fs.writeFileSync(path.join(dir, 'state.json'), '{bad');
    assert.match(run(['state', 'get', '--job', 'j1'], ctx).stderr, /Invalid JSON in .*state\.json/);
    const arc = seedArc(ctx, 'a1');
    fs.writeFileSync(path.join(arc, 'jobs.json'), '[]');
    assert.match(run(['arc', 'get', '--arc', 'a1'], ctx).stderr, /arc jobs must be a JSON object/);
  } finally {
    cleanup(ctx);
  }
});

test('a job whose phases are still markdown is refused as an old format this version no longer reads', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    fs.writeFileSync(path.join(dir, 'phases.md'), '## Phase 1: Old\n');
    const r = run(['phase', 'show', '--job', 'j1'], ctx);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /old markdown phases format.*no longer reads/);
  } finally {
    cleanup(ctx);
  }
});

test('phase show renders every kind of phase detail, and document notes, when present', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'q1');
    seedPhases(ctx, 'q1', {
      notes: ['Shared definitions'],
      phases: [{
        title: 'Checkout',
        description: 'Exercise checkout.',
        required_capability: 'browser',
        allowed_owners: '[E]/[C] only',
        projects: ['shop'],
        files: [{ path: 'a.js', project: 'shop', note: 'form' }, { path: 'b.js' }],
        cases: [{ id: 'QA-1', expected: 'declined' }, { id: 'QA-2' }],
        notes: ['watch the logs'],
      }],
    });
    const out = run(['phase', 'show', '--job', 'q1'], ctx).stdout;
    assert.match(out, /Current phase: none/);
    assert.match(out, /Required capability: browser\nAllowed owners: \[E\]\/\[C\] only/);
    assert.match(out, /Exercise checkout\./);
    assert.match(out, /- shop: a\.js - form\n- b\.js/);
    assert.match(out, /Cases:\n- QA-1 - expected: declined\n- QA-2\n/);
    assert.match(out, /Projects:\n- shop/);
    assert.match(out, /Notes:\n- watch the logs/);
    assert.match(out, /## Notes\n- Shared definitions/);
    assert.match(run(['phase', 'show', '--job', 'q1', '--phase', '2'], ctx).stderr, /phase 2/);
  } finally {
    cleanup(ctx);
  }
});

test('phase helpers and state update require --job, and phase numbers must be numbers', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    for (const action of ['write', 'get', 'show', 'advance']) {
      assert.match(run(['phase', action], ctx, '{}').stderr, new RegExp(`phase ${action} requires --job`));
    }
    assert.match(run(['phase', 'advance', '--job', 'j1'], ctx).stderr, /requires --phase/);
    seedPhases(ctx, 'j1', threePhases());
    assert.match(run(['phase', 'get', '--job', 'j1', '--phase', 'two'], ctx).stderr, /phase two is not a phase number/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// stdin input: terminal fail-fast, file edit flags
// ---------------------------------------------------------------------

// Runs the real command in a child whose stdin claims to be an interactive
// terminal -- the situation where reading stdin used to block forever.
function runAsTerminal(args, ctx) {
  const specifier = JSON.stringify(pathToFileURL(SCRIPT).href);
  const script = `process.stdin.isTTY = true; import(${specifier}).then((m) => m.main(${JSON.stringify(args)}));`;
  return spawnSync(process.execPath, ['-e', script], {
    cwd: ctx.cwd,
    env: { ...process.env, HOME: ctx.home },
    encoding: 'utf8',
    input: '',
    timeout: 10000,
  });
}

test('every command that reads stdin fails at once with its usage when stdin is a terminal', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    seedArc(ctx, 'a1');
    fs.writeFileSync(path.join(dir, 'notes.md'), 'x\n');
    const cases = [
      [['file', 'write', '--job', 'j1', '--path', 'notes.md'], /file write reads the file content from stdin/],
      [['file', 'edit', '--job', 'j1', '--path', 'notes.md'], /--old-string/],
      [['discovery', 'write', '--topic', 'T'], /discovery write reads the note from stdin/],
      [['state', 'update', '--job', 'j1'], /state update reads a JSON object from stdin/],
      [['phase', 'write', '--job', 'j1'], /phase write reads the phases JSON from stdin/],
      [['arc', 'update', '--arc', 'a1'], /arc update reads a JSON object from stdin/],
    ];
    for (const [args, message] of cases) {
      const r = runAsTerminal(args, ctx);
      assert.strictEqual(r.error, undefined, `${args.join(' ')} timed out`);
      assert.strictEqual(r.status, 1, args.join(' '));
      assert.match(r.stderr, message, args.join(' '));
    }
    assert.strictEqual(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), 'x\n');
  } finally {
    cleanup(ctx);
  }
});

test('file edit with --old-string and --new-string replaces the text literally, without reading stdin', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    fs.writeFileSync(path.join(dir, 'notes.md'), 'alpha\nbeta\n');
    const r = runAsTerminal(['file', 'edit', '--job', 'j1', '--path', 'notes.md', '--old-string', 'beta', '--new-string', 'gamma\\ndelta'], ctx);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /File edited: .*notes\.md \(1 replacement\)/);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), 'alpha\ngamma\\ndelta\n');
  } finally {
    cleanup(ctx);
  }
});

test('file edit flags can delete text with an empty --new-string, and honor --replace-all and the ambiguity check', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    fs.writeFileSync(path.join(dir, 'notes.md'), 'a-b-a\n');
    assert.match(run(['file', 'edit', '--job', 'j1', '--path', 'notes.md', '--old-string', 'a', '--new-string', 'z'], ctx).stderr, /ambiguous/);
    assert.strictEqual(run(['file', 'edit', '--job', 'j1', '--path', 'notes.md', '--old-string', 'a', '--new-string', 'z', '--replace-all'], ctx).status, 0);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), 'z-b-z\n');
    assert.strictEqual(run(['file', 'edit', '--job', 'j1', '--path', 'notes.md', '--old-string', '-b', '--new-string', ''], ctx).status, 0);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), 'z-z\n');
  } finally {
    cleanup(ctx);
  }
});

test('file edit refuses only one of --old-string and --new-string, or an empty --old-string', () => {
  const ctx = scratch();
  try {
    const dir = seedJob(ctx, 'j1');
    fs.writeFileSync(path.join(dir, 'notes.md'), 'a\n');
    assert.match(run(['file', 'edit', '--job', 'j1', '--path', 'notes.md', '--old-string', 'a'], ctx).stderr, /--old-string and --new-string must be given together/);
    assert.match(run(['file', 'edit', '--job', 'j1', '--path', 'notes.md', '--new-string', 'b'], ctx).stderr, /--old-string and --new-string must be given together/);
    assert.match(run(['file', 'edit', '--job', 'j1', '--path', 'notes.md', '--old-string', '', '--new-string', 'b'], ctx).stderr, /--old-string must not be empty/);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), 'a\n');
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// handoffs
// ---------------------------------------------------------------------

function handoffsDirOf(ctx) {
  return path.join(xochRootDir(ctx), 'handoffs');
}

test('handoff write stores a pending handoff named from the date and topic, and prints its id', () => {
  const ctx = scratch();
  try {
    const r = run(['handoff', 'write', '--source', 'trace', '--topic', 'Login Bug!'], ctx, 'Root cause: expired token\n');
    assert.strictEqual(r.status, 0, r.stderr);
    const id = r.stdout.match(/Handoff written: (\S+)/)[1];
    assert.match(id, /^\d{4}-\d{2}-\d{2}-login-bug$/);
    const data = readJsonFile(path.join(handoffsDirOf(ctx), `${id}.json`));
    assert.strictEqual(data.source, 'trace');
    assert.strictEqual(data.topic, 'Login Bug!');
    assert.strictEqual(data.status, 'pending');
    assert.strictEqual(data.body, 'Root cause: expired token\n');
  } finally {
    cleanup(ctx);
  }
});

test('a second handoff with the same topic on the same day gets a numeric suffix', () => {
  const ctx = scratch();
  try {
    const first = run(['handoff', 'write', '--source', 'qa', '--topic', 'Checkout'], ctx, 'a').stdout.match(/Handoff written: (\S+)/)[1];
    const second = run(['handoff', 'write', '--source', 'qa', '--topic', 'Checkout'], ctx, 'b').stdout.match(/Handoff written: (\S+)/)[1];
    assert.strictEqual(second, `${first}-2`);
  } finally {
    cleanup(ctx);
  }
});

test('handoff write refuses a missing or unknown source, a missing topic, or an empty body', () => {
  const ctx = scratch();
  try {
    assert.match(run(['handoff', 'write', '--topic', 'T'], ctx, 'b').stderr, /--source must be one of discovery, trace, qa/);
    assert.match(run(['handoff', 'write', '--source', 'sidebar', '--topic', 'T'], ctx, 'b').stderr, /--source must be one of/);
    assert.match(run(['handoff', 'write', '--source', 'qa'], ctx, 'b').stderr, /requires --topic/);
    assert.match(run(['handoff', 'write', '--source', 'qa', '--topic', '!!!'], ctx, 'b').stderr, /empty slug/);
    assert.match(run(['handoff', 'write', '--source', 'qa', '--topic', 'T'], ctx, '  \n').stderr, /body is empty/);
    assert.ok(!fs.existsSync(handoffsDirOf(ctx)) || fs.readdirSync(handoffsDirOf(ctx)).length === 0);
  } finally {
    cleanup(ctx);
  }
});

test('handoff list shows every handoff, or only pending ones, as text or JSON', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    const a = run(['handoff', 'write', '--source', 'discovery', '--topic', 'Alpha'], ctx, 'A').stdout.match(/Handoff written: (\S+)/)[1];
    const b = run(['handoff', 'write', '--source', 'trace', '--topic', 'Beta'], ctx, 'B').stdout.match(/Handoff written: (\S+)/)[1];
    run(['handoff', 'claim', '--id', a, '--job', 'j1'], ctx);
    const text = run(['handoff', 'list'], ctx).stdout;
    assert.match(text, new RegExp(`${a} \\[claimed by j1\\] discovery: Alpha`));
    assert.match(text, new RegExp(`${b} \\[pending\\] trace: Beta`));
    const pending = JSON.parse(run(['handoff', 'list', '--pending', '--json'], ctx).stdout);
    assert.deepStrictEqual(pending.map((h) => h.id), [b]);
    assert.strictEqual(pending[0].body, 'B');
    assert.strictEqual(run(['handoff', 'list', '--pending'], ctx).stdout.includes(a), false);
  } finally {
    cleanup(ctx);
  }
});

test('handoff list with none says so', () => {
  const ctx = scratch();
  try {
    assert.strictEqual(run(['handoff', 'list', '--pending'], ctx).stdout, 'No pending handoffs.\n');
    assert.strictEqual(run(['handoff', 'list'], ctx).stdout, 'No handoffs.\n');
    assert.strictEqual(run(['handoff', 'list', '--json'], ctx).stdout, '[]\n');
  } finally {
    cleanup(ctx);
  }
});

test('handoff get prints one handoff in full, as text or JSON', () => {
  const ctx = scratch();
  try {
    const id = run(['handoff', 'write', '--source', 'qa', '--topic', 'Cards'], ctx, 'Deferred: QA-3\n').stdout.match(/Handoff written: (\S+)/)[1];
    const text = run(['handoff', 'get', '--id', id], ctx).stdout;
    assert.match(text, new RegExp(`id: ${id}\\nsource: qa\\ntopic: Cards\\nstatus: pending\\n`));
    assert.match(text, /\n\nDeferred: QA-3\n$/);
    assert.strictEqual(JSON.parse(run(['handoff', 'get', '--id', id, '--json'], ctx).stdout).body, 'Deferred: QA-3\n');
    assert.match(run(['handoff', 'get', '--id', 'nope'], ctx).stderr, /handoff not found: nope/);
    assert.match(run(['handoff', 'get'], ctx).stderr, /requires --id/);
  } finally {
    cleanup(ctx);
  }
});

test('handoff claim marks a handoff claimed by a job, and refuses a second claim, a missing handoff, or an unknown job', () => {
  const ctx = scratch();
  try {
    seedJob(ctx, 'j1');
    seedJob(ctx, 'j2');
    const id = run(['handoff', 'write', '--source', 'trace', '--topic', 'T'], ctx, 'B').stdout.match(/Handoff written: (\S+)/)[1];
    assert.match(run(['handoff', 'claim', '--id', id, '--job', 'ghost'], ctx).stderr, /state not found/);
    const ok = run(['handoff', 'claim', '--id', id, '--job', 'j1'], ctx);
    assert.strictEqual(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, new RegExp(`Handoff ${id} claimed by j1`));
    const data = readJsonFile(path.join(handoffsDirOf(ctx), `${id}.json`));
    assert.strictEqual(data.status, 'claimed');
    assert.strictEqual(data.claimed_by, 'j1');
    assert.ok(data.claimed_at);
    assert.match(run(['handoff', 'claim', '--id', id, '--job', 'j2'], ctx).stderr, /already claimed by j1/);
    assert.match(run(['handoff', 'claim', '--id', 'nope', '--job', 'j1'], ctx).stderr, /handoff not found: nope/);
    assert.match(run(['handoff', 'claim', '--id', id], ctx).stderr, /requires --id and --job/);
  } finally {
    cleanup(ctx);
  }
});

test('handoff ids cannot escape the handoffs folder', () => {
  const ctx = scratch();
  try {
    assert.match(run(['handoff', 'get', '--id', '../current'], ctx).stderr, /invalid handoff id/);
  } finally {
    cleanup(ctx);
  }
});

test('handoffs are stored under the centralized root when storage is centralized', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.home, '.xoch'), { recursive: true });
    fs.writeFileSync(path.join(ctx.home, '.xoch', 'config.json'), JSON.stringify({ storage: { mode: 'centralized' } }));
    const id = run(['handoff', 'write', '--source', 'qa', '--topic', 'T'], ctx, 'B').stdout.match(/Handoff written: (\S+)/)[1];
    assert.ok(fs.existsSync(path.join(ctx.home, '.xoch', 'projects', path.basename(ctx.cwd), 'handoffs', `${id}.json`)));
    assert.ok(!fs.existsSync(handoffsDirOf(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('a corrupt handoff file is refused by get and list, with the file named', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(handoffsDirOf(ctx), { recursive: true });
    fs.writeFileSync(path.join(handoffsDirOf(ctx), 'broken.json'), '{');
    assert.match(run(['handoff', 'get', '--id', 'broken'], ctx).stderr, /Invalid JSON in .*broken\.json/);
    assert.match(run(['handoff', 'list'], ctx).stderr, /Invalid JSON in .*broken\.json/);
  } finally {
    cleanup(ctx);
  }
});

runTests();
