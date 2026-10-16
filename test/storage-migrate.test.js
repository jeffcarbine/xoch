'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import {
  findRepos, planMigration, executeMigration, describePlan,
} from '../bin/storage-migrate.js';

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// A repo under <home>/dev/<name> with in-repo Xoch data.
function repoWithXoch(ctx, name, extra = {}) {
  const repo = path.join(ctx.home, 'dev', name);
  write(path.join(repo, '.xoch', 'work', 'jobs', 'j1', 'state.json'), '{}');
  write(path.join(repo, '.xoch', 'docs', 'drift-baseline.json'), '{}');
  for (const [rel, text] of Object.entries(extra)) write(path.join(repo, '.xoch', rel), text);
  return repo;
}

function centralDir(ctx, slug) {
  return path.join(ctx.home, '.xoch', 'projects', slug);
}

test('repos are found from the workspace map and from a scanned folder, each once', () => {
  const ctx = scratch();
  try {
    const a = repoWithXoch(ctx, 'alpha');
    const b = repoWithXoch(ctx, 'beta');
    fs.mkdirSync(path.join(ctx.home, 'dev', 'no-xoch'), { recursive: true });
    write(path.join(ctx.home, '.xoch', 'workspace-map.json'), JSON.stringify({ projects: { alpha: { path: a }, gone: { path: path.join(ctx.home, 'missing') } } }));
    assert.deepStrictEqual(findRepos({ home: ctx.home }), [a]);
    assert.deepStrictEqual(findRepos({ home: ctx.home, scanDir: path.join(ctx.home, 'dev') }), [a, b]);
  } finally {
    cleanup(ctx);
  }
});

test('repos are also found from centralized roots that record where they came from', () => {
  const ctx = scratch();
  try {
    const repo = path.join(ctx.home, 'dev', 'gamma');
    fs.mkdirSync(repo, { recursive: true });
    write(path.join(centralDir(ctx, 'gamma'), 'repo.json'), JSON.stringify({ path: repo }));
    write(path.join(centralDir(ctx, 'orphan'), 'work', 'x'), '');
    assert.deepStrictEqual(findRepos({ home: ctx.home }), [repo]);
  } finally {
    cleanup(ctx);
  }
});

test('moving to centralized plans every .xoch entry except legacy context, and counts git-tracked files', () => {
  const ctx = scratch();
  try {
    const repo = repoWithXoch(ctx, 'alpha', { 'context/current.md': 'legacy', 'handoffs/h.json': '{}' });
    spawnSync('git', ['-C', repo, 'init', '-q']);
    spawnSync('git', ['-C', repo, 'add', '.xoch/docs']);
    const plan = planMigration({ to: 'centralized', home: ctx.home, repos: [repo] });
    assert.deepStrictEqual(plan.refusals, []);
    assert.deepStrictEqual(plan.moves, [{
      repo, from: path.join(repo, '.xoch'), to: centralDir(ctx, 'alpha'), entries: ['docs', 'handoffs', 'work'], tracked: 1,
    }]);
    const text = describePlan(plan, 'centralized').join('\n');
    assert.match(text, /alpha: docs, handoffs, work -> .*projects\/alpha/);
    assert.match(text, /1 git-tracked file in 1 repo will show as deleted; commit that removal/);
  } finally {
    cleanup(ctx);
  }
});

test('a repo with nothing to move, or only legacy context, is skipped', () => {
  const ctx = scratch();
  try {
    const empty = path.join(ctx.home, 'dev', 'empty');
    fs.mkdirSync(empty, { recursive: true });
    const legacy = path.join(ctx.home, 'dev', 'legacy');
    write(path.join(legacy, '.xoch', 'context', 'current.md'), 'x');
    const plan = planMigration({ to: 'centralized', home: ctx.home, repos: [empty, legacy] });
    assert.deepStrictEqual(plan, { moves: [], refusals: [] });
    assert.deepStrictEqual(describePlan(plan, 'centralized'), ['Nothing to move.']);
  } finally {
    cleanup(ctx);
  }
});

test('moving to centralized refuses a destination that already holds data, or two repos with the same slug', () => {
  const ctx = scratch();
  try {
    const a = repoWithXoch(ctx, 'alpha');
    write(path.join(centralDir(ctx, 'alpha'), 'work', 'other'), '');
    const b1 = repoWithXoch(ctx, 'api');
    const b2 = path.join(ctx.home, 'clients', 'api');
    write(path.join(b2, '.xoch', 'work', 'x'), '');
    const plan = planMigration({ to: 'centralized', home: ctx.home, repos: [a, b1, b2] });
    assert.strictEqual(plan.refusals.length, 2);
    assert.match(plan.refusals[0], /alpha: .*projects\/alpha already holds Xoch data/);
    assert.match(plan.refusals[1], /repos .*dev\/api and .*clients\/api would both move to .*projects\/api/);
    assert.match(describePlan(plan, 'centralized').join('\n'), /Refused/);
  } finally {
    cleanup(ctx);
  }
});

test('a centralized root that already belongs to the same repo, holding only repo.json, is not a collision', () => {
  const ctx = scratch();
  try {
    const a = repoWithXoch(ctx, 'alpha');
    write(path.join(centralDir(ctx, 'alpha'), 'repo.json'), JSON.stringify({ path: a }));
    assert.deepStrictEqual(planMigration({ to: 'centralized', home: ctx.home, repos: [a] }).refusals, []);
  } finally {
    cleanup(ctx);
  }
});

test('executing a move to centralized moves the entries, records the repo, and leaves legacy context behind', () => {
  const ctx = scratch();
  try {
    const repo = repoWithXoch(ctx, 'alpha', { 'context/current.md': 'legacy' });
    const plan = planMigration({ to: 'centralized', home: ctx.home, repos: [repo] });
    executeMigration(plan);
    const central = centralDir(ctx, 'alpha');
    assert.ok(fs.existsSync(path.join(central, 'work', 'jobs', 'j1', 'state.json')));
    assert.ok(fs.existsSync(path.join(central, 'docs', 'drift-baseline.json')));
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(central, 'repo.json'), 'utf8')), { path: repo });
    assert.deepStrictEqual(fs.readdirSync(path.join(repo, '.xoch')), ['context']);
  } finally {
    cleanup(ctx);
  }
});

test('executing a move removes a repo\'s .xoch folder once nothing is left in it', () => {
  const ctx = scratch();
  try {
    const repo = repoWithXoch(ctx, 'alpha');
    executeMigration(planMigration({ to: 'centralized', home: ctx.home, repos: [repo] }));
    assert.ok(!fs.existsSync(path.join(repo, '.xoch')));
  } finally {
    cleanup(ctx);
  }
});

test('moving back to in-repo returns each centralized root to the repo it records, and removes the root', () => {
  const ctx = scratch();
  try {
    const repo = repoWithXoch(ctx, 'alpha');
    executeMigration(planMigration({ to: 'centralized', home: ctx.home, repos: [repo] }));
    const plan = planMigration({ to: 'in-repo', home: ctx.home, repos: findRepos({ home: ctx.home }) });
    assert.deepStrictEqual(plan.refusals, []);
    assert.deepStrictEqual(plan.moves.map((m) => m.entries), [['docs', 'work']]);
    assert.match(describePlan(plan, 'in-repo').join('\n'), /alpha: docs, work -> .*dev\/alpha\/\.xoch/);
    executeMigration(plan);
    assert.ok(fs.existsSync(path.join(repo, '.xoch', 'work', 'jobs', 'j1', 'state.json')));
    assert.ok(!fs.existsSync(centralDir(ctx, 'alpha')));
  } finally {
    cleanup(ctx);
  }
});

test('moving to in-repo refuses a centralized root with no recorded repo, a missing repo, or an existing destination', () => {
  const ctx = scratch();
  try {
    write(path.join(centralDir(ctx, 'orphan'), 'work', 'x'), '');
    write(path.join(centralDir(ctx, 'ghost'), 'repo.json'), JSON.stringify({ path: path.join(ctx.home, 'nowhere') }));
    write(path.join(centralDir(ctx, 'ghost'), 'work', 'x'), '');
    const repo = path.join(ctx.home, 'dev', 'busy');
    write(path.join(repo, '.xoch', 'work', 'mine'), '');
    write(path.join(centralDir(ctx, 'busy'), 'repo.json'), JSON.stringify({ path: repo }));
    write(path.join(centralDir(ctx, 'busy'), 'work', 'theirs'), '');
    const plan = planMigration({ to: 'in-repo', home: ctx.home, repos: [] });
    assert.deepStrictEqual(plan.moves, []);
    assert.strictEqual(plan.refusals.length, 3);
    assert.match(plan.refusals.join('\n'), /busy: .*dev\/busy\/\.xoch\/work already exists/);
    assert.match(plan.refusals.join('\n'), /ghost: recorded repo .*nowhere no longer exists/);
    assert.match(plan.refusals.join('\n'), /orphan: no repo\.json, so its repo is unknown/);
  } finally {
    cleanup(ctx);
  }
});

test('a centralized root with only repo.json has nothing to move back, and no projects folder means no work', () => {
  const ctx = scratch();
  try {
    assert.deepStrictEqual(planMigration({ to: 'in-repo', home: ctx.home, repos: [] }), { moves: [], refusals: [] });
    const repo = path.join(ctx.home, 'dev', 'alpha');
    fs.mkdirSync(repo, { recursive: true });
    write(path.join(centralDir(ctx, 'alpha'), 'repo.json'), JSON.stringify({ path: repo }));
    assert.deepStrictEqual(planMigration({ to: 'in-repo', home: ctx.home, repos: [] }).moves, []);
  } finally {
    cleanup(ctx);
  }
});

test('if a move fails partway, every move already made is undone and the error is raised', () => {
  const ctx = scratch();
  try {
    const a = repoWithXoch(ctx, 'alpha');
    const b = repoWithXoch(ctx, 'beta');
    const plan = planMigration({ to: 'centralized', home: ctx.home, repos: [a, b] });
    let calls = 0;
    const flaky = (from, to) => {
      calls += 1;
      if (calls === 3) throw new Error('disk full');
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
    };
    assert.throws(() => executeMigration(plan, { move: flaky }), /disk full/);
    assert.ok(fs.existsSync(path.join(a, '.xoch', 'work', 'jobs', 'j1', 'state.json')));
    assert.ok(fs.existsSync(path.join(a, '.xoch', 'docs', 'drift-baseline.json')));
    assert.ok(fs.existsSync(path.join(b, '.xoch', 'work')));
    assert.ok(!fs.existsSync(path.join(centralDir(ctx, 'alpha'), 'docs')));
    assert.ok(!fs.existsSync(path.join(centralDir(ctx, 'alpha'), 'repo.json')));
  } finally {
    cleanup(ctx);
  }
});

test('the default mover falls back to copy-and-delete across filesystems', () => {
  const ctx = scratch();
  try {
    const repo = repoWithXoch(ctx, 'alpha');
    const plan = planMigration({ to: 'centralized', home: ctx.home, repos: [repo] });
    const realRename = fs.renameSync;
    fs.renameSync = () => {
      const err = new Error('cross-device');
      err.code = 'EXDEV';
      throw err;
    };
    try {
      executeMigration(plan);
    } finally {
      fs.renameSync = realRename;
    }
    assert.ok(fs.existsSync(path.join(centralDir(ctx, 'alpha'), 'work', 'jobs', 'j1', 'state.json')));
    assert.ok(!fs.existsSync(path.join(repo, '.xoch')));
  } finally {
    cleanup(ctx);
  }
});

test('the default mover passes on any other rename error', () => {
  const ctx = scratch();
  try {
    const repo = repoWithXoch(ctx, 'alpha');
    const plan = planMigration({ to: 'centralized', home: ctx.home, repos: [repo] });
    const realRename = fs.renameSync;
    let failed = false;
    fs.renameSync = (...args) => {
      if (!failed) {
        failed = true;
        const err = new Error('permission denied');
        err.code = 'EACCES';
        throw err;
      }
      return realRename(...args);
    };
    try {
      assert.throws(() => executeMigration(plan), /permission denied/);
    } finally {
      fs.renameSync = realRename;
    }
    assert.ok(fs.existsSync(path.join(repo, '.xoch', 'work')));
  } finally {
    cleanup(ctx);
  }
});

run();
