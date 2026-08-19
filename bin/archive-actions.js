#!/usr/bin/env node
'use strict';

// Safe archive and restore operations for Xoch job and arc folders.

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./lib/args.js');

function usage() {
  console.log('Usage:');
  console.log('  archive-actions.js archive --kind job|arc --id ID [--root ROOT] [--dry-run]');
  console.log('  archive-actions.js restore --kind job|arc [--id ID | --archive PATH] [--root ROOT] [--dry-run]');
}

function today() {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function validId(id) {
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) {
    console.error('A safe --id is required');
    process.exit(1);
  }
}

// Matches archive-actions.sh: checks current.json first, then falls back
// to the legacy current.md pointer format ("**Job ID**: <id>") when
// current.json is absent. A malformed current.json is not caught -- the
// bash original's Ruby JSON.parse also raises uncaught in that case, so
// both crash rather than silently treating it as "not pointing to job".
function pointsToJob(root, id) {
  const jsonPointer = path.join(root, '.xoch', 'work', 'current.json');
  if (fs.existsSync(jsonPointer)) {
    const data = JSON.parse(fs.readFileSync(jsonPointer, 'utf8'));
    return Boolean(data.job && data.job.id === id);
  }
  const markdownPointer = path.join(root, '.xoch', 'work', 'current.md');
  return fs.existsSync(markdownPointer) && fs.readFileSync(markdownPointer, 'utf8').includes(`**Job ID**: ${id}`);
}

function run(argv) {
  const command = argv[0];
  if (command === '--help') {
    usage();
    return;
  }
  if (!command) {
    usage();
    process.exit(2);
  }
  const flags = parseFlags(argv.slice(1), ['dry-run']);
  const kind = flags.kind;
  const id = flags.id || '';
  const archiveArg = flags.archive || '';
  const root = path.resolve(flags.root || '.');
  const dryRun = Boolean(flags['dry-run']);

  if (!['job', 'arc'].includes(kind)) {
    console.error('--kind must be job or arc');
    process.exit(1);
  }
  if (!['archive', 'restore'].includes(command)) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  const plural = kind === 'job' ? 'jobs' : 'arcs';
  const base = path.join(root, '.xoch', 'work', plural);
  const archiveRoot = path.join(base, 'archive');

  if (command === 'archive') {
    validId(id);
    if (kind === 'job' && pointsToJob(root, id)) {
      console.error(`Clear or pause the active job before archiving: ${id}`);
      process.exit(1);
    }
    const source = path.join(base, id);
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      console.error(`Active ${kind} folder not found: ${source}`);
      process.exit(1);
    }
    if (!dryRun) fs.mkdirSync(archiveRoot, { recursive: true });
    const stem = `${id}-archive-${today()}`;
    let destination = path.join(archiveRoot, stem);
    let suffix = 2;
    while (fs.existsSync(destination)) {
      destination = path.join(archiveRoot, `${stem}-${suffix}`);
      suffix += 1;
    }
    console.log(`Archive ${dryRun ? 'plan' : 'move'}: ${source} -> ${destination}`);
    if (!dryRun) fs.renameSync(source, destination);
  } else {
    let source;
    if (archiveArg) {
      source = path.resolve(root, archiveArg);
      const allowed = path.resolve(archiveRoot);
      if (!source.startsWith(`${allowed}${path.sep}`)) {
        console.error(`Archive path is outside ${allowed}: ${source}`);
        process.exit(1);
      }
    } else {
      validId(id);
      const prefix = `${id}-archive-`;
      const candidates = fs.existsSync(archiveRoot)
        ? fs.readdirSync(archiveRoot)
          .filter((name) => name.toLowerCase().startsWith(prefix.toLowerCase()))
          .map((name) => path.join(archiveRoot, name))
          .filter((full) => fs.statSync(full).isDirectory())
        : [];
      if (candidates.length === 0) {
        console.error(`No archive found for ${kind}: ${id}`);
        process.exit(1);
      }
      source = candidates.reduce((newest, candidate) => (
        fs.statSync(candidate).mtimeMs > fs.statSync(newest).mtimeMs ? candidate : newest
      ));
    }
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      console.error(`Archive folder not found: ${source}`);
      process.exit(1);
    }
    const restoredId = id || path.basename(source).replace(/-archive-\d{4}-\d{2}-\d{2}(?:-\d+)?$/, '');
    validId(restoredId);
    const destination = path.join(base, restoredId);
    if (fs.existsSync(destination)) {
      console.error(`Refusing to overwrite active ${kind}: ${destination}`);
      process.exit(1);
    }
    console.log(`Restore ${dryRun ? 'plan' : 'move'}: ${source} -> ${destination}`);
    if (!dryRun) fs.renameSync(source, destination);
  }
}

if (require.main === module) {
  run(process.argv.slice(2));
}

module.exports = { run };
