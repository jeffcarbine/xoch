'use strict';

const assert = require('assert');
const { test, run } = require('./lib/runner.js');
const { prettyGenerate } = require('../bin/lib/ruby-json.js');

test('prettyGenerate renders primitives via plain JSON.stringify', () => {
  assert.strictEqual(prettyGenerate(null), 'null');
  assert.strictEqual(prettyGenerate(42), '42');
  assert.strictEqual(prettyGenerate('str'), '"str"');
  assert.strictEqual(prettyGenerate(true), 'true');
  assert.strictEqual(prettyGenerate(false), 'false');
});

test('prettyGenerate renders an empty array as "[\\n\\n]" (matching Ruby, not JSON.stringify)', () => {
  assert.strictEqual(prettyGenerate([]), '[\n\n]');
});

test('prettyGenerate renders an empty object as "{\\n}" (matching Ruby, not JSON.stringify)', () => {
  assert.strictEqual(prettyGenerate({}), '{\n}');
});

test('prettyGenerate renders a non-empty array with indented items', () => {
  assert.strictEqual(prettyGenerate([1, 2]), '[\n  1,\n  2\n]');
});

test('prettyGenerate renders a non-empty object with indented, quoted keys', () => {
  assert.strictEqual(prettyGenerate({ a: 1 }), '{\n  "a": 1\n}');
});

test('prettyGenerate round-trips nested structures, including nested empty containers', () => {
  // Same fixture verified byte-for-byte against real `ruby -rjson -e
  // JSON.pretty_generate` output during the original phase-1 port.
  const value = { a: [], b: {}, c: [1, 2], d: { x: 1 }, e: null, f: 's"t', g: [{}, []] };
  const rendered = prettyGenerate(value);
  assert.deepStrictEqual(JSON.parse(rendered), value);
  const expected = [
    '{',
    '  "a": [',
    '',
    '  ],',
    '  "b": {',
    '  },',
    '  "c": [',
    '    1,',
    '    2',
    '  ],',
    '  "d": {',
    '    "x": 1',
    '  },',
    '  "e": null,',
    '  "f": "s\\"t",',
    '  "g": [',
    '    {',
    '    },',
    '    [',
    '',
    '    ]',
    '  ]',
    '}',
  ].join('\n');
  assert.strictEqual(rendered, expected);
});

run();
