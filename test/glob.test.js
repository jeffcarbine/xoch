'use strict';

import assert from 'assert';
import { test, run } from './lib/runner.js';
import { globToRegExp, matchesGlob, inScope } from '../bin/lib/glob.js';

test('a single star matches within one folder but not across folders', () => {
  assert.ok(matchesGlob('bin/xoch.js', 'bin/*.js'));
  assert.ok(!matchesGlob('bin/lib/git.js', 'bin/*.js'));
  assert.ok(matchesGlob('README.md', '*.md'));
  assert.ok(!matchesGlob('prompts/do.md', '*.md'));
});

test('a double star matches any number of folders, including none', () => {
  assert.ok(matchesGlob('prompts/do.md', 'prompts/**/*.md'));
  assert.ok(matchesGlob('prompts/core/partials/x.md', 'prompts/**/*.md'));
  assert.ok(matchesGlob('a/b/c/test.js', '**/test.js'));
  assert.ok(matchesGlob('test.js', '**/test.js'));
  assert.ok(matchesGlob('bin/lib/git.js', 'bin/**'));
  assert.ok(matchesGlob('anything/at/all.txt', '**'));
  assert.ok(!matchesGlob('src/prompts/do.md', 'prompts/**/*.md'));
});

test('a question mark matches exactly one character, never a slash', () => {
  assert.ok(matchesGlob('v1.js', 'v?.js'));
  assert.ok(!matchesGlob('v10.js', 'v?.js'));
  assert.ok(!matchesGlob('v/.js', 'v?.js'));
});

test('stars match dotfiles, and regex characters in a pattern are taken literally', () => {
  assert.ok(matchesGlob('.github/workflows/ci.yml', '**/*.yml'));
  assert.ok(matchesGlob('.eslintrc', '*'));
  assert.ok(matchesGlob('a+b(1).js', 'a+b(1).js'));
  assert.ok(!matchesGlob('aab1.js', 'a+b(1).js'));
  assert.ok(globToRegExp('x.js').test('x.js'));
});

test('a file matching an exclusion pattern is out of scope even when a positive pattern matches', () => {
  const scope = ['bin/**/*.js', '!bin/lib/**'];
  assert.ok(inScope('bin/xoch.js', scope));
  assert.ok(!inScope('bin/lib/git.js', scope));
  assert.ok(!inScope('test/x.test.js', scope));
});

test('a rule with no scope, or an empty one, applies to every file', () => {
  assert.ok(inScope('any/file.txt', undefined));
  assert.ok(inScope('any/file.txt', []));
});

test('a scope made only of exclusions means everything except those files', () => {
  assert.ok(inScope('bin/xoch.js', ['!**/*.md']));
  assert.ok(!inScope('README.md', ['!**/*.md']));
});

run();
