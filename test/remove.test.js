'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup, runScript } from './lib/cli.js';
import {
  COPILOT, CODEX, CLAUDE, KIRO, INSTALL_TARGETS, targetDir, installedName,
} from '../bin/lib/install-targets.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REMOVE_SCRIPT = path.join(__dirname, '..', 'bin', 'remove.js');

// Tool-specific checks only apply when that tool is in INSTALL_TARGETS, so a
// build with a shortened list (e.g. a Kiro-only rebrand) still passes.
const listed = (target) => INSTALL_TARGETS.includes(target);

function xochDir(ctx) {
  return path.join(ctx.home, '.xoch');
}

function copilotDir(ctx) {
  return targetDir(COPILOT, ctx.home);
}

function codexDir(ctx) {
  return targetDir(CODEX, ctx.home);
}

function claudeDir(ctx) {
  return targetDir(CLAUDE, ctx.home);
}

function kiroDir(ctx) {
  return targetDir(KIRO, ctx.home);
}

// Simulates what a prior `xoch init` run (plus a pre-migration leftover
// ~/.xoch/bin) would have left on disk, so remove.js has something real to
// reverse.
function buildInstalledFixture(ctx) {
  fs.mkdirSync(path.join(xochDir(ctx), 'prompts'), { recursive: true });
  fs.writeFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'Meow body.\n');
  fs.writeFileSync(path.join(xochDir(ctx), 'config.json'), '{"version":1}\n');
  fs.mkdirSync(path.join(xochDir(ctx), 'bin'), { recursive: true });
  fs.writeFileSync(path.join(xochDir(ctx), 'bin', 'leftover.js'), '// pre-migration leftover\n');

  if (listed(COPILOT)) {
    fs.mkdirSync(copilotDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(copilotDir(ctx), 'xoch-meow.prompt.md'), 'installed');
    fs.writeFileSync(path.join(copilotDir(ctx), 'unrelated.prompt.md'), 'not ours');
  }

  if (listed(CODEX)) {
    fs.mkdirSync(path.join(codexDir(ctx), 'xoch-meow', 'agents'), { recursive: true });
    fs.writeFileSync(path.join(codexDir(ctx), 'xoch-meow', 'SKILL.md'), 'installed');
    fs.mkdirSync(path.join(codexDir(ctx), 'not-ours'), { recursive: true });
    fs.writeFileSync(path.join(codexDir(ctx), 'not-ours', 'file'), 'not ours');
  }

  if (listed(CLAUDE)) {
    fs.mkdirSync(path.join(claudeDir(ctx), 'xoch-meow'), { recursive: true });
    fs.writeFileSync(path.join(claudeDir(ctx), 'xoch-meow', 'SKILL.md'), 'installed');
    fs.mkdirSync(path.join(claudeDir(ctx), 'not-ours'), { recursive: true });
    fs.writeFileSync(path.join(claudeDir(ctx), 'not-ours', 'file'), 'not ours');
  }

  if (listed(KIRO)) {
    fs.mkdirSync(kiroDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(kiroDir(ctx), 'xoch-meow.md'), 'installed');
    fs.writeFileSync(path.join(kiroDir(ctx), 'not-ours.md'), 'not ours');
  }
}

test('xoch remove removes rendered skill files from every listed tool directory', () => {
  const ctx = scratch();
  try {
    buildInstalledFixture(ctx);
    const result = runScript(REMOVE_SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);

    for (const target of INSTALL_TARGETS) {
      assert.ok(!fs.existsSync(path.join(targetDir(target, ctx.home), installedName(target, 'meow'))), target.label);
    }
  } finally {
    cleanup(ctx);
  }
});

test('xoch remove cleans up ~/.xoch prompts, config, and a leftover legacy bin/ dir', () => {
  const ctx = scratch();
  try {
    buildInstalledFixture(ctx);
    const result = runScript(REMOVE_SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);

    assert.ok(!fs.existsSync(xochDir(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('xoch remove leaves unrelated files in each tool directory untouched', () => {
  const ctx = scratch();
  try {
    buildInstalledFixture(ctx);
    const result = runScript(REMOVE_SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);

    if (listed(COPILOT)) assert.ok(fs.existsSync(path.join(copilotDir(ctx), 'unrelated.prompt.md')));
    if (listed(CODEX)) assert.ok(fs.existsSync(path.join(codexDir(ctx), 'not-ours', 'file')));
    if (listed(CLAUDE)) assert.ok(fs.existsSync(path.join(claudeDir(ctx), 'not-ours', 'file')));
    if (listed(KIRO)) assert.ok(fs.existsSync(path.join(kiroDir(ctx), 'not-ours.md')));
  } finally {
    cleanup(ctx);
  }
});

test('xoch remove is a no-op that still exits 0 when nothing was ever installed', () => {
  const ctx = scratch();
  try {
    const result = runScript(REMOVE_SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

// No test here triggers verify()'s "CLI version could not be determined"
// branch (bin/remove.js:~88) -- see the DOCUMENTED COVERAGE EXCEPTION
// comment at that site in bin/remove.js. pkg.version is read from this
// repo's own real package.json at module-load time, which npm
// guarantees has a non-empty version string; triggering the branch
// would require a malformed package.json, reachable only by relocating
// this script (as test/prompt-check.test.js's buildFixtureRoot() does
// for bin/xoch.js's equivalent require), not by exercising the real,
// installed file.
test('xoch verify reports success when both the CLI and rendered prompts are present', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(xochDir(ctx), 'prompts'), { recursive: true });
    fs.writeFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'Meow body.\n');
    const result = runScript(REMOVE_SCRIPT, ['verify'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /verified/i);
  } finally {
    cleanup(ctx);
  }
});

test('xoch verify fails clearly when rendered prompts are missing', () => {
  const ctx = scratch();
  try {
    const result = runScript(REMOVE_SCRIPT, ['verify'], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /no rendered prompts|run `xoch init`/i);
  } finally {
    cleanup(ctx);
  }
});

test('xoch verify fails clearly when the rendered prompts directory exists but is empty', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(xochDir(ctx), 'prompts'), { recursive: true });
    const result = runScript(REMOVE_SCRIPT, ['verify'], ctx);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /no rendered prompts|run `xoch init`/i);
  } finally {
    cleanup(ctx);
  }
});

run();
