'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'config.js');

function configPath(ctx) {
  return path.join(ctx.home, '.xoch', 'config.json');
}

function runWithStdin(args, ctx, input) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ctx.cwd,
    env: { ...process.env, HOME: ctx.home },
    input: input === null ? Buffer.alloc(0) : input,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('-h prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['-h'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown command prints usage and exits 1', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('show prints the resolved config with defaults applied when no file exists', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['show'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.version, 1);
    assert.strictEqual(data.storage.mode, 'in-repo');
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('get requires a key argument', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('get storage.mode prints the default when unset', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'storage.mode'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'in-repo');
  } finally {
    cleanup(ctx);
  }
});

test('get rejects an unknown key', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'bogus.key'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown config key: bogus\.key/);
  } finally {
    cleanup(ctx);
  }
});

test('set requires both a key and a value', () => {
  const ctx = scratch();
  try {
    const missingValue = runScript(SCRIPT, ['set', 'storage.mode'], ctx);
    assert.strictEqual(missingValue.status, 1);
    assert.match(missingValue.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('set rejects an unknown key', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'bogus.key', 'value'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown config key: bogus\.key/);
  } finally {
    cleanup(ctx);
  }
});

test('set rejects an invalid storage.mode value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'storage.mode', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid storage\.mode value 'bogus'/);
  } finally {
    cleanup(ctx);
  }
});

test('set storage.mode writes the config and prints the migration warning', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'storage.mode', 'centralized'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /storage\.mode set to centralized/);
    assert.match(result.stdout, /does not migrate existing job\/arc data/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.storage.mode, 'centralized');

    const getResult = runScript(SCRIPT, ['get', 'storage.mode'], ctx);
    assert.strictEqual(getResult.stdout.trim(), 'centralized');
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode with no stdin input exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, null);
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 1 sets storage.mode to in-repo', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['set', 'storage.mode', 'centralized'], ctx);
    const result = runWithStdin([], ctx, '1\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /storage\.mode set to in-repo/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.storage.mode, 'in-repo');
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 2 sets storage.mode to centralized', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '2\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /storage\.mode set to centralized/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 3 leaves the mode unchanged', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Left unchanged\./);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('interactive empty selection leaves the mode unchanged', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Left unchanged\./);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection choosing the already-current mode reports no change', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '1\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Already in-repo; nothing changed\./);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('an invalid interactive selection exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '9\n');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid selection: 9/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode prints the current mode and prompt lines', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n');
    assert.match(result.stdout, /Current storage\.mode: in-repo/);
    assert.match(result.stdout, /Choose storage mode:/);
  } finally {
    cleanup(ctx);
  }
});

// process.stdin.isTTY is always false under a piped subprocess, so the
// "print the prompt" branch (only reached on a real TTY) is exercised
// in-process instead, with fs.readSync and process.stdin.isTTY patched
// for the duration of a single, non-exiting runInteractive() call.
test('a real TTY gets the inline selection prompt', () => {
  const ctx = scratch();
  const originalIsTTY = process.stdin.isTTY;
  const originalReadSync = fs.readSync;
  const originalHome = process.env.HOME;
  let wrote = '';
  const originalWrite = process.stdout.write;
  try {
    process.env.HOME = ctx.home;
    // config.js reads os.homedir() once, at require() time, into a
    // module-level CONFIG_PATH constant -- HOME must already point at the
    // scratch home before this first (and only, per test process) require.
    const config = require('../config.js');
    process.stdin.isTTY = true;
    const answer = Buffer.from('3\n', 'utf8');
    let offset = 0;
    fs.readSync = (fd, buf) => {
      if (fd !== 0) return originalReadSync.apply(fs, arguments);
      if (offset >= answer.length) return 0;
      buf[0] = answer[offset];
      offset += 1;
      return 1;
    };
    process.stdout.write = (chunk, ...rest) => {
      wrote += chunk;
      return true;
    };
    config.runInteractive();
  } finally {
    process.stdout.write = originalWrite;
    fs.readSync = originalReadSync;
    process.stdin.isTTY = originalIsTTY;
    process.env.HOME = originalHome;
    cleanup(ctx);
  }
  assert.match(wrote, /Selection \[1\/2\/3\]: /);
});

test('readLine retries after a transient EAGAIN from the stdin read', () => {
  const originalReadSync = fs.readSync;
  const config = require('../config.js');
  const answer = Buffer.from('x\n', 'utf8');
  let offset = 0;
  let threwOnce = false;
  try {
    fs.readSync = (fd, buf) => {
      if (fd !== 0) return originalReadSync.apply(fs, arguments);
      if (!threwOnce) {
        threwOnce = true;
        const err = new Error('resource temporarily unavailable');
        err.code = 'EAGAIN';
        throw err;
      }
      if (offset >= answer.length) return 0;
      buf[0] = answer[offset];
      offset += 1;
      return 1;
    };
    assert.strictEqual(config.readLine(), 'x');
    assert.strictEqual(threwOnce, true);
  } finally {
    fs.readSync = originalReadSync;
  }
});

test('readLine propagates a non-EAGAIN error from the stdin read', () => {
  const originalReadSync = fs.readSync;
  const config = require('../config.js');
  try {
    fs.readSync = (fd) => {
      if (fd !== 0) return originalReadSync.apply(fs, arguments);
      const err = new Error('I/O error');
      err.code = 'EIO';
      throw err;
    };
    assert.throws(() => config.readLine(), /I\/O error/);
  } finally {
    fs.readSync = originalReadSync;
  }
});

run();
