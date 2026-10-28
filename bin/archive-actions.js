#!/usr/bin/env node
'use strict';

// Safe archive and restore operations for Xoch job and arc folders.

import fs from 'fs';
import path from 'path';
import { isMainModule } from './lib/is-main.js';
import { parseFlags } from './lib/args.js';
import { storageRoot } from './lib/storage-root.js';

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

// True when current.json points at this job. A malformed current.json is
// not caught, so it crashes rather than silently treating the job as not
// active.
function pointsToJob(root, id) {
  const jsonPointer = path.join(storageRoot(root), 'work', 'current.json');
  if (!fs.existsSync(jsonPointer)) return false;
  const data = JSON.parse(fs.readFileSync(jsonPointer, 'utf8'));
  return Boolean(data.job && data.job.id === id);
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
  const base = path.join(storageRoot(root), 'work', plural);
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

if (isMainModule(import.meta.url)) {
  run(process.argv.slice(2));
}

export { run };
