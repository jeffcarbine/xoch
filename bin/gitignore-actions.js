#!/usr/bin/env node
'use strict';

// Maintain explicit Xoch ignore rules without hiding shareable docs by accident.

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./lib/args.js');

function usage() {
  console.log('Usage:');
  console.log('  gitignore-actions.js ensure [--root ROOT] [--mode shared-docs|local-all] [--repair] [--dry-run]');
}

const BROAD_RULES = new Set(['.xoch/', '/.xoch/', '.xoch', '/.xoch']);

function ensure(argv) {
  const flags = parseFlags(argv, ['repair', 'dry-run']);
  const root = path.resolve(flags.root || '.');
  const mode = flags.mode || 'shared-docs';
  const repair = Boolean(flags.repair);
  const dryRun = Boolean(flags['dry-run']);

  if (!['shared-docs', 'local-all'].includes(mode)) {
    console.error('--mode must be shared-docs or local-all');
    process.exit(1);
  }

  const gitignorePath = path.join(root, '.gitignore');
  const text = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  let lines = text.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  const broadIndexes = [];
  lines.forEach((line, index) => {
    if (BROAD_RULES.has(line.trim())) broadIndexes.push(index);
  });

  if (mode === 'shared-docs' && broadIndexes.length && !repair) {
    console.error('A broad .xoch ignore rule hides docs and glossaries. Rerun with --repair to replace it safely.');
    process.exit(1);
  }

  if (repair) {
    lines = lines.filter((_, index) => !broadIndexes.includes(index));
  }

  const block = mode === 'local-all'
    ? ['# Xoch local state and documentation', '/.xoch/']
    : [
      '# Xoch local workflow state; share project docs and glossaries',
      '/.xoch/*',
      '!/.xoch/docs/',
      '!/.xoch/glossaries/',
    ];

  const missing = block.filter((line) => !lines.includes(line));
  if (missing.length === 0) {
    console.log(`Xoch gitignore rules already current: ${gitignorePath}`);
    return;
  }

  if (lines.length && lines[lines.length - 1] !== '') lines.push('');
  lines.push(...missing);
  const rendered = `${lines.join('\n').replace(/\n*$/, '')}\n`;

  if (dryRun) {
    process.stdout.write(rendered);
  } else {
    fs.writeFileSync(gitignorePath, rendered);
    console.log(`Xoch gitignore rules updated: ${gitignorePath}`);
  }
}

function main(argv) {
  const [command, ...rest] = argv;
  if (command === '--help') {
    usage();
    return;
  }
  if (command !== 'ensure') {
    usage();
    process.exit(2);
  }
  ensure(rest);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { ensure, main };
