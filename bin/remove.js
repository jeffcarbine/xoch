#!/usr/bin/env node
'use strict';

// Xoch Remove
// Reverses xoch init's four tool installs and cleans up ~/.xoch runtime
// state. `npm uninstall -g` only removes files under node_modules, so this
// is the documented way to clean up what init copied outside it (AC-010).
// Also home to `verify()`, the programmatic check the xoch-meow prompt
// runs to confirm the CLI and rendered prompts are both in place (AC-006).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isMainModule } from './lib/is-main.js';
import {
  COPILOT_DIR, CODEX_DIR, CLAUDE_DIR, KIRO_DIR, XOCH_RUNTIME_DIR, PROMPTS_DIR,
} from './init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const RED = '\x1b[0;31m';
const NC = '\x1b[0m';

// Matches init.js's own isFileOrSymlink/isDirNoFollow -- duplicated rather
// than exported since each bin/*.js script stays self-contained.
//
// DOCUMENTED COVERAGE EXCEPTION (npm-setup, 2026-09-18): the catch
// branch below is a TOCTOU guard -- it only fires when `p` (just listed
// by the caller's own fs.readdirSync) is deleted by something else
// between that listing and this lstat call. Not dead code: removing it
// would let a genuine race throw an uncaught exception instead of
// harmlessly skipping the vanished entry. Not deterministically
// testable: triggering it requires an external process to delete the
// exact path in the microtask gap between readdirSync and lstatSync,
// which can't be constructed without mocking fs (a pattern this
// codebase deliberately avoids -- see test/lib/cli.js's real-subprocess
// philosophy). Unlike isDirNoFollow() below, whose catch branch is
// already covered deterministically (it also fires whenever the target
// directory simply doesn't exist yet, not only on a race).
function isFileOrSymlink(p) {
  try {
    const lst = fs.lstatSync(p);
    return lst.isSymbolicLink() || lst.isFile();
  } catch {
    return false;
  }
}

function isDirNoFollow(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function removeCopilot() {
  if (!isDirNoFollow(COPILOT_DIR)) return 0;

  let removed = 0;
  for (const name of fs.readdirSync(COPILOT_DIR)) {
    if (!name.startsWith('xoch-') || !name.endsWith('.prompt.md')) continue;
    const installedPath = path.join(COPILOT_DIR, name);
    if (!isFileOrSymlink(installedPath)) continue;
    fs.unlinkSync(installedPath);
    console.log(`  ${YELLOW}✗${NC} Removed: ${name} (Copilot)`);
    removed += 1;
  }
  return removed;
}

function removeCodex() {
  if (!isDirNoFollow(CODEX_DIR)) return 0;

  let removed = 0;
  for (const name of fs.readdirSync(CODEX_DIR)) {
    if (!name.startsWith('xoch-')) continue;
    const installedPath = path.join(CODEX_DIR, name);
    if (!isDirNoFollow(installedPath)) continue;
    fs.rmSync(installedPath, { recursive: true, force: true });
    console.log(`  ${YELLOW}✗${NC} Removed: ${name} (Codex)`);
    removed += 1;
  }
  return removed;
}

function removeClaude() {
  if (!isDirNoFollow(CLAUDE_DIR)) return 0;

  let removed = 0;
  for (const name of fs.readdirSync(CLAUDE_DIR)) {
    if (!name.startsWith('xoch-')) continue;
    const installedPath = path.join(CLAUDE_DIR, name);
    if (!isDirNoFollow(installedPath)) continue;
    fs.rmSync(installedPath, { recursive: true, force: true });
    console.log(`  ${YELLOW}✗${NC} Removed: ${name} (Claude Code)`);
    removed += 1;
  }
  return removed;
}

function removeKiro() {
  if (!isDirNoFollow(KIRO_DIR)) return 0;

  let removed = 0;
  for (const name of fs.readdirSync(KIRO_DIR)) {
    if (!name.startsWith('xoch-') || !name.endsWith('.md')) continue;
    const installedPath = path.join(KIRO_DIR, name);
    if (!fs.statSync(installedPath).isFile()) continue;
    fs.unlinkSync(installedPath);
    console.log(`  ${YELLOW}✗${NC} Removed: ${name} (Kiro)`);
    removed += 1;
  }
  return removed;
}

// Removes ~/.xoch outright, which covers rendered prompts, config.json,
// and any ~/.xoch/bin leftover from a pre-migration install in one shot.
function removeXochRuntime() {
  if (!fs.existsSync(XOCH_RUNTIME_DIR)) {
    console.log(`${YELLOW}${XOCH_RUNTIME_DIR} not found; nothing to remove there.${NC}`);
    return;
  }
  fs.rmSync(XOCH_RUNTIME_DIR, { recursive: true, force: true });
  console.log(`${GREEN}✓${NC} Removed ${XOCH_RUNTIME_DIR}`);
}

function remove() {
  console.log('Xoch Remove');
  console.log('====================');
  console.log('');

  const removed = removeCopilot() + removeCodex() + removeClaude() + removeKiro();
  if (removed === 0) {
    console.log('No installed xoch skill files found in Copilot, Codex, Claude Code, or Kiro.');
  }
  console.log('');
  removeXochRuntime();
  console.log('');
  console.log(`${GREEN}Removal complete.${NC}`);
}

// Checks that the CLI reports a real version and that xoch init has
// rendered at least one prompt into ~/.xoch/prompts -- the two things
// the xoch-meow prompt asks the agent to confirm.
function verify() {
  const versionOk = typeof pkg.version === 'string' && pkg.version.length > 0;
  const promptsExist = fs.existsSync(PROMPTS_DIR)
    && fs.readdirSync(PROMPTS_DIR).some((name) => name.endsWith('.md'));

  console.log('Meow! 🐱');
  console.log('');

  if (versionOk) {
    console.log(`  ${GREEN}✓${NC} CLI installed (xoch v${pkg.version})`);
  } else {
    // DOCUMENTED COVERAGE EXCEPTION (npm-setup, 2026-09-18; mechanism
    // updated for the es6-imports job, 2026-09-18): `pkg` is read from
    // this repo's own real package.json at module-load time via
    // readFileSync+JSON.parse off an import.meta.url-derived path (see
    // above), which npm guarantees has a non-empty "version" string --
    // this branch can only fire against a malformed package.json, which
    // would require relocating this script (as test/prompt-check.test.js's
    // buildFixtureRoot() does for bin/xoch.js's own equivalent top-level
    // package.json read) rather than exercising the real, installed file.
    console.log(`  ${RED}✗${NC} CLI version could not be determined`);
  }

  if (promptsExist) {
    console.log(`  ${GREEN}✓${NC} Rendered prompts found in ${PROMPTS_DIR}`);
  } else {
    console.log(`  ${RED}✗${NC} No rendered prompts found in ${PROMPTS_DIR} -- run \`xoch init\``);
  }

  console.log('');

  if (!versionOk || !promptsExist) {
    console.log('Xoch installation verification failed.');
    process.exit(1);
  }

  console.log('Xoch installation verified: the CLI and rendered prompts are both in place.');
}

function main(argv) {
  const [sub] = argv || [];
  if (sub === 'verify') {
    verify();
    return;
  }
  remove();
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}

export {
  removeCopilot,
  removeCodex,
  removeClaude,
  removeKiro,
  removeXochRuntime,
  remove,
  verify,
  main,
};
