'use strict';

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { test, run } from './lib/runner.js';
import { isMainModule } from '../bin/lib/is-main.js';

// Same documented coverage exception as bin/lib/is-main.js's own comment:
// the tests below fully cover isMainModule() on this real file, but not
// on the copy at test/init.test.js's .init-test-scratch/bin/lib/is-main.js
// -- that copy is only ever invoked as a genuine, valid, matching CLI
// entry point, so these defensive branches don't apply there.

test('isMainModule returns false when process.argv[1] is empty', () => {
  const original = process.argv[1];
  try {
    process.argv[1] = '';
    assert.strictEqual(isMainModule('file:///anything'), false);
  } finally {
    process.argv[1] = original;
  }
});

test('isMainModule returns true when the given URL matches the resolved invoking path', () => {
  const original = process.argv[1];
  const realFile = path.join(os.tmpdir(), `xoch-is-main-test-${process.pid}.js`);
  fs.writeFileSync(realFile, '// noop\n');
  try {
    process.argv[1] = realFile;
    assert.strictEqual(isMainModule(pathToFileURL(fs.realpathSync(realFile)).href), true);
  } finally {
    process.argv[1] = original;
    fs.rmSync(realFile, { force: true });
  }
});

test('isMainModule returns false when the given URL does not match the invoking path', () => {
  const original = process.argv[1];
  const realFile = path.join(os.tmpdir(), `xoch-is-main-test-${process.pid}.js`);
  fs.writeFileSync(realFile, '// noop\n');
  try {
    process.argv[1] = realFile;
    assert.strictEqual(isMainModule('file:///definitely/not/the/same/path.js'), false);
  } finally {
    process.argv[1] = original;
    fs.rmSync(realFile, { force: true });
  }
});

// Closes is-main.js's catch branch: `node -e script arg` sets process.argv[1]
// to that trailing argument verbatim, with no existence check of its own --
// unlike a normal `node <path>` invocation, which fails before any user code
// runs if the path doesn't exist. That gives a real, deterministic way to
// put a genuinely nonexistent path in process.argv[1] and observe
// fs.realpathSync throw, without relying on a delete-between-list-and-stat
// race.
test('isMainModule returns false (not throwing) when process.argv[1] cannot be resolved on disk', () => {
  const original = process.argv[1];
  try {
    process.argv[1] = path.join(os.tmpdir(), 'xoch-is-main-definitely-does-not-exist', 'nested', 'x.js');
    assert.strictEqual(isMainModule('file:///anything'), false);
  } finally {
    process.argv[1] = original;
  }
});

run();
