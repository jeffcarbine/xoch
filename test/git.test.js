'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup } = require('./lib/cli.js');
const { git } = require('../bin/lib/git.js');

test('git returns trimmed non-empty stdout on success', () => {
  const ctx = scratch();
  try {
    execFileSync('git', ['-C', ctx.cwd, 'init', '-q']);
    execFileSync('git', ['-C', ctx.cwd, 'checkout', '-q', '-b', 'main']);
    const branch = git(ctx.cwd, ['branch', '--show-current']);
    assert.strictEqual(branch, 'main');
  } finally {
    cleanup(ctx);
  }
});

test('git returns empty string on success with empty stdout', () => {
  const ctx = scratch();
  try {
    execFileSync('git', ['-C', ctx.cwd, 'init', '-q']);
    const status = git(ctx.cwd, ['status', '--porcelain=v1']);
    assert.strictEqual(status, '');
  } finally {
    cleanup(ctx);
  }
});

test('git returns empty string when the command fails (non-git directory)', () => {
  const ctx = scratch();
  try {
    const result = git(ctx.cwd, ['rev-parse', '--is-inside-work-tree']);
    assert.strictEqual(result, '');
  } finally {
    cleanup(ctx);
  }
});

test('git returns empty string for an unknown git subcommand', () => {
  const ctx = scratch();
  try {
    execFileSync('git', ['-C', ctx.cwd, 'init', '-q']);
    const result = git(ctx.cwd, ['totally-not-a-real-subcommand']);
    assert.strictEqual(result, '');
  } finally {
    cleanup(ctx);
  }
});

run();
