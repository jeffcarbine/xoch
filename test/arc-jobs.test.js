'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import { ArcJobs } from '../bin/lib/arc-jobs.js';

test('a new arc membership has four empty sections', () => {
  assert.deepStrictEqual(ArcJobs.create().toJSON(), { active: [], planned: [], complete: [], parked: [] });
});

test('a new arc membership can start with one active job', () => {
  const jobs = ArcJobs.create({ active: { id: 'j1', title: 'Job One' } });
  assert.deepStrictEqual(jobs.toJSON().active, [{ id: 'j1', title: 'Job One' }]);
});

test('moving a job puts it in the target section and removes it from wherever it was', () => {
  const jobs = ArcJobs.create({ active: { id: 'j1', title: 'Job One' } });
  jobs.move('j1', 'complete');
  assert.deepStrictEqual(jobs.toJSON().active, []);
  assert.deepStrictEqual(jobs.toJSON().complete, [{ id: 'j1', title: 'Job One' }]);
  assert.strictEqual(jobs.sectionOf('j1'), 'complete');
  assert.strictEqual(jobs.sectionOf('nobody'), null);
});

test('moving a job the arc does not list yet adds it, with no title unless one is given', () => {
  const jobs = ArcJobs.create();
  jobs.move('j2', 'planned');
  jobs.move('j3', 'planned', { title: 'Three' });
  assert.deepStrictEqual(jobs.toJSON().planned, [{ id: 'j2', title: null }, { id: 'j3', title: 'Three' }]);
});

test('a given title replaces the old one; otherwise the old title and any extra details carry over', () => {
  const jobs = ArcJobs.fromJSON({ planned: [{ id: 'j1', title: 'Old', notes: ['blocked on x'] }] });
  jobs.move('j1', 'active');
  assert.deepStrictEqual(jobs.toJSON().active, [{ id: 'j1', title: 'Old', notes: ['blocked on x'] }]);
  jobs.move('j1', 'complete', { title: 'New' });
  assert.deepStrictEqual(jobs.toJSON().complete, [{ id: 'j1', title: 'New', notes: ['blocked on x'] }]);
});

test('moving a job from a placeholder entry replaces the placeholder instead of duplicating it', () => {
  const jobs = ArcJobs.fromJSON({ planned: [{ id: 'placeholder', title: 'Planned work' }] });
  jobs.move('real-id', 'active', { from: 'placeholder' });
  assert.deepStrictEqual(jobs.toJSON(), {
    active: [{ id: 'real-id', title: 'Planned work' }],
    planned: [],
    complete: [],
    parked: [],
  });
});

test('moving a job to a section that does not exist is refused', () => {
  const jobs = ArcJobs.create();
  assert.throws(() => jobs.move('j1', 'archived'), /active, planned, complete, parked/);
});

test('an arc membership with a bad shape is refused with the problem named', () => {
  assert.throws(() => ArcJobs.fromJSON(null), /object/);
  assert.throws(() => ArcJobs.fromJSON({ active: 'j1' }), /active/);
  assert.throws(() => ArcJobs.fromJSON({ planned: [{ title: 'no id' }] }), /planned.*id/);
  assert.throws(() => ArcJobs.fromJSON({ planned: ['j1'] }), /planned/);
  assert.throws(() => ArcJobs.fromJSON({ parked: [{ id: 'j1', title: 4 }] }), /parked.*title/);
  assert.throws(() => ArcJobs.fromJSON({ active: [{ id: 'j1' }], complete: [{ id: 'j1' }] }), /j1.*more than once/);
});

test('a saved arc membership loads back unchanged', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'a1');
    const jobs = ArcJobs.create({ active: { id: 'j1', title: 'One' } });
    jobs.save(dir);
    assert.ok(fs.existsSync(path.join(dir, 'jobs.json')));
    assert.ok(ArcJobs.exists(dir));
    assert.deepStrictEqual(ArcJobs.load(dir).toJSON(), jobs.toJSON());
  } finally {
    cleanup(ctx);
  }
});

test('when a job and its placeholder are both listed, the job\'s own entry wins over the placeholder\'s', () => {
  const jobs = ArcJobs.fromJSON({ active: [{ id: 'real', title: 'Real title' }], planned: [{ id: 'ph', title: 'Placeholder title' }] });
  jobs.move('real', 'complete', { from: 'ph' });
  assert.deepStrictEqual(jobs.toJSON().complete, [{ id: 'real', title: 'Real title' }]);
  const reversed = ArcJobs.fromJSON({ planned: [{ id: 'ph', title: 'Placeholder title' }], parked: [{ id: 'real', title: 'Real title' }] });
  reversed.move('real', 'complete', { from: 'ph' });
  assert.deepStrictEqual(reversed.toJSON().complete, [{ id: 'real', title: 'Real title' }]);
});

run();
