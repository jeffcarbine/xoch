#!/usr/bin/env node
'use strict';

// Xoch Context Tracker
// A self-reported per-job ledger: the agent calls `record` after reading a
// file, then `check` before rereading it, to avoid rereading something it
// already has current content for. This can't inspect the model's actual
// context window -- it only compares a file's current content hash against
// whatever was last recorded, so it's only as reliable as the calling
// agent's discipline in keeping it updated.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFlags } = require('./lib/args.js');
const { readJson, updateJson } = require('./lib/json-store.js');

function usage() {
  console.log('Usage:');
  console.log('  context-tracker.js check --file PATH --job ID [--root ROOT] [--json]');
  console.log('  context-tracker.js record --file PATH --job ID [--root ROOT] [--json]');
}

function computeHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ledgerPath(root, job) {
  return path.join(root, '.xoch', 'work', 'jobs', job, 'context-ledger.json');
}

function requireJobDir(root, job) {
  const jobDir = path.join(root, '.xoch', 'work', 'jobs', job);
  if (!fs.existsSync(jobDir) || !fs.statSync(jobDir).isDirectory()) {
    console.error(`Job folder not found: ${jobDir}`);
    process.exit(1);
  }
}

function requireFileAndJob(flags) {
  if (!flags.file) {
    console.error('--file is required');
    process.exit(2);
  }
  if (!flags.job) {
    console.error('--job is required');
    process.exit(2);
  }
}

function runCheck(argv) {
  const flags = parseFlags(argv, ['json']);
  requireFileAndJob(flags);
  const root = path.resolve(flags.root || '.');
  requireJobDir(root, flags.job);

  const ledger = readJson(ledgerPath(root, flags.job));
  const entry = (ledger.files && ledger.files[flags.file]) || null;

  let status;
  if (!entry) {
    status = 'unknown';
  } else if (!fs.existsSync(flags.file) || !fs.statSync(flags.file).isFile()) {
    status = 'stale';
  } else {
    status = computeHash(flags.file) === entry.hash ? 'fresh' : 'stale';
  }

  if (flags.json) {
    console.log(JSON.stringify({ file: flags.file, status, recorded: entry }));
  } else {
    console.log(status);
  }
  process.exitCode = 0;
}

function runRecord(argv) {
  const flags = parseFlags(argv, ['json']);
  requireFileAndJob(flags);
  const root = path.resolve(flags.root || '.');
  requireJobDir(root, flags.job);

  if (!fs.existsSync(flags.file) || !fs.statSync(flags.file).isFile()) {
    console.error(`File not found: ${flags.file}`);
    process.exit(1);
  }

  const stat = fs.statSync(flags.file);
  const entry = {
    hash: computeHash(flags.file),
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    recordedAt: new Date().toISOString(),
  };

  updateJson(ledgerPath(root, flags.job), (data) => {
    const next = data.files ? data : { version: 1, files: {} };
    next.files[flags.file] = entry;
    return next;
  });

  if (flags.json) {
    console.log(JSON.stringify({ file: flags.file, recorded: true, ...entry }));
  } else {
    console.log(`Recorded ${flags.file} (as of ${entry.recordedAt})`);
  }
  process.exitCode = 0;
}

function main(argv) {
  const command = argv[0];
  if (command === '--help') {
    usage();
    return;
  }
  if (command === 'check') {
    runCheck(argv.slice(1));
    return;
  }
  if (command === 'record') {
    runRecord(argv.slice(1));
    return;
  }
  usage();
  process.exit(2);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { computeHash, runCheck, runRecord, main };
