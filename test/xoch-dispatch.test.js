'use strict';

const assert = require('assert');
const path = require('path');
const { test, run: runTests } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'xoch.js');
const XOCH_ACTIONS = path.join(__dirname, '..', 'bin', 'xoch-actions.js');
const CONFIG_SCRIPT = path.join(__dirname, '..', 'config.js');
const GENERATE_ID_SCRIPT = path.join(__dirname, '..', 'bin', 'generate-job-id.js');
const ARCHIVE_SCRIPT = path.join(__dirname, '..', 'bin', 'archive-actions.js');
const GIT_STATE_SCRIPT = path.join(__dirname, '..', 'bin', 'git-state.js');
const pkg = require('../package.json');

function run(args, ctx, input) {
  return runScript(SCRIPT, args, ctx, input);
}

test('xoch --version prints the installed package version', () => {
  const ctx = scratch();
  try {
    const result = run(['--version'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), pkg.version);
  } finally {
    cleanup(ctx);
  }
});

test('xoch with no arguments prints usage and exits 1', () => {
  const ctx = scratch();
  try {
    const result = run([], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('xoch -h prints usage and exits 0', () => {
  const ctx = scratch();
  try {
    const result = run(['-h'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('xoch --help prints usage and exits 0', () => {
  const ctx = scratch();
  try {
    const result = run(['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown top-level command errors clearly and exits 1', () => {
  const ctx = scratch();
  try {
    const result = run(['bogus-command'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown command: bogus-command/);
  } finally {
    cleanup(ctx);
  }
});

test('xoch job current --json produces the same output as invoking xoch-actions.js directly', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['job', 'current', '--json'], ctx);
    const direct = runScript(XOCH_ACTIONS, ['job', 'current', '--json'], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
  } finally {
    cleanup(ctx);
  }
});

test('an xoch-actions.js group with a missing action produces the same error as invoking it directly', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['job'], ctx);
    const direct = runScript(XOCH_ACTIONS, ['job'], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stderr, direct.stderr);
  } finally {
    cleanup(ctx);
  }
});

test('xoch config root produces the same output as xoch-actions.js config:root', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['config', 'root'], ctx);
    const direct = runScript(XOCH_ACTIONS, ['config', 'root'], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
  } finally {
    cleanup(ctx);
  }
});

test('xoch config show produces the same output as config.js show', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['config', 'show'], ctx);
    const direct = runScript(CONFIG_SCRIPT, ['show'], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
  } finally {
    cleanup(ctx);
  }
});

test('xoch config get storage.mode produces the same output as config.js get storage.mode', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['config', 'get', 'storage.mode'], ctx);
    const direct = runScript(CONFIG_SCRIPT, ['get', 'storage.mode'], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
  } finally {
    cleanup(ctx);
  }
});

test('xoch config set documentation.commentMode follow-convention produces the same output as config.js set', () => {
  const ctxA = scratch();
  const ctxB = scratch();
  try {
    const viaDispatcher = run(['config', 'set', 'documentation.commentMode', 'follow-convention'], ctxA);
    const direct = runScript(CONFIG_SCRIPT, ['set', 'documentation.commentMode', 'follow-convention'], ctxB);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
  } finally {
    cleanup(ctxA);
    cleanup(ctxB);
  }
});

test('xoch config bogus-key produces the same error as config.js bogus-key', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['config', 'bogus-key'], ctx);
    const direct = runScript(CONFIG_SCRIPT, ['bogus-key'], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
  } finally {
    cleanup(ctx);
  }
});

test('xoch generate-id --id "My Job" produces the same output as generate-job-id.js --id "My Job"', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['generate-id', '--id', 'My Job'], ctx);
    const direct = runScript(GENERATE_ID_SCRIPT, ['--id', 'My Job'], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
  } finally {
    cleanup(ctx);
  }
});

test('xoch archive with no arguments produces the same output as archive-actions.js with no arguments', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['archive'], ctx);
    const direct = runScript(ARCHIVE_SCRIPT, [], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
    assert.strictEqual(viaDispatcher.stderr, direct.stderr);
  } finally {
    cleanup(ctx);
  }
});

test('xoch git-state with no arguments produces the same output as git-state.js with no arguments', () => {
  const ctx = scratch();
  try {
    const viaDispatcher = run(['git-state'], ctx);
    const direct = runScript(GIT_STATE_SCRIPT, [], ctx);
    assert.strictEqual(viaDispatcher.status, direct.status);
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
    assert.strictEqual(viaDispatcher.stderr, direct.stderr);
  } finally {
    cleanup(ctx);
  }
});

test('every xoch-actions.js group namespace reaches xoch-actions.js without a dispatcher wiring error', () => {
  const groups = ['job', 'state', 'arc', 'pointer', 'workflow', 'snapshot', 'phase', 'file'];
  for (const group of groups) {
    const ctx = scratch();
    try {
      const result = run([group], ctx);
      assert.notStrictEqual(result.status, null, `${group}: process was killed by a signal`);
      assert.ok(!/Cannot find module|is not a function/.test(result.stderr), `${group}: ${result.stderr}`);
    } finally {
      cleanup(ctx);
    }
  }
});

test('every standalone-script namespace reaches its module without a dispatcher wiring error', () => {
  const namespaces = [
    'init', 'remove', 'verify', 'archive', 'generate-id', 'docs-drift', 'docs-target', 'git-state', 'gitignore',
    'coverage', 'context-sync', 'dependency', 'readme', 'project-scope',
    'project-commands', 'token-estimator', 'help', 'workspace',
  ];
  for (const namespace of namespaces) {
    const ctx = scratch();
    try {
      const result = run([namespace], ctx);
      assert.notStrictEqual(result.status, null, `${namespace}: process was killed by a signal`);
      assert.ok(!/Cannot find module|is not a function/.test(result.stderr), `${namespace}: ${result.stderr}`);
    } finally {
      cleanup(ctx);
    }
  }
});

runTests();
