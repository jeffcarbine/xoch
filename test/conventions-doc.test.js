'use strict';

import assert from 'assert';
import { test, run } from './lib/runner.js';
import { parseConventions, ConventionsParseError } from '../bin/lib/conventions-doc.js';

const SAMPLE = `---
generated: 2026-10-25
base_branch: main
analysis_range: abc123..def456
pr_count: 12
gh_available: true
retired_ids: [CV-003, CV-007]
---

# Conventions

Intro prose is ignored.

## Testing

### CV-015: Tests use the shared runner in test/lib/runner.js
- scope: test/**/*.test.js
- status: confirmed
- confidence: high
- evidence: 7 occurrences across 4 PRs

## General

### CV-001: Prefer early returns over nested conditionals
- status: inferred
- confidence: medium
- evidence: 3 occurrences across 2 PRs

### CV-011: Export main(argv) alongside the CLI entry
- scope: bin/*.js, !bin/lib/**
- status: confirmed
- confidence: high
`;

test('frontmatter fields are read, including the list of retired rule IDs', () => {
  const doc = parseConventions(SAMPLE);
  assert.deepStrictEqual(doc.frontmatter, {
    generated: '2026-10-25',
    base_branch: 'main',
    analysis_range: 'abc123..def456',
    pr_count: 12,
    gh_available: true,
    retired_ids: ['CV-003', 'CV-007'],
  });
});

test('each rule is read with its category, statement, scope, status, confidence, and evidence', () => {
  const doc = parseConventions(SAMPLE);
  assert.deepStrictEqual(doc.rules.map((r) => r.id), ['CV-015', 'CV-001', 'CV-011']);
  assert.deepStrictEqual(doc.rules[0], {
    id: 'CV-015',
    statement: 'Tests use the shared runner in test/lib/runner.js',
    category: 'Testing',
    scope: ['test/**/*.test.js'],
    status: 'confirmed',
    confidence: 'high',
    evidence: '7 occurrences across 4 PRs',
  });
  assert.deepStrictEqual(doc.rules[2].scope, ['bin/*.js', '!bin/lib/**']);
});

test('a rule with no scope line is given the everywhere scope', () => {
  const doc = parseConventions(SAMPLE);
  assert.deepStrictEqual(doc.rules[1].scope, ['**']);
  assert.strictEqual(doc.rules[1].category, 'General');
});

test('a file with no frontmatter still parses its rules', () => {
  const doc = parseConventions('## Naming\n\n### CV-002: Use kebab-case file names\n- status: confirmed\n- confidence: low\n');
  assert.deepStrictEqual(doc.frontmatter, {});
  assert.strictEqual(doc.rules[0].id, 'CV-002');
});

function parseErrorLine(text) {
  try {
    parseConventions(text);
  } catch (e) {
    assert.ok(e instanceof ConventionsParseError);
    return e.line;
  }
  assert.fail('expected a parse error');
  return null;
}

test('a rule heading without a CV ID is rejected with the offending line', () => {
  assert.strictEqual(parseErrorLine('## X\n\n### Use tabs\n'), 3);
});

test('a duplicate rule ID is rejected with the line of the second occurrence', () => {
  const text = '### CV-001: A\n- status: confirmed\n- confidence: high\n### CV-001: B\n- status: confirmed\n- confidence: high\n';
  assert.strictEqual(parseErrorLine(text), 4);
});

test('an invalid status or confidence value is rejected with the offending line', () => {
  assert.strictEqual(parseErrorLine('### CV-001: A\n- status: maybe\n- confidence: high\n'), 2);
  assert.strictEqual(parseErrorLine('### CV-001: A\n- status: confirmed\n- confidence: huge\n'), 3);
});

test('an unknown rule field is rejected with the offending line', () => {
  assert.strictEqual(parseErrorLine('### CV-001: A\n- status: confirmed\n- owner: someone\n'), 3);
});

test('a rule missing its status or confidence is rejected at its heading line', () => {
  assert.strictEqual(parseErrorLine('\n### CV-001: A\n- confidence: high\n'), 2);
  assert.strictEqual(parseErrorLine('### CV-001: A\n- status: confirmed\n'), 1);
});

test('blank lines inside frontmatter are ignored', () => {
  const doc = parseConventions('---\ngenerated: x\n\nbase_branch: main\n---\n');
  assert.deepStrictEqual(doc.frontmatter, { generated: 'x', base_branch: 'main' });
});

test('a bullet under a rule that is not a field is rejected with the offending line', () => {
  assert.strictEqual(parseErrorLine('### CV-001: A\n- status: confirmed\n- just a note\n'), 3);
});

test('unterminated frontmatter is rejected at line 1', () => {
  assert.strictEqual(parseErrorLine('---\ngenerated: x\n'), 1);
});

test('a malformed frontmatter line is rejected with the offending line', () => {
  assert.strictEqual(parseErrorLine('---\nnot a pair\n---\n'), 2);
});

test('a rule that reuses a retired ID is rejected with the offending line', () => {
  assert.strictEqual(parseErrorLine('---\nretired_ids: [CV-001]\n---\n### CV-001: A\n- status: confirmed\n- confidence: high\n'), 4);
});

run();
