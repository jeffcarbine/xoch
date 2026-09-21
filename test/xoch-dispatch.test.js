'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, run as runTests } from './lib/runner.js';
import { scratch, cleanup, runScript } from './lib/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRIPT = path.join(__dirname, '..', 'bin', 'xoch.js');
const XOCH_ACTIONS = path.join(__dirname, '..', 'bin', 'xoch-actions.js');
const CONFIG_SCRIPT = path.join(__dirname, '..', 'config.js');
const GENERATE_ID_SCRIPT = path.join(__dirname, '..', 'bin', 'generate-job-id.js');
const ARCHIVE_SCRIPT = path.join(__dirname, '..', 'bin', 'archive-actions.js');
const GIT_STATE_SCRIPT = path.join(__dirname, '..', 'bin', 'git-state.js');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

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

test('xoch discovery write produces the same output as invoking xoch-actions.js directly', () => {
  const ctxA = scratch();
  const ctxB = scratch();
  try {
    const viaDispatcher = run(['discovery', 'write', '--topic', 'Dispatch Check'], ctxA, 'content\n');
    const direct = runScript(XOCH_ACTIONS, ['discovery', 'write', '--topic', 'Dispatch Check'], ctxB, 'content\n');
    assert.strictEqual(viaDispatcher.status, direct.status);
    // xochRoot() in in-repo mode is relative ('.xoch'), so the printed
    // path never embeds either context's absolute cwd -- a plain
    // comparison is safe, unlike the config-set comparison above.
    assert.strictEqual(viaDispatcher.stdout, direct.stdout);
  } finally {
    cleanup(ctxA);
    cleanup(ctxB);
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
    // The set now triggers a real reinstall, whose output embeds each
    // context's own (randomly named) scratch $HOME path -- normalize that
    // one difference away before comparing, since it isn't a behavioral
    // difference between the dispatcher and a direct invocation.
    assert.strictEqual(
      viaDispatcher.stdout.split(ctxA.home).join('<HOME>'),
      direct.stdout.split(ctxB.home).join('<HOME>')
    );
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

// ---------------------------------------------------------------------
// xoch init -- real (non-scratch) coverage. bin/init.js resolves its
// prompts/ source from its own __dirname, not cwd, so running it through
// the real dispatcher here always renders/installs THIS repo's actual
// prompts/ -- unlike test/init.test.js's scratch-copied bin/init.js,
// which relocates the script to control a synthetic prompts/ fixture for
// malformed-input edge cases that can't occur against real, well-formed
// content. These tests close the real file's happy-path, idempotent-
// rerun, and orphan-cleanup coverage, which only a genuine install run
// against this repo's real prompts/ can reach.
//
// No test here deliberately exercises failRender() or its call sites
// (bin/init.js:70, malformed-partial/malformed-config/render-failure
// paths), the unresolved-partial check (bin/init.js:303), or the
// "prompts/ directory not found" branch (bin/init.js:597) -- see the
// DOCUMENTED COVERAGE EXCEPTION comments at those sites in bin/init.js.
// Those exact behaviors are already covered at 100% by
// test/init.test.js's scratch-copied bin/init.js, which relocates the
// script specifically to substitute the malformed content these
// branches require.
// ---------------------------------------------------------------------

function xochDir(ctx) {
  return path.join(ctx.home, '.xoch');
}

function copilotDir(ctx) {
  return path.join(ctx.home, 'Library', 'Application Support', 'Code', 'User', 'prompts');
}

function codexDir(ctx) {
  return path.join(ctx.home, '.codex', 'skills');
}

function claudeDir(ctx) {
  return path.join(ctx.home, '.claude', 'skills');
}

function kiroDir(ctx) {
  return path.join(ctx.home, '.kiro', 'steering');
}

test('a real xoch init renders and installs this repo\'s actual prompts to all four targets', () => {
  const ctx = scratch();
  try {
    const result = run(['init'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Initialization complete!/);
    assert.ok(fs.existsSync(path.join(xochDir(ctx), 'prompts', 'meow.md')));
    assert.ok(fs.existsSync(path.join(xochDir(ctx), 'prompts', 'core')));
    assert.ok(fs.lstatSync(path.join(copilotDir(ctx), 'xoch-meow.prompt.md')).isSymbolicLink());
    assert.ok(fs.existsSync(path.join(codexDir(ctx), 'xoch-meow', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(claudeDir(ctx), 'xoch-meow', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(kiroDir(ctx), 'xoch-meow.md')));
  } finally {
    cleanup(ctx);
  }
});

test('a second real xoch init run is idempotent, replaces existing Copilot symlinks, and reports no orphans', () => {
  const ctx = scratch();
  try {
    run(['init'], ctx);
    const second = run(['init'], ctx);
    assert.strictEqual(second.status, 0);
    assert.ok(!second.stdout.includes('Removed orphaned'));
    assert.match(second.stdout, /Token budgets already present/);
    assert.ok(fs.lstatSync(path.join(copilotDir(ctx), 'xoch-meow.prompt.md')).isSymbolicLink());
  } finally {
    cleanup(ctx);
  }
});

test('a real xoch init cleans up a stray orphaned entry in all four tool directories', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(copilotDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(copilotDir(ctx), 'xoch-nonexistent.prompt.md'), 'stray');
    fs.mkdirSync(path.join(codexDir(ctx), 'xoch-nonexistent', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(claudeDir(ctx), 'xoch-nonexistent'), { recursive: true });
    fs.mkdirSync(kiroDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(kiroDir(ctx), 'xoch-nonexistent.md'), 'stray');

    const result = run(['init'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Removed orphaned: xoch-nonexistent/);
    assert.ok(!fs.existsSync(path.join(copilotDir(ctx), 'xoch-nonexistent.prompt.md')));
    assert.ok(!fs.existsSync(path.join(codexDir(ctx), 'xoch-nonexistent')));
    assert.ok(!fs.existsSync(path.join(claudeDir(ctx), 'xoch-nonexistent')));
    assert.ok(!fs.existsSync(path.join(kiroDir(ctx), 'xoch-nonexistent.md')));
  } finally {
    cleanup(ctx);
  }
});

test('bin/init.js run directly (not through the dispatcher) still completes a real install', () => {
  const ctx = scratch();
  try {
    const result = runScript(path.join(__dirname, '..', 'bin', 'init.js'), [], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Initialization complete!/);
  } finally {
    cleanup(ctx);
  }
});

test('a real xoch init seeds config.json fresh, preserves an existing override, and recovers from a corrupt existing file', () => {
  const fresh = scratch();
  try {
    const result = run(['init'], fresh);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Seeded 2 default token budget\(s\)/);
    const config = JSON.parse(fs.readFileSync(path.join(xochDir(fresh), 'config.json'), 'utf8'));
    assert.strictEqual(config.tokenBudgets.spec, 5000);
    assert.strictEqual(config.tokenBudgets.plan, 7000);
  } finally {
    cleanup(fresh);
  }

  const override = scratch();
  try {
    fs.mkdirSync(xochDir(override), { recursive: true });
    fs.writeFileSync(path.join(xochDir(override), 'config.json'), JSON.stringify({ version: 1, tokenBudgets: { spec: 9999 } }));
    const result = run(['init'], override);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Seeded 1 default token budget\(s\)/);
    const config = JSON.parse(fs.readFileSync(path.join(xochDir(override), 'config.json'), 'utf8'));
    assert.strictEqual(config.tokenBudgets.spec, 9999);
    assert.strictEqual(config.tokenBudgets.plan, 7000);
  } finally {
    cleanup(override);
  }

  const corrupt = scratch();
  try {
    fs.mkdirSync(xochDir(corrupt), { recursive: true });
    fs.writeFileSync(path.join(xochDir(corrupt), 'config.json'), 'not valid json{{{');
    const result = run(['init'], corrupt);
    assert.strictEqual(result.status, 0);
    const config = JSON.parse(fs.readFileSync(path.join(xochDir(corrupt), 'config.json'), 'utf8'));
    assert.strictEqual(config.tokenBudgets.spec, 5000);
    assert.strictEqual(config.tokenBudgets.plan, 7000);
  } finally {
    cleanup(corrupt);
  }
});

runTests();
