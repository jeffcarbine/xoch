#!/usr/bin/env node
'use strict';

// Detect source drift without assuming a fixed README packet schema.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { parseFlags } = require('./lib/args.js');
const { prettyGenerate } = require('./lib/ruby-json.js');

const EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.rb', '.py', '.php', '.go', '.rs', '.java',
  '.kt', '.kts', '.swift', '.cs', '.c', '.h', '.cpp', '.hpp', '.sh', '.bash', '.zsh', '.fish',
  '.scss', '.sass', '.css', '.html', '.vue', '.svelte', '.sql', '.graphql', '.gql', '.toml',
  '.yaml', '.yml',
]);
const SPECIAL_FILES = new Set([
  'package.json', 'composer.json', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'pyproject.toml',
]);
const EXCLUDED_PREFIXES = ['.xoch/', '.git/', 'node_modules/', 'vendor/', 'dist/', 'build/', 'coverage/'];

function usage() {
  console.log('Usage:');
  console.log('  docs-drift.js baseline [--root ROOT] [--baseline FILE]');
  console.log('  docs-drift.js check [--root ROOT] [--baseline FILE] [--since REF] [--json]');
  console.log('');
  console.log('The helper reports changed source paths. Xoch or the engineer decides whether each');
  console.log('signal belongs in a root README packet, a nested README, or no documentation.');
}

function sourceLike(relativePath) {
  const normalized = relativePath.replace(/^\.\//, '');
  if (EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  return SPECIAL_FILES.has(path.basename(normalized)) || EXTENSIONS.has(path.extname(normalized).toLowerCase());
}

function trackedFiles(root) {
  const result = spawnSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' });
  let paths;
  if (result.status === 0) {
    paths = (result.stdout || '').split('\n').map((line) => line.trim()).filter(Boolean);
  } else {
    paths = walk(root).map((full) => path.relative(root, full));
  }
  return [...new Set(paths.filter(sourceLike))].sort();
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function hashFile(fullPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
}

function hashes(root) {
  const result = {};
  for (const relativePath of trackedFiles(root)) {
    const full = path.join(root, relativePath);
    result[relativePath] = fs.existsSync(full) ? hashFile(full) : null;
  }
  return result;
}

function ensureRootExists(root) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Project root not found: ${root}`);
    process.exit(1);
  }
}

// Matches Ruby's Time.now.strftime("%Y-%m-%dT%H:%M:%S%z"): local time,
// no milliseconds, numeric UTC offset with no colon (e.g. "-0600"), not
// Date#toISOString's UTC "...Z" format.
function localTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offH = pad(Math.floor(absOffset / 60));
  const offM = pad(absOffset % 60);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offH}${offM}`;
}

function baseline(argv) {
  const flags = parseFlags(argv, []);
  const root = path.resolve(flags.root || '.');
  const baselinePath = path.resolve(root, flags.baseline || '.xoch/docs/drift-baseline.json');
  ensureRootExists(root);

  const current = hashes(root);
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, `${prettyGenerate({ generated_at: localTimestamp(), files: current })}\n`);
  console.log(`Documentation drift baseline written: ${baselinePath} (${Object.keys(current).length} source files)`);
}

function check(argv) {
  const flags = parseFlags(argv, ['json']);
  const root = path.resolve(flags.root || '.');
  const baselinePath = path.resolve(root, flags.baseline || '.xoch/docs/drift-baseline.json');
  const since = flags.since || '';
  const jsonMode = Boolean(flags.json);
  ensureRootExists(root);

  let signals;
  if (since) {
    const result = spawnSync('git', ['-C', root, 'diff', '--name-only', `${since}...HEAD`], { encoding: 'utf8' });
    if (result.status !== 0) {
      console.error(`Unable to compare git ref: ${since}`);
      process.exit(1);
    }
    signals = [...new Set((result.stdout || '').split('\n').map((line) => line.trim()).filter(Boolean).filter(sourceLike))].sort();
  } else {
    if (!fs.existsSync(baselinePath)) {
      console.error(`Drift baseline not found: ${baselinePath}`);
      process.exit(1);
    }
    const previous = JSON.parse(fs.readFileSync(baselinePath, 'utf8')).files || {};
    const current = hashes(root);
    const allPaths = new Set([...Object.keys(previous), ...Object.keys(current)]);
    signals = [...allPaths].filter((p) => previous[p] !== current[p]).sort();
  }

  const result = {
    root,
    baseline: since ? null : baselinePath,
    since: since || null,
    drift: signals.length > 0,
    signals,
  };

  if (jsonMode) {
    console.log(prettyGenerate(result));
  } else if (signals.length === 0) {
    console.log('No documentation drift signals.');
  } else {
    console.log('Documentation drift signals:');
    for (const p of signals) console.log(`- ${p}`);
  }
  process.exitCode = signals.length === 0 ? 0 : 1;
}

function main(argv) {
  const [command, ...rest] = argv;
  if (command === '--help') {
    usage();
    return;
  }
  if (command === 'baseline') {
    baseline(rest);
  } else if (command === 'check') {
    check(rest);
  } else {
    usage();
    process.exit(2);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { baseline, check, main };
