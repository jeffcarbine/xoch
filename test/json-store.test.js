'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup } = require('./lib/cli.js');
const { readJson, writeJson, updateJson } = require('../bin/lib/json-store.js');

test('readJson returns {} for a missing file', () => {
  const ctx = scratch();
  try {
    const result = readJson(path.join(ctx.cwd, 'nope.json'));
    assert.deepStrictEqual(result, {});
  } finally {
    cleanup(ctx);
  }
});

test('readJson returns {} for a malformed file rather than throwing', () => {
  const ctx = scratch();
  try {
    const target = path.join(ctx.cwd, 'bad.json');
    fs.writeFileSync(target, '{not valid json');
    const result = readJson(target);
    assert.deepStrictEqual(result, {});
  } finally {
    cleanup(ctx);
  }
});

test('readJson parses a valid file', () => {
  const ctx = scratch();
  try {
    const target = path.join(ctx.cwd, 'good.json');
    fs.writeFileSync(target, '{"a": 1}');
    assert.deepStrictEqual(readJson(target), { a: 1 });
  } finally {
    cleanup(ctx);
  }
});

test('writeJson creates missing parent directories and writes pretty JSON', () => {
  const ctx = scratch();
  try {
    const target = path.join(ctx.cwd, 'nested', 'deep', 'out.json');
    writeJson(target, { a: 1, b: [1, 2] });
    const raw = fs.readFileSync(target, 'utf8');
    assert.strictEqual(raw, `${JSON.stringify({ a: 1, b: [1, 2] }, null, 2)}\n`);
    assert.deepStrictEqual(JSON.parse(raw), { a: 1, b: [1, 2] });
  } finally {
    cleanup(ctx);
  }
});

test('writeJson never leaves a .tmp file behind on success', () => {
  const ctx = scratch();
  try {
    const target = path.join(ctx.cwd, 'atomic.json');
    writeJson(target, { ok: true });
    const entries = fs.readdirSync(ctx.cwd);
    assert.deepStrictEqual(entries, ['atomic.json']);
  } finally {
    cleanup(ctx);
  }
});

test('updateJson uses the updater return value when truthy', () => {
  const ctx = scratch();
  try {
    const target = path.join(ctx.cwd, 'update1.json');
    writeJson(target, { count: 1 });
    const result = updateJson(target, (data) => ({ count: data.count + 1, replaced: true }));
    assert.deepStrictEqual(result, { count: 2, replaced: true });
    assert.deepStrictEqual(readJson(target), { count: 2, replaced: true });
  } finally {
    cleanup(ctx);
  }
});

test('updateJson falls back to the mutated data when the updater returns nothing', () => {
  const ctx = scratch();
  try {
    const target = path.join(ctx.cwd, 'update2.json');
    writeJson(target, { count: 1 });
    const result = updateJson(target, (data) => {
      data.count += 1;
      // intentionally no return -- exercises the `updater(data) || data` fallback
    });
    assert.deepStrictEqual(result, { count: 2 });
    assert.deepStrictEqual(readJson(target), { count: 2 });
  } finally {
    cleanup(ctx);
  }
});

test('updateJson on a missing file starts from an empty object', () => {
  const ctx = scratch();
  try {
    const target = path.join(ctx.cwd, 'update3.json');
    const result = updateJson(target, (data) => {
      data.created = true;
      return data;
    });
    assert.deepStrictEqual(result, { created: true });
  } finally {
    cleanup(ctx);
  }
});

run();
