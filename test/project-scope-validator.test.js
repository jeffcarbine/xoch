'use strict';

const assert = require('assert');
const { test, run } = require('./lib/runner.js');
const { scopeErrors } = require('../bin/lib/project-scope-validator.js');

// A message table that just echoes which check fired, so assertions can
// check for a specific error by name without depending on wording.
const messages = {
  version: () => 'version',
  jobId: () => 'jobId',
  mode: () => 'mode',
  tooFewProjects: () => 'tooFewProjects',
  notObject: (i) => `notObject:${i}`,
  nameRequired: (i) => `nameRequired:${i}`,
  duplicateName: (name) => `duplicateName:${name}`,
  roleInvalid: (i) => `roleInvalid:${i}`,
  pathNotAbsolute: (i) => `pathNotAbsolute:${i}`,
  duplicatePath: (i, expandedPath, ownerName) => `duplicatePath:${i}:${ownerName}`,
  jobPathMismatch: (i, expected) => `jobPathMismatch:${i}`,
  primaryCount: () => 'primaryCount',
  primaryMismatch: () => 'primaryMismatch',
};

function validScope(overrides = {}) {
  return {
    version: 1,
    job_id: 'job1',
    mode: 'multi-project',
    primary: 'a',
    projects: [
      { name: 'a', role: 'primary', path: '/root/a', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
    ...overrides,
  };
}

test('a fully valid two-project scope produces no errors', () => {
  assert.deepStrictEqual(scopeErrors(validScope(), messages), []);
});

test('wrong version, missing job_id, and wrong mode are all reported', () => {
  const data = validScope({ version: 2, job_id: '', mode: 'single' });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('version'));
  assert.ok(errors.includes('jobId'));
  assert.ok(errors.includes('mode'));
});

test('a non-array projects value is reported as too few projects', () => {
  const data = validScope({ projects: 'not-an-array' });
  assert.deepStrictEqual(scopeErrors(data, messages), ['tooFewProjects']);
});

test('fewer than two projects is reported as too few projects and stops early', () => {
  const data = validScope({ projects: [{ name: 'a', role: 'primary', path: '/root/a', job_path: '.xoch/work/jobs/job1' }] });
  assert.deepStrictEqual(scopeErrors(data, messages), ['tooFewProjects']);
});

test('non-object project entries (string, null, array) are each reported and skipped', () => {
  const data = validScope({ projects: ['a string', null, []] });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('notObject:0'));
  assert.ok(errors.includes('notObject:1'));
  assert.ok(errors.includes('notObject:2'));
});

test('a missing name is required and skips the duplicate-name check', () => {
  const data = validScope({
    projects: [
      { role: 'primary', path: '/root/a', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('nameRequired:0'));
  assert.ok(!errors.some((e) => e.startsWith('duplicateName:')));
});

test('a repeated name across projects is reported as a duplicate', () => {
  const data = validScope({
    primary: 'dup',
    projects: [
      { name: 'dup', role: 'primary', path: '/root/a', job_path: '.xoch/work/jobs/job1' },
      { name: 'dup', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('duplicateName:dup'));
});

test('an invalid role is reported and does not count toward primaryCount', () => {
  const data = validScope({
    projects: [
      { name: 'a', role: 'owner', path: '/root/a', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('roleInvalid:0'));
  assert.ok(errors.includes('primaryCount'));
});

test('a relative path is reported as not absolute', () => {
  const data = validScope({
    projects: [
      { name: 'a', role: 'primary', path: 'relative/path', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('pathNotAbsolute:0'));
});

test('an empty path resolves to cwd, not filesystem root, for duplicate detection', () => {
  const data = validScope({
    projects: [
      { name: 'a', role: 'primary', path: '', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: process.cwd(), job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  // The second entry's path resolves to the same cwd the first entry's
  // empty path resolves to, so it is reported as a duplicate of "a".
  assert.ok(errors.includes('duplicatePath:1:a'));
});

test('two projects sharing an absolute path are reported as duplicates', () => {
  const data = validScope({
    projects: [
      { name: 'a', role: 'primary', path: '/shared/path', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: '/shared/path', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('duplicatePath:1:a'));
});

test('a missing job_path falls back to empty string and is reported as a mismatch', () => {
  const data = validScope({
    projects: [
      { name: 'a', role: 'primary', path: '/root/a' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('jobPathMismatch:0'));
});

test('a job_path that does not match the expected value is reported', () => {
  const data = validScope({
    projects: [
      { name: 'a', role: 'primary', path: '/root/a', job_path: 'wrong/path' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('jobPathMismatch:0'));
});

test('zero primary projects is reported as a primary-count error', () => {
  const data = validScope({
    projects: [
      { name: 'a', role: 'participant', path: '/root/a', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('primaryCount'));
});

test('two primary projects is reported as a primary-count error', () => {
  const data = validScope({
    projects: [
      { name: 'a', role: 'primary', path: '/root/a', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'primary', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('primaryCount'));
});

test('data.primary not matching any listed project name skips the mismatch check (no role-primary found via primary var)', () => {
  const data = validScope({
    primary: 'nonexistent',
    projects: [
      { name: 'a', role: 'participant', path: '/root/a', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  // No project has role "primary", so the `primary &&` guard short-circuits
  // and primaryMismatch never fires -- only primaryCount does.
  assert.ok(errors.includes('primaryCount'));
  assert.ok(!errors.includes('primaryMismatch'));
});

test('data.primary not matching the actual role-primary project name is reported', () => {
  const data = validScope({
    primary: 'b',
    projects: [
      { name: 'a', role: 'primary', path: '/root/a', job_path: '.xoch/work/jobs/job1' },
      { name: 'b', role: 'participant', path: '/root/b', job_path: '.xoch/work/jobs/job1' },
    ],
  });
  const errors = scopeErrors(data, messages);
  assert.ok(errors.includes('primaryMismatch'));
});

run();
