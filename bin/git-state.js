#!/usr/bin/env node
'use strict';

// Read-only git working state for Xoch checkpoints and diagnostics.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseFlags } = require('./lib/args.js');
const { git } = require('./lib/git.js');
const { prettyGenerate } = require('./lib/ruby-json.js');

function usage() {
  console.log('Usage:');
  console.log('  git-state.js inspect [--root ROOT] [--json]');
}

function inspect(argv) {
  const flags = parseFlags(argv, ['json']);
  const root = flags.root || '.';
  const jsonMode = Boolean(flags.json);

  const check = spawnSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
  if (check.status !== 0) {
    console.error(`Not a git repository: ${root}`);
    process.exit(2);
  }
  const gitDirResult = spawnSync('git', ['-C', root, 'rev-parse', '--absolute-git-dir'], { encoding: 'utf8' });
  const gitDir = gitDirResult.stdout.trim();

  const absoluteRoot = path.resolve(root);
  const branch = git(absoluteRoot, ['branch', '--show-current']);
  const upstream = git(absoluteRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  const ahead = upstream ? parseInt(git(absoluteRoot, ['rev-list', '--count', `${upstream}..HEAD`]), 10) || 0 : 0;
  const porcelain = git(absoluteRoot, ['status', '--porcelain=v1']).split('\n').map((line) => line.trim()).filter(Boolean);
  const conflicts = git(absoluteRoot, ['diff', '--name-only', '--diff-filter=U']).split('\n').map((line) => line.trim()).filter(Boolean);

  const operations = [];
  if (fs.existsSync(path.join(gitDir, 'MERGE_HEAD'))) operations.push('merge');
  if (fs.existsSync(path.join(gitDir, 'CHERRY_PICK_HEAD'))) operations.push('cherry-pick');
  if (fs.existsSync(path.join(gitDir, 'REVERT_HEAD'))) operations.push('revert');
  if (fs.existsSync(path.join(gitDir, 'rebase-merge')) || fs.existsSync(path.join(gitDir, 'rebase-apply'))) operations.push('rebase');

  const result = {
    root: absoluteRoot,
    branch: branch || null,
    upstream: upstream || null,
    dirty: porcelain.length > 0,
    changed_count: porcelain.length,
    changed_entries: porcelain,
    ahead,
    operation: operations.length ? operations.join('+') : null,
    conflicts,
    clean_handoff: porcelain.length === 0 && ahead === 0 && operations.length === 0 && conflicts.length === 0,
  };

  if (jsonMode) {
    console.log(prettyGenerate(result));
  } else {
    console.log(`Branch: ${result.branch || 'detached'}`);
    console.log(`Upstream: ${result.upstream || 'none'}`);
    console.log(`Dirty: ${result.dirty} (${result.changed_count} entries)`);
    console.log(`Ahead: ${result.ahead}`);
    console.log(`Operation: ${result.operation || 'none'}`);
    console.log(`Conflicts: ${result.conflicts.length ? result.conflicts.join(', ') : 'none'}`);
  }
}

function main(argv) {
  const [command, ...rest] = argv;
  if (command === '--help') {
    usage();
    return;
  }
  if (command !== 'inspect') {
    usage();
    process.exit(2);
  }
  inspect(rest);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { inspect, main };
