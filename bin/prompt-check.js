#!/usr/bin/env node
'use strict';

// Validate Xoch helper naming/syntax and prompt rendering in an isolated HOME.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

function usage() {
  console.log(`Usage:
  node prompt-check.js run [--root XOCH_REPO]`);
}

function fail(message, code) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const command = argv[0];
  if (command === '--help') {
    usage();
    process.exit(0);
  }
  if (command !== 'run') {
    usage();
    process.exit(2);
  }

  let root = path.join(__dirname, '..');
  const rest = argv.slice(1);
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--root') {
      root = rest[i + 1];
      i += 1;
    } else if (arg === '-h' || arg === '--help') {
      usage();
      process.exit(0);
    } else {
      process.stderr.write(`Unknown option: ${arg}\n`);
      usage();
      process.exit(2);
    }
  }
  return root;
}

function resolveRoot(root) {
  // path.resolve (not fs.realpathSync) to match bash's `cd "$root" && pwd`,
  // which does not resolve symlinks by default -- e.g. macOS's /var ->
  // /private/var. See install.js/prompt-check.sh's $PWD-vs-cwd note.
  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    // Matches bash's `cd "$root"` failing under `set -e`: the script dies
    // immediately with cd's own error and exit code 1, never reaching the
    // "install.sh not found" check below (that message is only reachable
    // when root exists but lacks install.sh/install.js).
    fail(`cd: ${root}: No such file or directory`, 1);
  }
  if (!fs.existsSync(path.join(resolved, 'install.js'))) {
    fail(`install.js not found: ${resolved}`, 2);
  }
  return resolved;
}

const KEBAB_JS_RE = /^[a-z0-9]+(-[a-z0-9]+)*\.js$/;

function checkHelperNaming(root) {
  const helpersDir = path.join(root, 'bin');
  if (!fs.existsSync(helpersDir)) return;
  for (const name of fs.readdirSync(helpersDir)) {
    const full = path.join(helpersDir, name);
    if (!fs.statSync(full).isFile() || !name.endsWith('.js')) continue;
    if (!KEBAB_JS_RE.test(name)) {
      fail(`Helper filename is not kebab-case: ${name}`, 1);
    }
  }
}

function listJsFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(listJsFilesRecursive(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

function checkSyntax(root) {
  const files = [...listJsFilesRecursive(path.join(root, 'bin')), path.join(root, 'install.js')];
  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    } catch (e) {
      process.exit(e.status || 1);
    }
  }
}

function runInstall(root, tempHome) {
  try {
    execFileSync(process.execPath, [path.join(root, 'install.js')], {
      env: { ...process.env, HOME: tempHome },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  } catch (e) {
    process.exit(e.status || 1);
  }
}

// Matches prompt-check.sh's rg scan: catches both an unresolved
// {{xoch-partial:...}} reference and a stray unsubstituted {{VAR}}
// placeholder left in a rendered prompt -- a broader net than install.js's
// own hasUnresolvedPartial, which only looks for the partial marker.
const UNRESOLVED_MARKER_RE = /\{\{xoch-partial:|\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/;

function scanForUnresolvedMarkers(dir) {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (scanForUnresolvedMarkers(full)) return true;
    } else if (entry.isFile()) {
      if (UNRESOLVED_MARKER_RE.test(fs.readFileSync(full, 'utf8'))) return true;
    }
  }
  return false;
}

function checkClaudeSkill(tempHome) {
  const promptsDir = path.join(tempHome, '.xoch', 'prompts');
  const skillsDir = path.join(tempHome, '.claude', 'skills');
  if (!fs.existsSync(promptsDir)) return;

  for (const name of fs.readdirSync(promptsDir)) {
    const full = path.join(promptsDir, name);
    if (!fs.statSync(full).isFile() || !name.endsWith('.md')) continue;
    const promptName = path.basename(name, '.md');
    const claudeSkill = path.join(skillsDir, `xoch-${promptName}`, 'SKILL.md');
    if (!fs.existsSync(claudeSkill)) {
      fail(`Prompt check failed: missing Claude skill xoch-${promptName}`, 1);
    }
    const content = fs.readFileSync(claudeSkill, 'utf8');
    if (!/^disable-model-invocation: true$/m.test(content)) {
      fail(`Prompt check failed: Claude skill xoch-${promptName} permits model invocation`, 1);
    }
  }
}

function run(argv) {
  const rawRoot = parseArgs(argv);
  const root = resolveRoot(rawRoot);

  checkHelperNaming(root);
  checkSyntax(root);

  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'xoch-prompt-check.'));
  try {
    runInstall(root, tempHome);

    if (scanForUnresolvedMarkers(path.join(tempHome, '.xoch', 'prompts'))) {
      fail('Prompt check failed: unresolved partial or variable', 1);
    }

    checkClaudeSkill(tempHome);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }

  console.log('Xoch prompt and helper checks passed.');
}

if (require.main === module) {
  run(process.argv.slice(2));
}

module.exports = {
  usage,
  parseArgs,
  resolveRoot,
  checkHelperNaming,
  listJsFilesRecursive,
  checkSyntax,
  runInstall,
  scanForUnresolvedMarkers,
  checkClaudeSkill,
  run,
};
