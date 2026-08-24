#!/usr/bin/env node
'use strict';

// Xoch Config
// Sets Xoch configuration values (currently: storage.mode). Similar to
// install.js in style, but for engineer-facing config, not installation.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { readJson, updateJson } = require('./bin/lib/json-store');

const CONFIG_PATH = path.join(os.homedir(), '.xoch', 'config.json');
const VALID_STORAGE_MODES = ['in-repo', 'centralized'];

// Kept in sync by hand with bin/token-estimator.js's (and install.js's)
// copy of this table -- the installed runtime can't require this
// root-level file, so it's duplicated rather than shared.
const DEFAULT_SKILL_BUDGETS = { spec: 5000, plan: 7000 };
const FALLBACK_SKILL_BUDGET = 5000;

const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const RED = '\x1b[0;31m';
const NC = '\x1b[0m';

function isValidStorageMode(value) {
  return VALID_STORAGE_MODES.includes(value);
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
  return isValidStorageMode(mode) ? mode : 'in-repo';
}

function printConfig() {
  const data = readJson(CONFIG_PATH);
  const mode = readStorageMode();
  data.version = data.version || 1;
  data.storage = data.storage || {};
  data.storage.mode = mode;
  data.tokenBudgets = readTokenBudgets();
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

function printMigrationWarning() {
  console.log(
    `${YELLOW}Note: switching storage.mode does not migrate existing job/arc data between `
      + `.xoch/work/ (in-repo) and ~/.xoch/projects/<slug>/work/ (centralized). Move files manually if needed.${NC}`,
  );
}

function cmdGet(key) {
  if (key === 'storage.mode') {
    console.log(readStorageMode());
    return;
  }
  if (key.startsWith('tokenBudgets.')) {
    console.log(resolvedBudget(key.slice('tokenBudgets.'.length)));
    return;
  }
  process.stderr.write(`${RED}Error: unknown config key: ${key}${NC}\n`);
  process.exit(1);
}

function cmdSet(key, value) {
  if (key === 'storage.mode') {
    if (!isValidStorageMode(value)) {
      process.stderr.write(`${RED}Error: invalid storage.mode value '${value}'. Expected one of: ${VALID_STORAGE_MODES.join(' ')}${NC}\n`);
      process.exit(1);
    }
    writeStorageMode(value);
    console.log(`${GREEN}✓${NC} storage.mode set to ${value}`);
    printMigrationWarning();
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

function runInteractive() {
  console.log('Xoch Config');
  console.log('===========');
  console.log('');

  const current = readStorageMode();
  console.log(`Current storage.mode: ${current}`);
  console.log('');
  console.log('Choose storage mode:');
  console.log('  1) in-repo — job/arc state lives in .xoch/work/ inside each repo (default)');
  console.log('  2) centralized — job/arc state lives under ~/.xoch/projects/<slug>/work/');
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

  writeStorageMode(target);
  console.log(`${GREEN}✓${NC} storage.mode set to ${target}`);
  printMigrationWarning();
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
    console.log('');
  }
}

function usage() {
  console.log(`Usage:
  node config.js                          Interactive mode
  node config.js show                     Print resolved config
  node config.js get storage.mode         Print current storage.mode
  node config.js set storage.mode VALUE   Set storage.mode (in-repo|centralized)
  node config.js get tokenBudgets.SKILL       Print SKILL's resolved read budget
  node config.js set tokenBudgets.SKILL VALUE Set SKILL's read budget (positive integer)
  node config.js budgets                      Interactively review/update token budgets`);
}

function main() {
  const args = process.argv.slice(2);
  const [cmd, arg2, arg3] = args;

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
      cmdSet(arg2, arg3);
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

if (require.main === module) {
  main();
}

module.exports = {
  CONFIG_PATH,
  VALID_STORAGE_MODES,
  DEFAULT_SKILL_BUDGETS,
  FALLBACK_SKILL_BUDGET,
  isValidStorageMode,
  isValidBudgetValue,
  readStorageMode,
  readTokenBudgets,
  resolvedBudget,
  writeTokenBudget,
  printConfig,
  writeStorageMode,
  printMigrationWarning,
  cmdGet,
  cmdSet,
  cmdShow,
  readLine,
  runInteractive,
  runBudgetsInteractive,
  usage,
  main,
};
