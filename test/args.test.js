'use strict';

import assert from 'assert';
import { test, run } from './lib/runner.js';
import { parseFlags } from '../bin/lib/args.js';

test('parseFlags reads a boolean flag as true', () => {
  const flags = parseFlags(['--json'], ['json']);
  assert.deepStrictEqual(flags, { json: true });
});

test('parseFlags reads a value flag by consuming the next argv entry', () => {
  const flags = parseFlags(['--job', 'my-job'], []);
  assert.deepStrictEqual(flags, { job: 'my-job' });
});

test('parseFlags ignores bare positional arguments', () => {
  const flags = parseFlags(['positional', '--name', 'value'], []);
  assert.deepStrictEqual(flags, { name: 'value' });
});

test('parseFlags defaults booleanFlags to empty when omitted', () => {
  const flags = parseFlags(['--x', 'y']);
  assert.deepStrictEqual(flags, { x: 'y' });
});

test('parseFlags returns an empty object for empty argv', () => {
  assert.deepStrictEqual(parseFlags([], []), {});
});

test('parseFlags handles a mix of boolean and value flags', () => {
  const flags = parseFlags(['--dry-run', '--root', '/tmp/x', '--json'], ['dry-run', 'json']);
  assert.deepStrictEqual(flags, { 'dry-run': true, root: '/tmp/x', json: true });
});

run();
