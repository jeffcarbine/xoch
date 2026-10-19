#!/usr/bin/env node
'use strict';

// Xoch Remove
// Reverses xoch init's installs for every INSTALL_TARGETS tool and cleans
// up ~/.xoch runtime state. `npm uninstall -g` only removes files under
// node_modules, so this is the documented way to clean up what init copied
// outside it (AC-010).
// Also home to `verify()`, the programmatic check the xoch-meow prompt
// runs to confirm the CLI and rendered prompts are both in place (AC-006).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isMainModule } from './lib/is-main.js';
import { XOCH_RUNTIME_DIR, PROMPTS_DIR } from './init.js';
import {
  INSTALL_TARGETS, targetDir, isDirNoFollow, formatTargetLabels,
} from './lib/install-targets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const RED = '\x1b[0;31m';
const NC = '\x1b[0m';

// Removes every installed xoch entry from `target`'s folder, leaving
// anything not shaped like one of Xoch's own entries alone. Returns how
// many entries were removed.
function removeTarget(target) {
  const dir = targetDir(target);
  if (!isDirNoFollow(dir)) return 0;

  let removed = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith('xoch-') || !name.endsWith(target.suffix)) continue;
    const installedPath = path.join(dir, name);
    if (!target.isEntry(installedPath)) continue;
    target.removeEntry(installedPath);
    console.log(`  ${YELLOW}✗${NC} Removed: ${name} (${target.label})`);
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

  const removed = INSTALL_TARGETS.reduce((sum, target) => sum + removeTarget(target), 0);
  if (removed === 0) {
    console.log(`No installed xoch skill files found in ${formatTargetLabels(INSTALL_TARGETS, 'or')}.`);
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
  removeTarget,
  removeXochRuntime,
  remove,
  verify,
  main,
};
