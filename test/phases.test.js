'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import { Phases } from '../bin/lib/phases.js';
import { ShapeError } from '../bin/lib/shape.js';

function sample() {
  return {
    current_phase: 1,
    phases: [
      { title: 'Build the thing', description: 'First', files: [{ path: 'a.js', note: 'new' }], acceptance_criteria: ['AC-001'] },
      { title: 'Phase 2: a title that looks like a heading', type: 'checkpoint', status: 'not_started' },
      { title: 'Wrap up', status: 'deferred' },
    ],
  };
}

test('a phases document fills in defaults for every phase field it does not have', () => {
  const phase = Phases.fromJSON(sample()).at(1);
  assert.strictEqual(phase.type, 'implementation');
  assert.strictEqual(phase.status, 'not_started');
  assert.strictEqual(phase.start_ref, null);
  assert.deepStrictEqual(phase.behavior_tests, []);
  assert.deepStrictEqual(phase.notes, []);
  assert.deepStrictEqual(phase.files, [{ path: 'a.js', note: 'new' }]);
});

test('phases are numbered by their position, whatever their titles say', () => {
  const phases = Phases.fromJSON(sample());
  assert.strictEqual(phases.count(), 3);
  assert.strictEqual(phases.at(2).title, 'Phase 2: a title that looks like a heading');
  assert.strictEqual(phases.at(3).title, 'Wrap up');
});

test('asking for a phase number outside the list is refused', () => {
  const phases = Phases.fromJSON(sample());
  assert.throws(() => phases.at(0), /phase 0/);
  assert.throws(() => phases.at(4), /phase 4/);
  assert.throws(() => phases.at('1'), /phase 1/);
});

test('the phase index lists every phase in order and matches the phases exactly', () => {
  const index = Phases.fromJSON(sample()).phaseIndex();
  assert.deepStrictEqual(index, [
    { phase: 1, title: 'Build the thing', status: 'not_started', type: 'implementation' },
    { phase: 2, title: 'Phase 2: a title that looks like a heading', status: 'not_started', type: 'checkpoint' },
    { phase: 3, title: 'Wrap up', status: 'deferred', type: 'implementation' },
  ]);
});

test('changing one phase status changes only that phase', () => {
  const phases = Phases.fromJSON(sample());
  phases.setStatus(2, 'complete');
  assert.deepStrictEqual(phases.phaseIndex().map((p) => p.status), ['not_started', 'complete', 'deferred']);
  assert.throws(() => phases.setStatus(2, 'done'), /status/);
  assert.throws(() => phases.setStatus(9, 'complete'), /phase 9/);
});

test('the current phase can be moved to any listed phase or cleared', () => {
  const phases = Phases.fromJSON(sample());
  phases.setCurrent(3);
  assert.strictEqual(phases.toJSON().current_phase, 3);
  phases.setCurrent(null);
  assert.strictEqual(phases.toJSON().current_phase, null);
  assert.throws(() => phases.setCurrent(4), /phase 4/);
});

test('a phases document with a bad shape is refused with the problem named', () => {
  assert.throws(() => Phases.fromJSON(null), ShapeError);
  assert.throws(() => Phases.fromJSON({ phases: 'x' }), /phases/);
  assert.throws(() => Phases.fromJSON({ phases: [{}] }), /phase 1.*title/);
  assert.throws(() => Phases.fromJSON({ phases: ['x'] }), /phase 1/);
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', type: 'research' }] }), /phase 1.*type/);
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', status: 'Complete' }] }), /phase 1.*status/);
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', files: ['a.js'] }] }), /phase 1.*files/);
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', notes: [3] }] }), /phase 1.*notes/);
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', start_ref: 3 }] }), /phase 1.*start_ref/);
  assert.throws(() => Phases.fromJSON({ current_phase: 2, phases: [{ title: 'A' }] }), /current_phase/);
});

test('an empty phases document is allowed and has an empty index', () => {
  const phases = Phases.fromJSON({});
  assert.strictEqual(phases.count(), 0);
  assert.deepStrictEqual(phases.phaseIndex(), []);
  assert.strictEqual(phases.toJSON().current_phase, null);
});

test('a saved phases document loads back unchanged', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'j1');
    const phases = Phases.fromJSON(sample());
    phases.save(dir);
    assert.ok(Phases.exists(dir));
    assert.deepStrictEqual(Phases.load(dir).toJSON(), phases.toJSON());
    fs.writeFileSync(path.join(dir, 'phases.json'), 'nope');
    assert.throws(() => Phases.load(dir), /Invalid JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('changing phases never alters a copy previously handed out', () => {
  const phases = Phases.fromJSON(sample());
  const snapshot = phases.toJSON();
  const phase = phases.at(1);
  phase.title = 'mutated';
  phases.setStatus(1, 'complete');
  assert.strictEqual(snapshot.phases[0].status, 'not_started');
  assert.strictEqual(phases.at(1).title, 'Build the thing');
});

test('a phase can carry a goal, and a QA phase its capability, owners, cases, and engineer instructions', () => {
  const phases = Phases.fromJSON({
    phases: [{
      title: 'Exercise checkout',
      goal: 'Confirm checkout rejects bad cards',
      required_capability: 'browser',
      allowed_owners: '[E]/[C] only',
      cases: [{ id: 'QA-1', target: '/checkout', action: 'submit', input: '4000 0000 0000 0002', expected: 'declined message', rationale: 'card decline path' }],
      engineer_instructions: ['Open the checkout page'],
    }],
  });
  const phase = phases.at(1);
  assert.strictEqual(phase.goal, 'Confirm checkout rejects bad cards');
  assert.strictEqual(phase.required_capability, 'browser');
  assert.strictEqual(phase.allowed_owners, '[E]/[C] only');
  assert.strictEqual(phase.cases[0].id, 'QA-1');
  assert.deepStrictEqual(phase.engineer_instructions, ['Open the checkout page']);
});

test('a phase without a goal or QA details gets empty defaults for them', () => {
  const phase = Phases.fromJSON({ phases: [{ title: 'A' }] }).at(1);
  assert.strictEqual(phase.goal, null);
  assert.strictEqual(phase.required_capability, null);
  assert.strictEqual(phase.allowed_owners, null);
  assert.deepStrictEqual(phase.cases, []);
  assert.deepStrictEqual(phase.engineer_instructions, []);
});

test('QA cases must each have an id and only text values', () => {
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', cases: [{ target: 'x' }] }] }), /phase 1.*cases/);
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', cases: [{ id: 'Q1', expected: 3 }] }] }), /phase 1.*cases/);
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', cases: 'Q1' }] }), /phase 1.*cases/);
  assert.throws(() => Phases.fromJSON({ phases: [{ title: 'A', goal: 5 }] }), /phase 1.*goal/);
});

test('a phases document can carry notes that belong to no single phase', () => {
  assert.deepStrictEqual(Phases.fromJSON({ notes: ['Shared definitions'], phases: [] }).toJSON().notes, ['Shared definitions']);
  assert.deepStrictEqual(Phases.fromJSON({}).toJSON().notes, []);
  assert.throws(() => Phases.fromJSON({ notes: 'x' }), /notes/);
});

test('a phase can record where it started, and only for a listed phase', () => {
  const phases = Phases.fromJSON(sample());
  phases.setStartRef(2, 'abc123');
  assert.strictEqual(phases.at(2).start_ref, 'abc123');
  assert.strictEqual(phases.at(1).start_ref, null);
  phases.setStartRef(2, null);
  assert.strictEqual(phases.at(2).start_ref, null);
  assert.throws(() => phases.setStartRef(9, 'x'), /phase 9/);
  assert.throws(() => phases.setStartRef(1, 5), /start_ref/);
});

run();
