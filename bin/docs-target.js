#!/usr/bin/env node
'use strict';

// Resolve a changed path to the nearest durable documentation boundary.

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./lib/args.js');

function usage() {
  console.log('Usage:');
  console.log('  docs-target.js resolve --path PATH [--root ROOT] [--manifest FILE] [--json]');
}

function resolve(argv) {
  const flags = parseFlags(argv, ['json']);
  const root = path.resolve(flags.root || '.');
  const inputPath = flags.path;
  const manifest = flags.manifest || '.xoch/docs/readme-packets.json';
  const jsonMode = Boolean(flags.json);

  if (!inputPath) {
    console.error('--path is required');
    process.exit(2);
  }

  const target = path.resolve(root, inputPath);
  if (target !== root && !target.startsWith(root + path.sep)) {
    console.error(`Path escapes project root: ${inputPath}`);
    process.exit(1);
  }

  const isDir = fs.existsSync(target) && fs.statSync(target).isDirectory();
  const directory = isDir ? target : path.dirname(target);

  let readme = null;
  let cursor = directory;
  for (;;) {
    const candidate = path.join(cursor, 'README.md');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile() && cursor !== root) {
      readme = candidate;
      break;
    }
    if (cursor === root) break;
    const parent = path.dirname(cursor);
    if (parent === cursor || !parent.startsWith(root)) break;
    cursor = parent;
  }

  const manifestPath = path.resolve(root, manifest);
  const rootPrefix = `${root}${path.sep}`;
  let result;
  if (readme) {
    result = {
      path: inputPath,
      scope: 'feature',
      target: readme.startsWith(rootPrefix) ? readme.slice(rootPrefix.length) : readme,
      reason: 'nearest nested README',
    };
  } else {
    const manifestExists = fs.existsSync(manifestPath) && fs.statSync(manifestPath).isFile();
    result = {
      path: inputPath,
      scope: 'root',
      target: manifestExists ? (manifestPath.startsWith(rootPrefix) ? manifestPath.slice(rootPrefix.length) : manifestPath) : 'README.md',
      reason: manifestExists ? 'route through approved root packet manifest' : 'no nested README or packet manifest found',
    };
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Scope: ${result.scope}`);
    console.log(`Target: ${result.target}`);
    console.log(`Reason: ${result.reason}`);
  }
}

function main(argv) {
  const [command, ...rest] = argv;
  if (command === '--help') {
    usage();
    return;
  }
  if (command !== 'resolve') {
    usage();
    process.exit(2);
  }
  resolve(rest);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { resolve, main };
