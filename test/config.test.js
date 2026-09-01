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
    assert.strictEqual(data.documentation.commentMode, 'always');
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('get documentation.commentMode prints the default when unset', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'documentation.commentMode'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'always');
  } finally {
    cleanup(ctx);
  }
});

test('set rejects an invalid documentation.commentMode value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'documentation.commentMode', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid documentation\.commentMode value 'bogus'/);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('set documentation.commentMode writes the config and round-trips on read', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'documentation.commentMode', 'follow-convention'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /documentation\.commentMode set to follow-convention/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.documentation.commentMode, 'follow-convention');

    const getResult = runScript(SCRIPT, ['get', 'documentation.commentMode'], ctx);
    assert.strictEqual(getResult.stdout.trim(), 'follow-convention');
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

test('get tokenBudgets.spec prints the built-in default when unset', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'tokenBudgets.spec'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), '5000');
  } finally {
    cleanup(ctx);
  }
});

test('get tokenBudgets.<unrecognized skill> falls back to the generic default', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'tokenBudgets.some-unknown-skill'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), '5000');
  } finally {
    cleanup(ctx);
  }
});

test('set tokenBudgets.spec writes the override and get reflects it', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'tokenBudgets.spec', '6000'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /tokenBudgets\.spec set to 6000/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.tokenBudgets.spec, 6000);

    const getResult = runScript(SCRIPT, ['get', 'tokenBudgets.spec'], ctx);
    assert.strictEqual(getResult.stdout.trim(), '6000');
  } finally {
    cleanup(ctx);
  }
});

test('set tokenBudgets.<skill> rejects a non-numeric value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'tokenBudgets.spec', 'abc'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid budget value 'abc'/);
  } finally {
    cleanup(ctx);
  }
});

test('set tokenBudgets.<skill> rejects zero', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'tokenBudgets.spec', '0'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid budget value '0'/);
  } finally {
    cleanup(ctx);
  }
});

test('set tokenBudgets.<skill> rejects a negative value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'tokenBudgets.spec', '-5'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid budget value '-5'/);
  } finally {
    cleanup(ctx);
  }
});

test('show includes the resolved token budgets', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['set', 'tokenBudgets.spec', '6000'], ctx);
    const result = runScript(SCRIPT, ['show'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.tokenBudgets.spec, 6000);
    assert.strictEqual(data.tokenBudgets.plan, 7000);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: setting one skill then a blank line finishes', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\n6000\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /spec: 5000/);
    assert.match(result.stdout, /tokenBudgets\.spec set to 6000/);
    assert.match(result.stdout, /Done\./);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.tokenBudgets.spec, 6000);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: an immediate blank line finishes without changes', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, '\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Done\./);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('budgets: no stdin input at all exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, null);
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: EOF after a skill name but before a value exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\n');
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: an invalid value for a skill exits 1 without writing', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\nabc\n');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid budget value 'abc'/);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('budgets: updating a skill twice in one session applies both edits', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\n6000\nplan\n8000\n\n');
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.tokenBudgets.spec, 6000);
    assert.strictEqual(data.tokenBudgets.plan, 8000);
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

test('budgets on a real TTY prints the inline skill/value prompts', () => {
  const ctx = scratch();
  const originalIsTTY = process.stdin.isTTY;
  const originalReadSync = fs.readSync;
  const originalHome = process.env.HOME;
  let wrote = '';
  const originalWrite = process.stdout.write;
  try {
    process.env.HOME = ctx.home;
    delete require.cache[require.resolve('../config.js')];
    const config = require('../config.js');
    process.stdin.isTTY = true;
    const answer = Buffer.from('spec\n6000\n\n', 'utf8');
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
    config.runBudgetsInteractive();
  } finally {
    process.stdout.write = originalWrite;
    fs.readSync = originalReadSync;
    process.stdin.isTTY = originalIsTTY;
    process.env.HOME = originalHome;
    cleanup(ctx);
  }
  assert.match(wrote, /Enter a skill name to update/);
  assert.match(wrote, /New budget for "spec" \(currently 5000\): /);
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
