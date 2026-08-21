'use strict';

const assert = require('assert');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'generate-job-id.js');

test('--id cleans a title into a lowercase hyphenated slug', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--id', '  My Cool--Job!! '], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'my-cool-job');
  } finally {
    cleanup(ctx);
  }
});

test('--id with an empty value falls through to auto-generate', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--id', ''], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout.trim(), /^proj-\d{8}-\d{4}-[a-z0-9]{4}$/);
  } finally {
    cleanup(ctx);
  }
});

test('no arguments auto-generates a project-name-based id', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, [], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout.trim(), /^proj-\d{8}-\d{4}-[a-z0-9]{4}$/);
  } finally {
    cleanup(ctx);
  }
});

test('a bare positional argument is ignored and still auto-generates', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout.trim(), /^proj-\d{8}-\d{4}-[a-z0-9]{4}$/);
  } finally {
    cleanup(ctx);
  }
});

test('--help prints usage instead of generating an id', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^Usage: generate-job-id\.js/);
  } finally {
    cleanup(ctx);
  }
});

run();
