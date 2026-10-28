'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import { JobState } from '../bin/lib/job-state.js';
import { ShapeError } from '../bin/lib/shape.js';

function writeState(dir, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(data));
}

test('a new job state starts with the same defaults job open has always written', () => {
  const state = JobState.create({ id: 'j1', title: 'Job One', started: '2026-10-15' });
  const data = state.toJSON();
  assert.strictEqual(data.job_id, 'j1');
  assert.strictEqual(data.title, 'Job One');
  assert.strictEqual(data.description, 'Job One');
  assert.strictEqual(data.status, 'active');
  assert.strictEqual(data.job_type, 'standard');
  assert.strictEqual(data.arc, 'standalone');
  assert.strictEqual(data.current_phase, null);
  assert.strictEqual(data.phase_count, 0);
  assert.deepStrictEqual(data.phase_index, []);
  assert.deepStrictEqual(data.documentation_targets, [{ scope: 'unknown', path: 'unknown' }]);
  assert.deepStrictEqual(data.decisions, []);
  assert.strictEqual(data.next_command, 'xoch-open');
  assert.strictEqual(data.current_step, 'title');
  assert.strictEqual(data.started, '2026-10-15');
  assert.strictEqual(data.last_updated, '2026-10-15');
});

test('a new QA job state starts at xoch-qa instead of xoch-open', () => {
  const state = JobState.create({ id: 'q1', title: 'QA', jobType: 'qa', arc: 'a1', docScope: 'project', docPath: 'README.md', description: 'desc', started: '2026-10-15' });
  const data = state.toJSON();
  assert.strictEqual(data.job_type, 'qa');
  assert.strictEqual(data.next_command, 'xoch-qa');
  assert.strictEqual(data.arc, 'a1');
  assert.strictEqual(data.description, 'desc');
  assert.deepStrictEqual(data.documentation_targets, [{ scope: 'project', path: 'README.md' }]);
});

test('a new job state uses today when no start date is given', () => {
  const data = JobState.create({ id: 'j1', title: 'T' }).toJSON();
  assert.match(data.started, /^\d{4}-\d{2}-\d{2}$/);
});

test('a saved job state loads back unchanged', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'jobs', 'j1');
    const original = JobState.create({ id: 'j1', title: 'Job One', started: '2026-10-15' });
    original.save(dir);
    assert.ok(fs.existsSync(path.join(dir, 'state.json')));
    assert.deepStrictEqual(JobState.load(dir).toJSON(), original.toJSON());
    assert.ok(JobState.exists(dir));
    assert.ok(!JobState.exists(path.join(ctx.cwd, 'jobs', 'missing')));
  } finally {
    cleanup(ctx);
  }
});

test('loading a job state fills in defaults for fields it does not have yet', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'j1');
    writeState(dir, { job_id: 'j1', title: 'Job One' });
    const data = JobState.load(dir).toJSON();
    assert.strictEqual(data.current_phase, null);
    assert.deepStrictEqual(data.risks, []);
    assert.strictEqual(data.job_type, 'standard');
  } finally {
    cleanup(ctx);
  }
});

test('fields the job state does not know about are kept, not dropped', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'j1');
    writeState(dir, { job_id: 'j1', title: 'T', spec_status: 'accepted', qa_decision: 'patch' });
    const state = JobState.load(dir);
    state.save(dir);
    const data = JobState.load(dir).toJSON();
    assert.strictEqual(data.spec_status, 'accepted');
    assert.strictEqual(data.qa_decision, 'patch');
  } finally {
    cleanup(ctx);
  }
});

test('loading a job state that is missing or not valid JSON is refused with the file named', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'j1');
    assert.throws(() => JobState.load(dir), /not found/);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'state.json'), '{oops');
    assert.throws(() => JobState.load(dir), /Invalid JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('a job state without an id or title is refused', () => {
  assert.throws(() => JobState.fromJSON({ title: 'T' }), (err) => err instanceof ShapeError && /job_id/.test(err.message));
  assert.throws(() => JobState.fromJSON({ job_id: 'j1' }), (err) => err instanceof ShapeError && /title/.test(err.message));
  assert.throws(() => JobState.fromJSON(null), ShapeError);
  assert.throws(() => JobState.fromJSON([]), ShapeError);
});

test('a job state with a wrongly typed field is refused with the field named', () => {
  const base = { job_id: 'j1', title: 'T' };
  assert.throws(() => JobState.fromJSON({ ...base, current_phase: '2' }), /current_phase/);
  assert.throws(() => JobState.fromJSON({ ...base, current_phase: 1.5 }), /current_phase/);
  assert.throws(() => JobState.fromJSON({ ...base, phase_count: null }), /phase_count/);
  assert.throws(() => JobState.fromJSON({ ...base, risks: 'none' }), /risks/);
  assert.throws(() => JobState.fromJSON({ ...base, status: 7 }), /status/);
  assert.throws(() => JobState.fromJSON({ ...base, documentation_targets: [{ scope: 'x' }] }), /documentation_targets/);
  assert.throws(() => JobState.fromJSON({ ...base, phase_index: [{ phase: 1 }] }), /phase_index/);
  assert.throws(() => JobState.fromJSON({ ...base, phase_index: 'none' }), /phase_index/);
  assert.throws(() => JobState.fromJSON({ ...base, phase_index: [null] }), /phase_index/);
  assert.throws(() => JobState.fromJSON({ ...base, phase_index: [{ phase: 1, title: 'A', status: 'complete' }] }), /phase_index/);
});

test('reading one field returns its value, and an unknown field reads as undefined', () => {
  const state = JobState.create({ id: 'j1', title: 'T', started: '2026-10-15' });
  assert.strictEqual(state.get('current_step'), 'title');
  assert.strictEqual(state.get('nonexistent'), undefined);
});

test('setting a field stores typed values, including lists', () => {
  const state = JobState.create({ id: 'j1', title: 'T', started: '2026-10-15' });
  state.set('current_phase', 2);
  state.set('risks', ['slow disk']);
  state.set('spec_status', 'accepted');
  assert.strictEqual(state.get('current_phase'), 2);
  assert.deepStrictEqual(state.get('risks'), ['slow disk']);
  assert.strictEqual(state.get('spec_status'), 'accepted');
});

test('setting a field to a wrongly typed value is refused and leaves the state unchanged', () => {
  const state = JobState.create({ id: 'j1', title: 'T', started: '2026-10-15' });
  assert.throws(() => state.set('current_phase', 'two'), /current_phase/);
  assert.strictEqual(state.get('current_phase'), null);
});

test('updating several fields applies all of them, or none when one is invalid', () => {
  const state = JobState.create({ id: 'j1', title: 'T', started: '2026-10-15' });
  state.update({ status: 'phase_ready', current_phase: 1 });
  assert.strictEqual(state.get('status'), 'phase_ready');
  assert.strictEqual(state.get('current_phase'), 1);
  assert.throws(() => state.update({ status: 'closed', phase_count: 'x' }), /phase_count/);
  assert.strictEqual(state.get('status'), 'phase_ready');
  assert.throws(() => state.update(['not', 'an', 'object']), ShapeError);
});

test('changing a job state never alters the copy previously returned by toJSON', () => {
  const state = JobState.create({ id: 'j1', title: 'T', started: '2026-10-15' });
  const before = state.toJSON();
  before.risks.push('mutated outside');
  state.set('status', 'closed');
  assert.deepStrictEqual(state.get('risks'), []);
  assert.strictEqual(before.status, 'active');
});

run();
