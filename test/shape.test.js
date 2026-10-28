'use strict';

import assert from 'assert';
import { test, run } from './lib/runner.js';
import { ShapeError, checkField } from '../bin/lib/shape.js';

test('a shape error names itself so callers can tell it apart from other failures', () => {
  const err = new ShapeError('bad');
  assert.ok(err instanceof Error);
  assert.strictEqual(err.name, 'ShapeError');
  assert.strictEqual(err.message, 'bad');
});

test('each field kind accepts exactly the values it describes', () => {
  const ok = [
    ['string', 'x'], ['string?', null], ['string?', 'x'], ['int', 0], ['int?', null], ['int?', 3],
    ['strings', []], ['strings', ['a']], ['object?', null], ['object?', {}],
  ];
  for (const [kind, value] of ok) assert.doesNotThrow(() => checkField('L', 'f', value, kind), `${kind} ${JSON.stringify(value)}`);
  const bad = [
    ['string', null], ['string?', 1], ['int', null], ['int', 1.5], ['int?', '1'],
    ['strings', 'a'], ['strings', [1]], ['object?', []], ['object?', 'x'],
  ];
  for (const [kind, value] of bad) assert.throws(() => checkField('L', 'f', value, kind), /L: f must be/, `${kind} ${JSON.stringify(value)}`);
});

test('a custom field check is used as-is, and an unknown kind is a programming error', () => {
  assert.doesNotThrow(() => checkField('L', 'f', 5, (v) => v === 5));
  assert.throws(() => checkField('L', 'f', 4, (v) => v === 5), /L: f is invalid/);
  assert.throws(() => checkField('L', 'f', 4, 'float'), /unknown field kind/);
});

run();
