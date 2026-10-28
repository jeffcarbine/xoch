#!/usr/bin/env node
'use strict';

// Xoch Config
// Sets Xoch configuration values (currently: storage.mode). Similar to
// install.js in style, but for engineer-facing config, not installation.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { isMainModule } from './bin/lib/is-main.js';
import { readJson, updateJson } from './bin/lib/json-store.js';
import { reinstall } from './bin/init.js';
import { INSTALL_TARGETS, formatTargetLabels } from './bin/lib/install-targets.js';
import {
  findRepos, planMigration, executeMigration, describePlan,
} from './bin/storage-migrate.js';

const CONFIG_PATH = path.join(os.homedir(), '.xoch', 'config.json');
const VALID_STORAGE_MODES = ['in-repo', 'centralized'];
const VALID_COMMENT_MODES = ['always', 'follow-convention'];
const VALID_COVERAGE_STRICTNESS = ['required', 'recommended'];
const VALID_CONVENTIONS_STRICTNESS = ['required', 'recommended'];
const VALID_GIT_BEHAVIORS = ['ask', 'generate', 'commit', 'push', 'none'];

// Kept in sync by hand with bin/token-estimator.js's (and install.js's)
// copy of this table -- the installed runtime can't require this
// root-level file, so it's duplicated rather than shared.
const DEFAULT_SKILL_BUDGETS = { spec: 5000, plan: 7000 };
const FALLBACK_SKILL_BUDGET = 5000;

const GREEN = '\x1b[0;32m';
const RED = '\x1b[0;31m';
const NC = '\x1b[0m';

function isValidStorageMode(value) {
  return VALID_STORAGE_MODES.includes(value);
}

function isValidCommentMode(value) {
  return VALID_COMMENT_MODES.includes(value);
}

function isValidCoverageStrictness(value) {
  return VALID_COVERAGE_STRICTNESS.includes(value);
}

function isValidConventionsStrictness(value) {
  return VALID_CONVENTIONS_STRICTNESS.includes(value);
}

function isValidGitBehavior(value) {
  return VALID_GIT_BEHAVIORS.includes(value);
}

function isValidBudgetValue(value) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function readTokenBudgets() {
  const data = readJson(CONFIG_PATH);
  return { ...DEFAULT_SKILL_BUDGETS, ...(data.tokenBudgets || {}) };
}

function resolvedBudget(skill) {
  const budgets = readTokenBudgets();
  return Object.prototype.hasOwnProperty.call(budgets, skill) ? budgets[skill] : FALLBACK_SKILL_BUDGET;
}

function writeTokenBudget(skill, value) {
  updateJson(CONFIG_PATH, (data) => {
    data.version = data.version || 1;
    data.tokenBudgets = data.tokenBudgets || {};
    data.tokenBudgets[skill] = Number(value);
    return data;
  });
}

function readStorageMode() {
  const data = readJson(CONFIG_PATH);
  const mode = data.storage && data.storage.mode;
  return isValidStorageMode(mode) ? mode : 'centralized';
}

function readCommentMode() {
  const data = readJson(CONFIG_PATH);
  const mode = data.documentation && data.documentation.commentMode;
  return isValidCommentMode(mode) ? mode : 'follow-convention';
}

function readCoverageStrictness() {
  const data = readJson(CONFIG_PATH);
  const strictness = data.coverage && data.coverage.strictness;
  return isValidCoverageStrictness(strictness) ? strictness : 'recommended';
}

/**
 * Whether conventions findings block final_review (required) or are
 * reported for the engineer to fix or accept (recommended, the default).
 * @returns {string}
 */
function readConventionsStrictness() {
  const data = readJson(CONFIG_PATH);
  const strictness = data.conventions && data.conventions.strictness;
  return isValidConventionsStrictness(strictness) ? strictness : 'recommended';
}

/**
 * What the advance step does with git changes: ask each time (default),
 * generate a commit message, commit, commit and push, or nothing.
 * @returns {string}
 */
function readGitBehavior() {
  const data = readJson(CONFIG_PATH);
  const behavior = data.git && data.git.behavior;
  return isValidGitBehavior(behavior) ? behavior : 'ask';
}

function printConfig() {
  const data = readJson(CONFIG_PATH);
  const mode = readStorageMode();
  data.version = data.version || 1;
  data.storage = data.storage || {};
  data.storage.mode = mode;
  data.tokenBudgets = readTokenBudgets();
  data.documentation = data.documentation || {};
  data.documentation.commentMode = readCommentMode();
  data.coverage = data.coverage || {};
  data.coverage.strictness = readCoverageStrictness();
  data.conventions = data.conventions || {};
  data.conventions.strictness = readConventionsStrictness();
  data.git = data.git || {};
  data.git.behavior = readGitBehavior();
  console.log(JSON.stringify(data, null, 2));
}

function writeStorageMode(value) {
  updateJson(CONFIG_PATH, (data) => {
    data.version = data.version || 1;
    data.storage = data.storage || {};
    data.storage.mode = value;
    return data;
  });
}

function writeCommentMode(value) {
  updateJson(CONFIG_PATH, (data) => {
    data.version = data.version || 1;
    data.documentation = data.documentation || {};
    data.documentation.commentMode = value;
    return data;
  });
}

function writeCoverageStrictness(value) {
  updateJson(CONFIG_PATH, (data) => {
    data.version = data.version || 1;
    data.coverage = data.coverage || {};
    data.coverage.strictness = value;
    return data;
  });
}

function writeConventionsStrictness(value) {
  updateJson(CONFIG_PATH, (data) => {
    data.version = data.version || 1;
    data.conventions = data.conventions || {};
    data.conventions.strictness = value;
    return data;
  });
}

function writeGitBehavior(value) {
  updateJson(CONFIG_PATH, (data) => {
    data.version = data.version || 1;
    data.git = data.git || {};
    data.git.behavior = value;
    return data;
  });
}

/**
 * Switches storage.mode, first moving every known repo's Xoch data to where
 * the new mode looks for it. Shows the plan, refuses (changing nothing) when
 * any move is unsafe, asks before moving unless --yes, and sets the mode only
 * after every move succeeded -- a failed move is undone.
 * @param {string} target - 'in-repo' or 'centralized'.
 * @param {Object} [options]
 * @param {string} [options.scanDir] - Also look for repos directly under this folder.
 * @param {boolean} [options.yes] - Move without asking.
 * @param {boolean} [options.dryRun] - Show the plan and stop.
 */
function applyStorageMode(target, { scanDir, yes = false, dryRun = false } = {}) {
  const home = os.homedir();
  const plan = planMigration({ to: target, home, repos: findRepos({ home, scanDir }) });
  for (const line of describePlan(plan)) console.log(line);
  if (plan.refusals.length) {
    process.stderr.write(`${RED}Error: storage move refused; storage.mode not changed${NC}\n`);
    process.exit(1);
  }
  if (dryRun) {
    console.log('Dry run: nothing moved.');
    return;
  }
  if (plan.moves.length && !yes) {
    console.log('Proceed? [Y]es / [N]o');
    const answer = readLine();
    if (answer === null) process.exit(1);
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log('Cancelled; nothing moved.');
      return;
    }
  }
  try {
    executeMigration(plan);
  } catch (e) {
    process.stderr.write(`${RED}Error: Storage move failed and was undone: ${e.message}; storage.mode not changed${NC}\n`);
    process.exit(1);
  }
  if (plan.moves.length) console.log(`Moved ${plan.moves.length} repo${plan.moves.length === 1 ? '' : 's'}.`);
  writeStorageMode(target);
  console.log(`${GREEN}✓${NC} storage.mode set to ${target}`);
  reinstall();
}

/**
 * Parses `set storage.mode` options.
 * @param {string[]} args - Arguments after the value.
 * @returns {{scanDir?: string, yes: boolean, dryRun: boolean}}
 */
function storageOptions(args) {
  const options = { yes: false, dryRun: false };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--scan') {
      options.scanDir = args[i + 1];
      i += 1;
    } else if (args[i] === '--yes') {
      options.yes = true;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else {
      process.stderr.write(`${RED}Error: unknown option: ${args[i]}${NC}\n`);
      process.exit(1);
    }
  }
  return options;
}

function cmdGet(key) {
  if (key === 'storage.mode') {
    console.log(readStorageMode());
    return;
  }
  if (key === 'documentation.commentMode') {
    console.log(readCommentMode());
    return;
  }
  if (key === 'coverage.strictness') {
    console.log(readCoverageStrictness());
    return;
  }
  if (key === 'conventions.strictness') {
    console.log(readConventionsStrictness());
    return;
  }
  if (key === 'git.behavior') {
    console.log(readGitBehavior());
    return;
  }
  if (key.startsWith('tokenBudgets.')) {
    console.log(resolvedBudget(key.slice('tokenBudgets.'.length)));
    return;
  }
  process.stderr.write(`${RED}Error: unknown config key: ${key}${NC}\n`);
  process.exit(1);
}

function cmdSet(key, value, options = []) {
  if (key === 'storage.mode') {
    if (!isValidStorageMode(value)) {
      process.stderr.write(`${RED}Error: invalid storage.mode value '${value}'. Expected one of: ${VALID_STORAGE_MODES.join(' ')}${NC}\n`);
      process.exit(1);
    }
    applyStorageMode(value, storageOptions(options));
    return;
  }
  if (key === 'documentation.commentMode') {
    if (!isValidCommentMode(value)) {
      process.stderr.write(`${RED}Error: invalid documentation.commentMode value '${value}'. Expected one of: ${VALID_COMMENT_MODES.join(' ')}${NC}\n`);
      process.exit(1);
    }
    writeCommentMode(value);
    console.log(`${GREEN}✓${NC} documentation.commentMode set to ${value}`);
    reinstall();
    return;
  }
  if (key === 'coverage.strictness') {
    if (!isValidCoverageStrictness(value)) {
      process.stderr.write(`${RED}Error: invalid coverage.strictness value '${value}'. Expected one of: ${VALID_COVERAGE_STRICTNESS.join(' ')}${NC}\n`);
      process.exit(1);
    }
    writeCoverageStrictness(value);
    console.log(`${GREEN}✓${NC} coverage.strictness set to ${value}`);
    reinstall();
    return;
  }
  if (key === 'conventions.strictness') {
    if (!isValidConventionsStrictness(value)) {
      process.stderr.write(`${RED}Error: invalid conventions.strictness value '${value}'. Expected one of: ${VALID_CONVENTIONS_STRICTNESS.join(' ')}${NC}\n`);
      process.exit(1);
    }
    writeConventionsStrictness(value);
    console.log(`${GREEN}✓${NC} conventions.strictness set to ${value}`);
    reinstall();
    return;
  }
  if (key === 'git.behavior') {
    if (!isValidGitBehavior(value)) {
      process.stderr.write(`${RED}Error: invalid git.behavior value '${value}'. Expected one of: ${VALID_GIT_BEHAVIORS.join(' ')}${NC}\n`);
      process.exit(1);
    }
    writeGitBehavior(value);
    console.log(`${GREEN}✓${NC} git.behavior set to ${value}`);
    reinstall();
    return;
  }
  if (key.startsWith('tokenBudgets.')) {
    if (!isValidBudgetValue(value)) {
      process.stderr.write(`${RED}Error: invalid budget value '${value}'. Expected a positive whole number.${NC}\n`);
      process.exit(1);
    }
    const skill = key.slice('tokenBudgets.'.length);
    writeTokenBudget(skill, value);
    console.log(`${GREEN}✓${NC} tokenBudgets.${skill} set to ${value}`);
    reinstall();
    return;
  }
  process.stderr.write(`${RED}Error: unknown config key: ${key}${NC}\n`);
  process.exit(1);
}

function cmdShow() {
  printConfig();
}

// Reads one line from fd 0, byte by byte. Returns null if EOF is reached
// before a newline -- matching bash's `read` failing (non-zero exit) when
// stdin has no complete line available, whether that's immediate EOF (closed
// stdin) or a partial line with no trailing newline.
function readLine() {
  const buf = Buffer.alloc(1);
  let input = '';
  for (;;) {
    let bytesRead;
    try {
      bytesRead = fs.readSync(0, buf, 0, 1, null);
    } catch (e) {
      if (e.code === 'EAGAIN') continue;
      throw e;
    }
    if (bytesRead === 0) return null;
    const char = buf.toString('utf8', 0, 1);
    if (char === '\n') return input;
    input += char;
  }
}

function runStorageModeInteractive() {
  const current = readStorageMode();
  console.log(`Current storage.mode: ${current}`);
  console.log('');
  console.log('Choose storage mode:');
  console.log('  1) in-repo — job/arc state lives in .xoch/work/ inside each repo');
  console.log('  2) centralized — job/arc state lives under ~/.xoch/projects/<slug>/work/ (default)');
  console.log('  3) leave unchanged');
  console.log('');
  // Matches bash's `read -p`: the prompt is only displayed when input is
  // coming from a terminal, and is suppressed entirely for piped/redirected
  // stdin (verified directly against config.sh: no prompt text on either
  // stdout or stderr when stdin isn't a TTY).
  if (process.stdin.isTTY) process.stdout.write('Selection [1/2/3]: ');

  const choice = readLine();
  if (choice === null) process.exit(1);

  let target = '';
  switch (choice) {
    case '1':
      target = 'in-repo';
      break;
    case '2':
      target = 'centralized';
      break;
    case '3':
    case '':
      console.log('Left unchanged.');
      return;
    default:
      process.stderr.write(`${RED}Error: invalid selection: ${choice}${NC}\n`);
      process.exit(1);
      return;
  }

  if (target === current) {
    console.log(`Already ${target}; nothing changed.`);
    return;
  }

  applyStorageMode(target);
}

function runCommentModeInteractive() {
  const current = readCommentMode();
  console.log(`Current documentation.commentMode: ${current}`);
  console.log('');
  console.log('Choose documentation comment mode:');
  console.log('  1) always — add inline documentation (JSDoc/docstrings/etc.) unconditionally');
  console.log('  2) follow-convention — match whatever the target project/file already does (default)');
  console.log('  3) leave unchanged');
  console.log('');
  if (process.stdin.isTTY) process.stdout.write('Selection [1/2/3]: ');

  const choice = readLine();
  if (choice === null) process.exit(1);

  let target = '';
  switch (choice) {
    case '1':
      target = 'always';
      break;
    case '2':
      target = 'follow-convention';
      break;
    case '3':
    case '':
      console.log('Left unchanged.');
      return;
    default:
      process.stderr.write(`${RED}Error: invalid selection: ${choice}${NC}\n`);
      process.exit(1);
      return;
  }

  if (target === current) {
    console.log(`Already ${target}; nothing changed.`);
    return;
  }

  writeCommentMode(target);
  console.log(`${GREEN}✓${NC} documentation.commentMode set to ${target}`);
  reinstall();
}

function runCoverageStrictnessInteractive() {
  const current = readCoverageStrictness();
  console.log(`Current coverage.strictness: ${current}`);
  console.log('');
  console.log('Choose coverage strictness:');
  console.log('  1) required — every job-touched file with code must reach 100% coverage before the job can close');
  console.log('  2) recommended — coverage gaps are reported for the engineer to decide on, not auto-blocked (default)');
  console.log('  3) leave unchanged');
  console.log('');
  if (process.stdin.isTTY) process.stdout.write('Selection [1/2/3]: ');

  const choice = readLine();
  if (choice === null) process.exit(1);

  let target = '';
  switch (choice) {
    case '1':
      target = 'required';
      break;
    case '2':
      target = 'recommended';
      break;
    case '3':
    case '':
      console.log('Left unchanged.');
      return;
    default:
      process.stderr.write(`${RED}Error: invalid selection: ${choice}${NC}\n`);
      process.exit(1);
      return;
  }

  if (target === current) {
    console.log(`Already ${target}; nothing changed.`);
    return;
  }

  writeCoverageStrictness(target);
  console.log(`${GREEN}✓${NC} coverage.strictness set to ${target}`);
  reinstall();
}

/**
 * Asks what the advance step should do with git changes.
 */
function runGitBehaviorInteractive() {
  const current = readGitBehavior();
  console.log(`Current git.behavior: ${current}`);
  console.log('');
  console.log('Choose what happens to git changes at each phase\'s advance step:');
  console.log('  1) ask — ask each time: [G]enerate a message, [C]ommit, commit and [P]ush, or [N]othing (default)');
  console.log('  2) generate — draft a commit message; the engineer commits');
  console.log('  3) commit — generate a message and commit');
  console.log('  4) push — generate a message, commit, and push');
  console.log('  5) none — leave git alone');
  console.log('  6) leave unchanged');
  console.log('');
  if (process.stdin.isTTY) process.stdout.write('Selection [1-6]: ');

  const choice = readLine();
  if (choice === null) process.exit(1);
  if (choice === '6' || choice === '') {
    console.log('Left unchanged.');
    return;
  }
  const target = VALID_GIT_BEHAVIORS[Number(choice) - 1];
  if (!/^[1-5]$/.test(choice)) {
    process.stderr.write(`${RED}Error: invalid selection: ${choice}${NC}\n`);
    process.exit(1);
    return;
  }
  if (target === current) {
    console.log(`Already ${target}; nothing changed.`);
    return;
  }
  writeGitBehavior(target);
  console.log(`${GREEN}✓${NC} git.behavior set to ${target}`);
  reinstall();
}

function runInteractive() {
  console.log('Xoch Config');
  console.log('===========');
  console.log('');

  runStorageModeInteractive();
  console.log('');
  runCommentModeInteractive();
  console.log('');
  runCoverageStrictnessInteractive();
  console.log('');
  runGitBehaviorInteractive();
}

function runBudgetsInteractive() {
  console.log('Xoch Token Budgets');
  console.log('===================');
  console.log('');
  console.log('Current budgets:');
  for (const [skill, value] of Object.entries(readTokenBudgets())) {
    console.log(`  ${skill}: ${value}`);
  }
  console.log('');

  for (;;) {
    if (process.stdin.isTTY) process.stdout.write('Enter a skill name to update (or press Enter to finish): ');
    const skill = readLine();
    if (skill === null) process.exit(1);
    if (skill === '') {
      console.log('Done.');
      return;
    }

    const current = resolvedBudget(skill);
    if (process.stdin.isTTY) process.stdout.write(`New budget for "${skill}" (currently ${current}): `);
    const value = readLine();
    if (value === null) process.exit(1);
    if (!isValidBudgetValue(value)) {
      process.stderr.write(`${RED}Error: invalid budget value '${value}'. Expected a positive whole number.${NC}\n`);
      process.exit(1);
    }

    writeTokenBudget(skill, value);
    console.log(`${GREEN}✓${NC} tokenBudgets.${skill} set to ${value}`);
    reinstall();
    console.log('');
  }
}

function usage() {
  console.log(`Usage:
  node config.js                          Interactive mode (storage mode, documentation comment mode, coverage strictness, git behavior)
  node config.js show                     Print resolved config
  node config.js get storage.mode         Print current storage.mode
  node config.js set storage.mode VALUE [--scan DIR] [--dry-run] [--yes]
                                          Set storage.mode (in-repo|centralized), first moving every known
                                          repo's Xoch data (workspace map, centralized roots, --scan DIR)
  node config.js get documentation.commentMode       Print documentation.commentMode
  node config.js set documentation.commentMode VALUE Set documentation.commentMode (always|follow-convention)
  node config.js get coverage.strictness       Print coverage.strictness
  node config.js set coverage.strictness VALUE Set coverage.strictness (required|recommended)
  node config.js get conventions.strictness       Print conventions.strictness
  node config.js set conventions.strictness VALUE Set conventions.strictness (required|recommended)
  node config.js get git.behavior              Print git.behavior
  node config.js set git.behavior VALUE        Set git.behavior (ask|generate|commit|push|none)
  node config.js get tokenBudgets.SKILL       Print SKILL's resolved read budget
  node config.js set tokenBudgets.SKILL VALUE Set SKILL's read budget (positive integer)
  node config.js budgets                      Interactively review/update token budgets

Every config-writing command re-renders and reinstalls prompts for ${formatTargetLabels(INSTALL_TARGETS, 'and')}, so installed prompts always reflect the current config.`);
}

// Takes an explicit argv (like every other bin/ script's main(argv)) so
// bin/xoch.js's dispatcher can call this in-process with the `config`
// namespace token already stripped, instead of this reading process.argv
// itself and seeing the dispatcher's own argv shape.
function main(argv) {
  const [cmd, arg2, arg3, ...rest] = argv;

  switch (cmd || '') {
    case '':
      runInteractive();
      break;
    case 'show':
      cmdShow();
      break;
    case 'get':
      if (!arg2) {
        usage();
        process.exit(1);
      }
      cmdGet(arg2);
      break;
    case 'set':
      if (!arg2 || !arg3) {
        usage();
        process.exit(1);
      }
      cmdSet(arg2, arg3, rest);
      break;
    case 'budgets':
      runBudgetsInteractive();
      break;
    case '-h':
    case '--help':
      usage();
      break;
    default:
      usage();
      process.exit(1);
  }
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}

export {
  CONFIG_PATH,
  VALID_STORAGE_MODES,
  VALID_COMMENT_MODES,
  VALID_COVERAGE_STRICTNESS,
  VALID_CONVENTIONS_STRICTNESS,
  VALID_GIT_BEHAVIORS,
  DEFAULT_SKILL_BUDGETS,
  FALLBACK_SKILL_BUDGET,
  isValidStorageMode,
  isValidCommentMode,
  isValidCoverageStrictness,
  isValidConventionsStrictness,
  isValidGitBehavior,
  isValidBudgetValue,
  readStorageMode,
  readCommentMode,
  readCoverageStrictness,
  readConventionsStrictness,
  readGitBehavior,
  readTokenBudgets,
  resolvedBudget,
  writeTokenBudget,
  printConfig,
  writeStorageMode,
  writeCommentMode,
  writeCoverageStrictness,
  writeConventionsStrictness,
  writeGitBehavior,
  applyStorageMode,
  storageOptions,
  cmdGet,
  cmdSet,
  cmdShow,
  readLine,
  runInteractive,
  runStorageModeInteractive,
  runCommentModeInteractive,
  runCoverageStrictnessInteractive,
  runGitBehaviorInteractive,
  runBudgetsInteractive,
  usage,
  main,
};
