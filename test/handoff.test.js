'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import { Handoff } from '../bin/lib/handoff.js';
import { ShapeError } from '../bin/lib/shape.js';

const NOW = '2026-10-15T12:00:00Z';

test('a new handoff starts pending, unclaimed, with its source, topic, and body', () => {
  const h = Handoff.create({
    id: '2026-10-15-auth-bug', source: 'trace', topic: 'Auth bug', body: 'Findings', created: NOW,
  });
  assert.deepStrictEqual(h.toJSON(), {
    id: '2026-10-15-auth-bug', source: 'trace', topic: 'Auth bug', created: NOW, status: 'pending', claimed_by: null, claimed_at: null, body: 'Findings',
  });
  assert.strictEqual(h.isPending(), true);
});

test('claiming a handoff records the job and time, and it is no longer pending', () => {
  const h = Handoff.create({
    id: 'h1', source: 'qa', topic: 'T', body: 'B', created: NOW,
  });
  h.claim('job-1', '2026-10-16T09:00:00Z');
  assert.strictEqual(h.isPending(), false);
  assert.strictEqual(h.toJSON().status, 'claimed');
  assert.strictEqual(h.toJSON().claimed_by, 'job-1');
  assert.strictEqual(h.toJSON().claimed_at, '2026-10-16T09:00:00Z');
});

test('claiming an already-claimed handoff is refused, naming who claimed it', () => {
  const h = Handoff.create({
    id: 'h1', source: 'discovery', topic: 'T', body: 'B', created: NOW,
  });
  h.claim('job-1', NOW);
  assert.throws(() => h.claim('job-2', NOW), (err) => err instanceof ShapeError && /already claimed by job-1/.test(err.message));
});

test('a handoff with an unknown source, unknown status, missing field, or inconsistent claim is refused', () => {
  const base = {
    id: 'h1', source: 'trace', topic: 'T', created: NOW, status: 'pending', claimed_by: null, claimed_at: null, body: 'B',
  };
  assert.doesNotThrow(() => Handoff.fromJSON(base));
  assert.throws(() => Handoff.fromJSON({ ...base, source: 'sidebar' }), /source/);
  assert.throws(() => Handoff.fromJSON({ ...base, status: 'done' }), /status/);
  assert.throws(() => Handoff.fromJSON({ ...base, body: undefined }), /body/);
  assert.throws(() => Handoff.fromJSON({ ...base, topic: 3 }), /topic/);
  assert.throws(() => Handoff.fromJSON({ ...base, status: 'claimed' }), /claimed_by/);
  assert.throws(() => Handoff.fromJSON({ ...base, claimed_by: 'job-1' }), /claimed_by/);
  assert.throws(() => Handoff.fromJSON(null), ShapeError);
});

test('a saved handoff loads back unchanged, and loading a corrupt one is refused', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'handoffs');
    const h = Handoff.create({
      id: 'h1', source: 'trace', topic: 'T', body: 'B', created: NOW,
    });
    h.save(dir);
    assert.ok(Handoff.exists(dir, 'h1'));
    assert.ok(!Handoff.exists(dir, 'h2'));
    assert.deepStrictEqual(Handoff.load(dir, 'h1').toJSON(), h.toJSON());
    fs.writeFileSync(path.join(dir, 'h2.json'), '{');
    assert.throws(() => Handoff.load(dir, 'h2'), /Invalid JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('listing a handoffs folder returns every handoff oldest first, and an absent folder lists nothing', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'handoffs');
    assert.deepStrictEqual(Handoff.all(dir), []);
    Handoff.create({
      id: 'b', source: 'trace', topic: 'T', body: 'B', created: '2026-10-15T12:00:00Z',
    }).save(dir);
    Handoff.create({
      id: 'a', source: 'qa', topic: 'T', body: 'B', created: '2026-10-14T12:00:00Z',
    }).save(dir);
    fs.writeFileSync(path.join(dir, 'README.txt'), 'not a handoff');
    assert.deepStrictEqual(Handoff.all(dir).map((h) => h.toJSON().id), ['a', 'b']);
  } finally {
    cleanup(ctx);
  }
});

run();
