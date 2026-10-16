'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import { ArcState } from '../bin/lib/arc-state.js';

test('a new arc state starts with the same defaults arc open has always written', () => {
  const data = ArcState.create({ id: 'a1', title: 'Arc One', started: '2026-10-15' }).toJSON();
  assert.deepStrictEqual(data, {
    arc_id: 'a1',
    title: 'Arc One',
    purpose: 'Arc One',
    status: 'active',
    documentation_targets: [{ scope: 'unknown', path: 'unknown' }],
    success_outcome: 'TBD',
    risks: [],
    unresolved_questions: [],
    started: '2026-10-15',
    last_updated: '2026-10-15',
    next_command: 'xoch-open',
  });
});

test('a new arc state takes its purpose, success outcome, and documentation target when given', () => {
  const data = ArcState.create({ id: 'a1', title: 'A', purpose: 'Why', success: 'Done', docScope: 'project', docPath: 'README.md' }).toJSON();
  assert.strictEqual(data.purpose, 'Why');
  assert.strictEqual(data.success_outcome, 'Done');
  assert.deepStrictEqual(data.documentation_targets, [{ scope: 'project', path: 'README.md' }]);
  assert.match(data.started, /^\d{4}-\d{2}-\d{2}$/);
});

test('a saved arc state loads back unchanged, keeping fields it does not know about', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'a1');
    const state = ArcState.create({ id: 'a1', title: 'A', started: '2026-10-15' });
    state.set('closed', '2026-10-20');
    state.save(dir);
    assert.ok(ArcState.exists(dir));
    assert.deepStrictEqual(ArcState.load(dir).toJSON(), state.toJSON());
    assert.strictEqual(ArcState.load(dir).get('closed'), '2026-10-20');
  } finally {
    cleanup(ctx);
  }
});

test('an arc state without an id or title, or with a wrongly typed field, is refused', () => {
  assert.throws(() => ArcState.fromJSON({ title: 'A' }), /arc_id/);
  assert.throws(() => ArcState.fromJSON({ arc_id: 'a1' }), /title/);
  assert.throws(() => ArcState.fromJSON({ arc_id: 'a1', title: 'A', risks: {} }), /risks/);
  const state = ArcState.create({ id: 'a1', title: 'A' });
  assert.throws(() => state.update({ status: 'closed', next_command: 5 }), /next_command/);
  assert.strictEqual(state.get('status'), 'active');
});

test('loading an arc state that is not valid JSON is refused', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'a1');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'state.json'), '[');
    assert.throws(() => ArcState.load(dir), /Invalid JSON/);
  } finally {
    cleanup(ctx);
  }
});

run();
