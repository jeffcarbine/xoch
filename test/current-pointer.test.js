'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import { CurrentPointer } from '../bin/lib/current-pointer.js';

function pointerData(overrides = {}) {
  return {
    version: 1,
    job: { id: 'j1', title: 'Job One', arc: 'standalone', directory: '.xoch/work/jobs/j1' },
    workflow: null,
    next_command: 'xoch-do',
    current_step: 'implement',
    job_type: 'standard',
    started_at: '2026-10-15',
    updated_at: '2026-10-15T00:00:00Z',
    ...overrides,
  };
}

test('a saved current pointer loads back unchanged, in the same shape current.json has today', () => {
  const ctx = scratch();
  try {
    const workDir = path.join(ctx.cwd, 'work');
    const pointer = CurrentPointer.fromJSON(pointerData());
    pointer.save(workDir);
    assert.ok(CurrentPointer.exists(workDir));
    assert.deepStrictEqual(CurrentPointer.load(workDir).toJSON(), pointerData());
    assert.strictEqual(CurrentPointer.load(workDir).jobId(), 'j1');
  } finally {
    cleanup(ctx);
  }
});

test('a current pointer with an active workflow keeps it', () => {
  const workflow = {
    name: 'xoch-discovery', stage: 'investigating', pending_action: 'continue_discovery', artifact: null, return_command: 'xoch-open', started_at: null, updated_at: 'x',
  };
  assert.deepStrictEqual(CurrentPointer.fromJSON(pointerData({ workflow })).toJSON().workflow, workflow);
});

test('a current pointer with the wrong version, no job id, or no job directory is refused', () => {
  assert.throws(() => CurrentPointer.fromJSON(pointerData({ version: 2 })), /version/);
  assert.throws(() => CurrentPointer.fromJSON(pointerData({ job: { directory: 'd' } })), /job/);
  assert.throws(() => CurrentPointer.fromJSON(pointerData({ job: { id: 'j1' } })), /job/);
  assert.throws(() => CurrentPointer.fromJSON(pointerData({ job: null })), /job/);
  assert.throws(() => CurrentPointer.fromJSON(null), /object/);
});

test('a current pointer whose workflow is missing a required field is refused with the fields named', () => {
  const workflow = { name: 'x', stage: 'y' };
  assert.throws(() => CurrentPointer.fromJSON(pointerData({ workflow })), /pending_action, return_command/);
});

test('a current pointer can check that its job directory belongs to a given storage root', () => {
  const pointer = CurrentPointer.fromJSON(pointerData());
  assert.doesNotThrow(() => pointer.assertRoot('.xoch'));
  assert.throws(() => pointer.assertRoot('/elsewhere'), /directory/);
  const trailing = CurrentPointer.fromJSON(pointerData({ job: { id: 'j1', directory: '.xoch/work/jobs/j1/' } }));
  assert.doesNotThrow(() => trailing.assertRoot('.xoch'));
});

test('loading a current pointer that is not valid JSON is refused', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'current.json'), '{');
    assert.throws(() => CurrentPointer.load(ctx.cwd), /Invalid JSON/);
  } finally {
    cleanup(ctx);
  }
});

run();
