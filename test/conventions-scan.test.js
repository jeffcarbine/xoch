'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { scratch, cleanup } from './lib/cli.js';
import {
  isBotAuthor, isReviewFixSubject, prFromSubject, tokenSwap, substitutionsFromDiff, aggregateSubstitutions, detectLinters,
} from '../bin/lib/conventions-scan.js';

test('bot authors are recognized by common bot names and emails', () => {
  assert.ok(isBotAuthor('dependabot[bot]', '49699333+dependabot[bot]@users.noreply.github.com'));
  assert.ok(isBotAuthor('renovate', 'bot@renovateapp.com'));
  assert.ok(isBotAuthor('github-actions', 'actions@github.com'));
  assert.ok(!isBotAuthor('Ada Lovelace', 'ada@example.com'));
});

test('commit subjects that read like review follow-ups are recognized', () => {
  for (const subject of ['fix nits', 'Address review feedback', 'addressed comments', 'lint', 'Rename helper', 'fixup! Add parser', 'typo', 'style tweaks', 'cleanup']) {
    assert.ok(isReviewFixSubject(subject), subject);
  }
  assert.ok(!isReviewFixSubject('Add rate limiting to webhooks'));
  assert.ok(!isReviewFixSubject('Unlint-able legacy module'));
});

test('a squash-merge subject yields its PR number', () => {
  assert.strictEqual(prFromSubject('Tighten the QA prompts (#42)'), 42);
  assert.strictEqual(prFromSubject('Tighten the QA prompts'), null);
});

test('a removed and added line that differ by exactly one token are a swap', () => {
  assert.deepStrictEqual(tokenSwap('var count = 0;', 'const count = 0;'), { from: 'var', to: 'const' });
  assert.deepStrictEqual(tokenSwap('  fs.writeFileSync(p, s);', '  writeJson(p, s);'), null);
  assert.deepStrictEqual(tokenSwap('writeFileSync(p, s);', 'writeJson(p, s);'), { from: 'writeFileSync', to: 'writeJson' });
  assert.strictEqual(tokenSwap('a = 1;', 'a = 1;'), null);
  assert.strictEqual(tokenSwap('a = b + c;', 'x = b + y;'), null);
});

test('swaps are read from a zero-context diff, pairing lines within each hunk and file', () => {
  const diff = [
    'diff --git a/src/a.js b/src/a.js',
    '--- a/src/a.js',
    '+++ b/src/a.js',
    '@@ -1,2 +1,2 @@',
    '-var a = 1;',
    '-var b = 2;',
    '+const a = 1;',
    '+const b = 2;',
    '@@ -9 +9,2 @@',
    '-let z = 3;',
    '+let z = 3;',
    '+let extra = 4;',
    'diff --git a/src/b.js b/src/b.js',
    '--- a/src/b.js',
    '+++ b/src/b.js',
    '@@ -4 +4 @@',
    '-return isOk;',
    '+return isValid;',
    'diff --git a/gone.js b/gone.js',
    '--- a/gone.js',
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '-var q = 1;',
  ].join('\n');
  assert.deepStrictEqual(substitutionsFromDiff(diff), [
    { from: 'var', to: 'const', file: 'src/a.js' },
    { from: 'var', to: 'const', file: 'src/a.js' },
    { from: 'isOk', to: 'isValid', file: 'src/b.js' },
  ]);
});

test('swaps are reported only when they meet both the occurrence and PR thresholds', () => {
  const entries = [
    { from: 'var', to: 'const', file: 'a.js', unit: 'pr:1' },
    { from: 'var', to: 'const', file: 'b.js', unit: 'pr:1' },
    { from: 'var', to: 'const', file: 'a.js', unit: 'pr:2' },
    { from: 'isOk', to: 'isValid', file: 'c.js', unit: 'pr:3' },
    { from: 'isOk', to: 'isValid', file: 'c.js', unit: 'pr:4' },
  ];
  assert.deepStrictEqual(aggregateSubstitutions(entries, { minOccurrences: 3, minPrs: 2 }), [
    { from: 'var', to: 'const', occurrences: 3, prs: ['pr:1', 'pr:2'], files: ['a.js', 'b.js'] },
  ]);
  assert.deepStrictEqual(aggregateSubstitutions(entries, { minOccurrences: 3, minPrs: 3 }), []);
  assert.deepStrictEqual(aggregateSubstitutions(entries, { minOccurrences: 2, minPrs: 2 }).map((s) => s.from), ['var', 'isOk']);
});

test('linter and formatter configs at the repo root are listed, including package.json and pyproject.toml settings', () => {
  const ctx = scratch();
  try {
    const files = {
      '.eslintrc.json': '{}',
      '.prettierrc': '{}',
      'biome.json': '{}',
      '.editorconfig': 'root = true',
      '.stylelintrc': '{}',
      'ruff.toml': '',
      '.rubocop.yml': '',
      '.golangci.yml': '',
      'rustfmt.toml': '',
      '.clang-format': '',
      'pyproject.toml': '[tool.ruff]\nline-length = 100\n[tool.black]\n',
      'package.json': JSON.stringify({ eslintConfig: {}, prettier: {} }),
      'README.md': '',
    };
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(ctx.cwd, name), text);
    assert.deepStrictEqual(detectLinters(ctx.cwd), [
      { tool: 'clang-format', file: '.clang-format' },
      { tool: 'editorconfig', file: '.editorconfig' },
      { tool: 'eslint', file: '.eslintrc.json' },
      { tool: 'golangci-lint', file: '.golangci.yml' },
      { tool: 'prettier', file: '.prettierrc' },
      { tool: 'rubocop', file: '.rubocop.yml' },
      { tool: 'stylelint', file: '.stylelintrc' },
      { tool: 'biome', file: 'biome.json' },
      { tool: 'eslint', file: 'package.json' },
      { tool: 'prettier', file: 'package.json' },
      { tool: 'black', file: 'pyproject.toml' },
      { tool: 'ruff', file: 'pyproject.toml' },
      { tool: 'ruff', file: 'ruff.toml' },
      { tool: 'rustfmt', file: 'rustfmt.toml' },
    ]);
  } finally {
    cleanup(ctx);
  }
});

test('an unreadable package.json and a pyproject.toml without lint settings add nothing', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'package.json'), '{not json');
    fs.writeFileSync(path.join(ctx.cwd, 'pyproject.toml'), '[project]\nname = "x"\n');
    assert.deepStrictEqual(detectLinters(ctx.cwd), []);
  } finally {
    cleanup(ctx);
  }
});

run();
