'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import {
  storageMode, storageRoot, xochRoot, jobPathFor,
} from '../bin/lib/storage-root.js';

// The resolver reads ~/.xoch/config.json at call time, so each test points
// HOME at a scratch home for its duration.
function withHome(ctx, config, fn) {
  const original = process.env.HOME;
  process.env.HOME = ctx.home;
  try {
    if (config !== undefined) {
      fs.mkdirSync(path.join(ctx.home, '.xoch'), { recursive: true });
      fs.writeFileSync(path.join(ctx.home, '.xoch', 'config.json'), typeof config === 'string' ? config : JSON.stringify(config));
    }
    fn();
  } finally {
    process.env.HOME = original;
  }
}

test('storage is centralized when nothing is configured, or the configured mode is invalid', () => {
  const ctx = scratch();
  try {
    withHome(ctx, undefined, () => assert.strictEqual(storageMode(), 'centralized'));
    withHome(ctx, { storage: { mode: 'bogus' } }, () => assert.strictEqual(storageMode(), 'centralized'));
    withHome(ctx, '{not json', () => assert.strictEqual(storageMode(), 'centralized'));
    withHome(ctx, { storage: { mode: 'in-repo' } }, () => assert.strictEqual(storageMode(), 'in-repo'));
  } finally {
    cleanup(ctx);
  }
});

test('a project\'s storage root is under ~/.xoch/projects/<slug> when centralized, and <project>/.xoch when in-repo', () => {
  const ctx = scratch();
  try {
    const project = path.join(ctx.cwd, 'My App');
    withHome(ctx, undefined, () => {
      assert.strictEqual(storageRoot(project), path.join(ctx.home, '.xoch', 'projects', 'my-app'));
    });
    withHome(ctx, { storage: { mode: 'in-repo' } }, () => {
      assert.strictEqual(storageRoot(project), path.join(project, '.xoch'));
    });
  } finally {
    cleanup(ctx);
  }
});

test('the storage root defaults to the current directory\'s project', () => {
  const ctx = scratch();
  const originalCwd = process.cwd();
  try {
    process.chdir(ctx.cwd);
    withHome(ctx, { storage: { mode: 'in-repo' } }, () => {
      assert.strictEqual(storageRoot(), path.join(process.cwd(), '.xoch'));
    });
  } finally {
    process.chdir(originalCwd);
    cleanup(ctx);
  }
});

test('xochRoot keeps the relative .xoch form for in-repo storage and the absolute path when centralized', () => {
  const ctx = scratch();
  const originalCwd = process.cwd();
  try {
    process.chdir(ctx.cwd);
    withHome(ctx, { storage: { mode: 'in-repo' } }, () => assert.strictEqual(xochRoot(), '.xoch'));
    withHome(ctx, { storage: { mode: 'centralized' } }, () => {
      assert.strictEqual(xochRoot(), path.join(ctx.home, '.xoch', 'projects', path.basename(ctx.cwd)));
    });
  } finally {
    process.chdir(originalCwd);
    cleanup(ctx);
  }
});

test('a project\'s job path is .xoch/work/jobs/<id> in-repo, and the absolute centralized path otherwise', () => {
  const ctx = scratch();
  try {
    const project = path.join(ctx.cwd, 'api');
    withHome(ctx, { storage: { mode: 'in-repo' } }, () => {
      assert.strictEqual(jobPathFor(project, 'j1'), path.join('.xoch', 'work', 'jobs', 'j1'));
    });
    withHome(ctx, {}, () => {
      assert.strictEqual(jobPathFor(project, 'j1'), path.join(ctx.home, '.xoch', 'projects', 'api', 'work', 'jobs', 'j1'));
    });
  } finally {
    cleanup(ctx);
  }
});

run();
