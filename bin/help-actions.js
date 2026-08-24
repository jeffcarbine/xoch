#!/usr/bin/env node
'use strict';

// Xoch Help
// Lists every installed Xoch command with its description, read directly
// from each prompt file's own frontmatter -- so this list can't drift out
// of date the way a hand-maintained one would.

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./lib/args.js');

function usage() {
  console.log('Usage:');
  console.log('  help-actions.js list [--root ROOT] [--json]');
}

function frontmatterValue(text, key) {
  const line = text.split('\n').find((l) => l.startsWith(`${key}:`));
  return line ? line.slice(key.length + 1).trim() : '';
}

function listCommands(promptsDir) {
  const entries = fs.readdirSync(promptsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .filter((entry) => entry.name !== 'README.md');

  const commands = entries.map((entry) => {
    const text = fs.readFileSync(path.join(promptsDir, entry.name), 'utf8');
    const name = frontmatterValue(text, 'name') || path.basename(entry.name, '.md');
    const description = frontmatterValue(text, 'description');
    return { name, description, file: entry.name };
  });

  commands.sort((a, b) => a.name.localeCompare(b.name));
  return commands;
}

function runList(argv) {
  const flags = parseFlags(argv, ['json']);
  const root = path.resolve(flags.root || path.join(__dirname, '..'));
  const promptsDir = path.join(root, 'prompts');

  if (!fs.existsSync(promptsDir) || !fs.statSync(promptsDir).isDirectory()) {
    console.error(`Prompts directory not found: ${promptsDir}`);
    process.exit(1);
  }

  const commands = listCommands(promptsDir);

  if (flags.json) {
    console.log(JSON.stringify(commands));
  } else {
    for (const command of commands) {
      console.log(`${command.name} - ${command.description}`);
    }
  }
}

function main(argv) {
  const command = argv[0];
  if (command === '--help') {
    usage();
    return;
  }
  if (command === 'list') {
    runList(argv.slice(1));
    return;
  }
  usage();
  process.exit(2);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { listCommands, runList, main };
