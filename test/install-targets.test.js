'use strict';

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { test, run } from './lib/runner.js';
import { fileURLToPath } from 'url';
import {
  COPILOT, CODEX, CLAUDE, KIRO, INSTALL_TARGETS, targetDir, installedName, formatTargetLabels,
} from '../bin/lib/install-targets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');

// Copies the runnable parts of this repo (bin/, prompts/, config.js,
// package.json) into a scratch root and cuts its install target list down
// to Kiro alone -- the same one-line edit a downstream rebrand makes -- so
// init/remove/help can be exercised against a shortened list end to end.
function buildKiroOnlyRoot() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'xoch-kiro-only-'));
  const root = path.join(base, 'repo');
  const home = path.join(base, 'home');
  fs.mkdirSync(home, { recursive: true });
  for (const entry of ['bin', 'prompts', 'config.js', 'package.json']) {
    fs.cpSync(path.join(REPO_ROOT, entry), path.join(root, entry), { recursive: true });
  }
  const modulePath = path.join(root, 'bin', 'lib', 'install-targets.js');
  const source = fs.readFileSync(modulePath, 'utf8');
  const listLine = /^export const INSTALL_TARGETS = \[.*\];$/m;
  assert.match(source, listLine);
  fs.writeFileSync(modulePath, source.replace(listLine, 'export const INSTALL_TARGETS = [KIRO];'));
  return { base, root, home };
}

function runCli(env, args) {
  return spawnSync(process.execPath, [path.join(env.root, 'bin', 'xoch.js'), ...args], {
    cwd: env.root,
    env: { ...process.env, HOME: env.home },
    encoding: 'utf8',
  });
}

const OTHER_TOOLS = [COPILOT, CODEX, CLAUDE];

test('the default install target list is Copilot, Codex, Claude Code, and Kiro', () => {
  assert.deepStrictEqual(INSTALL_TARGETS.map((t) => t.id), ['copilot', 'codex', 'claude', 'kiro']);
});

test('every install target has a label, a home folder, an install step, and at least one usage line', () => {
  for (const t of [COPILOT, CODEX, CLAUDE, KIRO]) {
    assert.strictEqual(typeof t.label, 'string', `${t.id} label`);
    assert.ok(Array.isArray(t.homeDir) && t.homeDir.length > 0, `${t.id} homeDir`);
    assert.strictEqual(typeof t.install, 'function', `${t.id} install`);
    assert.ok(Array.isArray(t.usage) && t.usage.length > 0, `${t.id} usage`);
  }
});

test('each target resolves its folder under a given home directory', () => {
  assert.strictEqual(targetDir(KIRO, '/h'), path.join('/h', '.kiro', 'steering'));
  assert.strictEqual(targetDir(CLAUDE, '/h'), path.join('/h', '.claude', 'skills'));
  assert.strictEqual(targetDir(CODEX), path.join(os.homedir(), '.codex', 'skills'));
});

test('each target names an installed prompt the way that tool expects', () => {
  assert.strictEqual(installedName(COPILOT, 'meow'), 'xoch-meow.prompt.md');
  assert.strictEqual(installedName(CODEX, 'meow'), 'xoch-meow');
  assert.strictEqual(installedName(CLAUDE, 'meow'), 'xoch-meow');
  assert.strictEqual(installedName(KIRO, 'meow'), 'xoch-meow.md');
});

test('target names are joined into readable "and" and "or" phrases', () => {
  const all = [COPILOT, CODEX, CLAUDE, KIRO];
  assert.strictEqual(formatTargetLabels(all, 'and'), 'Copilot, Codex, Claude Code, and Kiro');
  assert.strictEqual(formatTargetLabels(all, 'or'), 'Copilot, Codex, Claude Code, or Kiro');
  assert.strictEqual(formatTargetLabels([KIRO], 'and'), 'Kiro');
});

test('only Claude Code has an extra installed-output check, and it rejects a missing or unguarded skill', () => {
  for (const t of [COPILOT, CODEX, KIRO]) assert.strictEqual(t.verify, undefined, `${t.id} verify`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xoch-claude-verify-'));
  try {
    assert.match(CLAUDE.verify(dir, 'meow'), /missing Claude skill xoch-meow/);
    fs.mkdirSync(path.join(dir, 'xoch-meow'));
    fs.writeFileSync(path.join(dir, 'xoch-meow', 'SKILL.md'), '---\nname: meow\n---\n');
    assert.match(CLAUDE.verify(dir, 'meow'), /Claude skill xoch-meow permits model invocation/);
    fs.writeFileSync(path.join(dir, 'xoch-meow', 'SKILL.md'), '---\nname: meow\ndisable-model-invocation: true\n---\n');
    assert.strictEqual(CLAUDE.verify(dir, 'meow'), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Codex installs a prompt with no name or description as a skill with empty fields', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xoch-codex-install-'));
  try {
    const prompt = path.join(dir, 'bare.md');
    fs.writeFileSync(prompt, 'Just a body.\n');
    CODEX.install(prompt, 'bare', dir);
    const yaml = fs.readFileSync(path.join(dir, 'xoch-bare', 'agents', 'openai.yaml'), 'utf8');
    assert.match(yaml, /short_description: ""/);
    assert.match(yaml, /default_prompt: "Use \$ to invoke/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('with the target list cut to Kiro, init installs only to the Kiro folder and only mentions Kiro', () => {
  const env = buildKiroOnlyRoot();
  try {
    const result = runCli(env, ['init']);
    assert.strictEqual(result.status, 0, result.stderr);
    const kiroFiles = fs.readdirSync(targetDir(KIRO, env.home));
    assert.ok(kiroFiles.includes(installedName(KIRO, 'open')), 'Kiro gets the installed prompts');
    for (const t of OTHER_TOOLS) {
      assert.ok(!fs.existsSync(targetDir(t, env.home)), `${t.label} folder must not be created`);
      assert.ok(!result.stdout.includes(t.label), `init output must not mention ${t.label}`);
    }
  } finally {
    fs.rmSync(env.base, { recursive: true, force: true });
  }
});

test('with the target list cut to Kiro, remove only removes Kiro files and leaves other tools alone', () => {
  const env = buildKiroOnlyRoot();
  try {
    assert.strictEqual(runCli(env, ['init']).status, 0);
    for (const t of OTHER_TOOLS) {
      const installed = path.join(targetDir(t, env.home), installedName(t, 'open'));
      fs.mkdirSync(path.dirname(installed), { recursive: true });
      fs.writeFileSync(installed, 'installed by another tool');
    }
    const result = runCli(env, ['remove']);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.ok(!fs.existsSync(path.join(targetDir(KIRO, env.home), installedName(KIRO, 'open'))));
    for (const t of OTHER_TOOLS) {
      assert.ok(fs.existsSync(path.join(targetDir(t, env.home), installedName(t, 'open'))), `${t.label} left alone`);
    }
  } finally {
    fs.rmSync(env.base, { recursive: true, force: true });
  }
});

test('with the target list cut to Kiro, a remove with nothing installed names only Kiro', () => {
  const env = buildKiroOnlyRoot();
  try {
    const result = runCli(env, ['remove']);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /No installed xoch skill files found in Kiro\./);
  } finally {
    fs.rmSync(env.base, { recursive: true, force: true });
  }
});

test('with the target list cut to Kiro, the help text says init installs for Kiro only', () => {
  const env = buildKiroOnlyRoot();
  try {
    const result = runCli(env, ['--help']);
    assert.match(result.stdout, /install skill files for Kiro\n/);
    const configHelp = runCli(env, ['config', '--help']);
    assert.match(configHelp.stdout, /reinstalls prompts for Kiro,/);
  } finally {
    fs.rmSync(env.base, { recursive: true, force: true });
  }
});

run();
