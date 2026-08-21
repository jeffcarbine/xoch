'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');
const { scopeErrors } = require('../bin/project-scope.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'project-scope.js');

// --- scopeErrors: in-process, since it is a pure function with no
// process.exit() calls. project-scope.js's own checks additionally
// verify path existence and job_path relativity, unlike the shared
// bin/lib/project-scope-validator.js module -- see the comment on
// scopeErrors() in project-scope.js for why it isn't composed from that
// shared module.

function validScope(ctx, overrides = {}) {
  const aPath = path.join(ctx.cwd, 'a');
  const bPath = path.join(ctx.cwd, 'b');
  if (!fs.existsSync(aPath)) fs.mkdirSync(aPath);
  if (!fs.existsSync(bPath)) fs.mkdirSync(bPath);
  return {
    version: 1,
    job_id: 'job1',
    mode: 'multi-project',
    primary: 'a',
    revision: 0,
    projects: [
      { name: 'a', role: 'primary', path: aPath, job_path: path.join('.xoch', 'work', 'jobs', 'job1') },
      { name: 'b', role: 'participant', path: bPath, job_path: path.join('.xoch', 'work', 'jobs', 'job1') },
    ],
    ...overrides,
  };
}

test('a fully valid two-project scope produces no errors', () => {
  const ctx = scratch();
  try {
    assert.deepStrictEqual(scopeErrors(validScope(ctx)), []);
  } finally {
    cleanup(ctx);
  }
});

test('wrong version, missing job_id, wrong mode, and missing primary are all reported', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { version: 2, job_id: '', mode: 'single', primary: '' });
    const errors = scopeErrors(data);
    assert.ok(errors.includes('version must be 1'));
    assert.ok(errors.includes('job_id is required'));
    assert.ok(errors.includes('mode must be multi-project'));
    assert.ok(errors.includes('primary is required'));
  } finally {
    cleanup(ctx);
  }
});

test('a missing revision is reported as invalid', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    delete data.revision;
    const errors = scopeErrors(data);
    assert.ok(errors.includes('revision must be a non-negative integer'));
  } finally {
    cleanup(ctx);
  }
});

test('a negative revision is reported as invalid', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { revision: -1 });
    const errors = scopeErrors(data);
    assert.ok(errors.includes('revision must be a non-negative integer'));
  } finally {
    cleanup(ctx);
  }
});

test('a non-array projects value is reported and stops all further checks', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { projects: 'not-an-array' });
    assert.deepStrictEqual(scopeErrors(data), ['projects must contain at least two entries']);
  } finally {
    cleanup(ctx);
  }
});

test('fewer than two projects is reported but per-project checks still run', () => {
  const ctx = scratch();
  try {
    const single = validScope(ctx).projects[0];
    single.role = 'owner';
    const data = validScope(ctx, { projects: [single] });
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects must contain at least two entries'));
    assert.ok(errors.includes('projects[0].role must be primary or participant'));
  } finally {
    cleanup(ctx);
  }
});

test('non-object project entries (string, null, array) are each reported and skipped', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { projects: ['a string', null, []] });
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects[0] must be an object'));
    assert.ok(errors.includes('projects[1] must be an object'));
    assert.ok(errors.includes('projects[2] must be an object'));
  } finally {
    cleanup(ctx);
  }
});

test('a missing path falls back to an empty string, reported as not absolute and missing', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    delete data.projects[0].path;
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects[0].path must be absolute'));
    assert.ok(errors.some((e) => e.startsWith('projects[0].path does not exist:')));
  } finally {
    cleanup(ctx);
  }
});

test('a missing name is required and skips the duplicate-name check', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    delete data.projects[0].name;
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects[0].name is required'));
    assert.ok(!errors.some((e) => e.startsWith('duplicate project name:')));
  } finally {
    cleanup(ctx);
  }
});

test('a repeated name across projects is reported as a duplicate', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[1].name = 'a';
    const errors = scopeErrors(data);
    assert.ok(errors.includes('duplicate project name: a'));
  } finally {
    cleanup(ctx);
  }
});

test('an invalid role is reported and does not count toward primaryCount', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[0].role = 'owner';
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects[0].role must be primary or participant'));
    assert.ok(errors.includes('exactly one primary project is required'));
  } finally {
    cleanup(ctx);
  }
});

test('a relative path is reported as not absolute', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[0].path = 'relative/path';
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects[0].path must be absolute'));
  } finally {
    cleanup(ctx);
  }
});

test('a path that does not exist is reported', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    const missing = path.join(ctx.cwd, 'missing');
    data.projects[0].path = missing;
    const errors = scopeErrors(data);
    assert.ok(errors.includes(`projects[0].path does not exist: ${missing}`));
  } finally {
    cleanup(ctx);
  }
});

test('two projects sharing an absolute path are reported as duplicates', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[1].path = data.projects[0].path;
    const errors = scopeErrors(data);
    assert.ok(errors.includes(`projects[1].path is also used by ${data.projects[0].name}`));
  } finally {
    cleanup(ctx);
  }
});

test('a missing job_path is reported as required to be relative', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    delete data.projects[0].job_path;
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects[0].job_path must be relative'));
  } finally {
    cleanup(ctx);
  }
});

test('an absolute job_path is reported as required to be relative', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[0].job_path = '/etc/passwd';
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects[0].job_path must be relative'));
  } finally {
    cleanup(ctx);
  }
});

test('a job_path containing ".." is reported as required to be relative', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[0].job_path = '../escape';
    const errors = scopeErrors(data);
    assert.ok(errors.includes('projects[0].job_path must be relative'));
  } finally {
    cleanup(ctx);
  }
});

test('a job_path that does not match the expected value is reported separately from the relative check', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[0].job_path = 'wrong/relative/path';
    const errors = scopeErrors(data);
    assert.ok(!errors.includes('projects[0].job_path must be relative'));
    assert.ok(errors.includes(`projects[0].job_path must be ${path.join('.xoch', 'work', 'jobs', 'job1')}`));
  } finally {
    cleanup(ctx);
  }
});

test('zero primary projects is reported as a primary-count error', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[0].role = 'participant';
    const errors = scopeErrors(data);
    assert.ok(errors.includes('exactly one primary project is required'));
  } finally {
    cleanup(ctx);
  }
});

test('two primary projects is reported as a primary-count error', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    data.projects[1].role = 'primary';
    const errors = scopeErrors(data);
    assert.ok(errors.includes('exactly one primary project is required'));
  } finally {
    cleanup(ctx);
  }
});

test('primary not matching any listed project name is reported', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { primary: 'nonexistent' });
    const errors = scopeErrors(data);
    assert.ok(errors.includes('primary does not match a listed project'));
  } finally {
    cleanup(ctx);
  }
});

test('primary matching a listed name that is not the primary-role project is reported', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { primary: 'b' });
    const errors = scopeErrors(data);
    assert.ok(!errors.includes('primary does not match a listed project'));
    assert.ok(errors.includes('primary must match the project with role primary'));
  } finally {
    cleanup(ctx);
  }
});

test('the job-1 multi-error fixture reports every failing check in bash-matched order', () => {
  const ctx = scratch();
  try {
    const bDir = path.join(ctx.cwd, 'b');
    fs.mkdirSync(bDir);
    const data = validScope(ctx, {
      primary: 'b',
      projects: [
        { name: 'a', role: 'bogus', path: 'relative', job_path: path.join('.xoch', 'work', 'jobs', 'job1') },
        { name: 'a', role: 'participant', path: bDir, job_path: 'wrong' },
      ],
    });
    const errors = scopeErrors(data);
    assert.deepStrictEqual(errors, [
      'projects[0].role must be primary or participant',
      'projects[0].path must be absolute',
      'projects[0].path does not exist: relative',
      'duplicate project name: a',
      `projects[1].job_path must be ${path.join('.xoch', 'work', 'jobs', 'job1')}`,
      'exactly one primary project is required',
      'primary does not match a listed project',
    ]);
  } finally {
    cleanup(ctx);
  }
});

// --- CLI commands: subprocess, since these call process.exit() directly.

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('no command prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, [], ctx);
    assert.strictEqual(result.status, 2);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown command exits 2 with an error', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /unknown command: bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('create requires --job', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['create', '--primary', 'a=/x', '--participant', 'b=/y'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--job is required/);
  } finally {
    cleanup(ctx);
  }
});

test('create rejects a job ID with characters outside lowercase letters, numbers, and hyphens', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['create', '--job', 'Bad_Job', '--primary', 'a=/x', '--participant', 'b=/y'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /job ID must use lowercase letters, numbers, and hyphens/);
  } finally {
    cleanup(ctx);
  }
});

test('create requires --primary', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['create', '--job', 'demo', '--participant', 'b=/y'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--primary is required/);
  } finally {
    cleanup(ctx);
  }
});

test('create requires at least one --participant', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['create', '--job', 'demo', '--primary', 'a=/x'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /at least one --participant is required/);
  } finally {
    cleanup(ctx);
  }
});

test('create rejects a project spec that is not NAME=PATH', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['create', '--job', 'demo', '--primary', 'noequals', '--participant', 'b=/y'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--primary must use NAME=PATH/);
  } finally {
    cleanup(ctx);
  }
});

test('create rejects a project name with invalid characters', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, 'primary'));
    const result = runScript(SCRIPT, ['create', '--job', 'demo', '--primary', `bad name=${path.join(ctx.cwd, 'primary')}`, '--participant', 'b=/y'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /invalid project name: bad name/);
  } finally {
    cleanup(ctx);
  }
});

test('create rejects a project path that does not exist', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['create', '--job', 'demo', '--primary', `a=${path.join(ctx.cwd, 'missing')}`, '--participant', 'b=/y'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /project path does not exist/);
  } finally {
    cleanup(ctx);
  }
});

test('create rejects duplicate project names across --primary/--participant', () => {
  const ctx = scratch();
  try {
    const primaryDir = path.join(ctx.cwd, 'primary');
    const participantDir = path.join(ctx.cwd, 'participant');
    fs.mkdirSync(primaryDir);
    fs.mkdirSync(participantDir);
    const result = runScript(
      SCRIPT,
      ['create', '--job', 'demo', '--primary', `dup=${primaryDir}`, '--participant', `dup=${participantDir}`],
      ctx
    );
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /project names must be unique/);
  } finally {
    cleanup(ctx);
  }
});

test('create rejects a primary and participant that resolve to the same path (post-construction scopeErrors failure)', () => {
  const ctx = scratch();
  try {
    const sharedDir = path.join(ctx.cwd, 'shared');
    fs.mkdirSync(sharedDir);
    const result = runScript(SCRIPT, ['create', '--job', 'demo', '--primary', `a=${sharedDir}`, '--participant', `b=${sharedDir}`], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /path is also used by/);
  } finally {
    cleanup(ctx);
  }
});

test('create rejects an already-existing scope', () => {
  const ctx = scratch();
  try {
    const primaryDir = path.join(ctx.cwd, 'primary');
    const participantDir = path.join(ctx.cwd, 'participant');
    fs.mkdirSync(primaryDir);
    fs.mkdirSync(participantDir);
    runScript(SCRIPT, ['create', '--job', 'demo', '--primary', `a=${primaryDir}`, '--participant', `b=${participantDir}`], ctx);
    const result = runScript(SCRIPT, ['create', '--job', 'demo', '--primary', `a=${primaryDir}`, '--participant', `b=${participantDir}`], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /scope already exists/);
  } finally {
    cleanup(ctx);
  }
});

test('create writes a well-formed projects.json and prints its location', () => {
  const ctx = scratch();
  try {
    const primaryDir = path.join(ctx.cwd, 'primary');
    const participantDir = path.join(ctx.cwd, 'participant');
    fs.mkdirSync(primaryDir);
    fs.mkdirSync(participantDir);
    const result = runScript(SCRIPT, ['create', '--job', 'demo', '--primary', `a=${primaryDir}`, '--participant', `b=${participantDir}`], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Multi-project scope created:/);
    const scopePath = path.join(primaryDir, '.xoch', 'work', 'jobs', 'demo', 'projects.json');
    const data = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
    assert.strictEqual(data.job_id, 'demo');
    assert.strictEqual(data.primary, 'a');
    assert.strictEqual(data.revision, 0);
    assert.strictEqual(data.projects.length, 2);
    assert.strictEqual(data.projects[0].role, 'primary');
    assert.strictEqual(data.projects[1].role, 'participant');
  } finally {
    cleanup(ctx);
  }
});

test('create accepts multiple --participant flags', () => {
  const ctx = scratch();
  try {
    const primaryDir = path.join(ctx.cwd, 'primary');
    const bDir = path.join(ctx.cwd, 'b');
    const cDir = path.join(ctx.cwd, 'c');
    [primaryDir, bDir, cDir].forEach((d) => fs.mkdirSync(d));
    const result = runScript(
      SCRIPT,
      ['create', '--job', 'demo', '--primary', `a=${primaryDir}`, '--participant', `b=${bDir}`, '--participant', `c=${cDir}`],
      ctx
    );
    assert.strictEqual(result.status, 0);
    const scopePath = path.join(primaryDir, '.xoch', 'work', 'jobs', 'demo', 'projects.json');
    const data = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
    assert.strictEqual(data.projects.length, 3);
  } finally {
    cleanup(ctx);
  }
});

function writeScope(ctx, data, name = 'scope.json') {
  const scopePath = path.join(ctx.cwd, name);
  fs.writeFileSync(scopePath, JSON.stringify(data));
  return scopePath;
}

test('validate requires --scope', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['validate'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--scope is required/);
  } finally {
    cleanup(ctx);
  }
});

test('validate rejects a scope file that does not exist', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['validate', '--scope', path.join(ctx.cwd, 'missing.json')], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /scope file not found/);
  } finally {
    cleanup(ctx);
  }
});

test('validate rejects invalid scope JSON', () => {
  const ctx = scratch();
  try {
    const scopePath = path.join(ctx.cwd, 'scope.json');
    fs.writeFileSync(scopePath, '{ not json');
    const result = runScript(SCRIPT, ['validate', '--scope', scopePath], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /invalid scope JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('validate reports a valid scope in text and --json modes', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    const scopePath = writeScope(ctx, data);
    const textResult = runScript(SCRIPT, ['validate', '--scope', scopePath], ctx);
    assert.strictEqual(textResult.status, 0);
    assert.match(textResult.stdout, /Project scope valid:/);

    const jsonResult = runScript(SCRIPT, ['validate', '--scope', scopePath, '--json'], ctx);
    assert.strictEqual(jsonResult.status, 0);
    const parsed = JSON.parse(jsonResult.stdout);
    assert.strictEqual(parsed.valid, true);
    assert.deepStrictEqual(parsed.errors, []);
  } finally {
    cleanup(ctx);
  }
});

test('validate reports an invalid scope with each error on its own line', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { version: 2 });
    const scopePath = writeScope(ctx, data);
    const result = runScript(SCRIPT, ['validate', '--scope', scopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Project scope invalid:/);
    assert.match(result.stderr, /- version must be 1/);
  } finally {
    cleanup(ctx);
  }
});

test('role reports the primary project when cwd is inside it', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    const scopePath = writeScope(ctx, data);
    const primaryPath = data.projects[0].path;
    const result = runScript(SCRIPT, ['role', '--scope', scopePath, '--cwd', primaryPath, '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.name, 'a');
    assert.strictEqual(parsed.is_primary, true);
    assert.strictEqual(parsed.canonical_job, path.join(primaryPath, data.projects[0].job_path));
  } finally {
    cleanup(ctx);
  }
});

test('role reports a participant project as not primary, from a nested cwd', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    const scopePath = writeScope(ctx, data);
    const participantPath = data.projects[1].path;
    const nested = path.join(participantPath, 'nested', 'deep');
    fs.mkdirSync(nested, { recursive: true });
    const result = runScript(SCRIPT, ['role', '--scope', scopePath, '--cwd', nested, '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.name, 'b');
    assert.strictEqual(parsed.is_primary, false);
  } finally {
    cleanup(ctx);
  }
});

test('role reports an unmapped cwd in text mode, one field per line', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    const scopePath = writeScope(ctx, data);
    const outside = path.join(ctx.cwd, 'outside');
    fs.mkdirSync(outside);
    const result = runScript(SCRIPT, ['role', '--scope', scopePath, '--cwd', outside], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /name: null/);
    assert.match(result.stdout, /role: unmapped/);
  } finally {
    cleanup(ctx);
  }
});

test('role fails when the scope itself is invalid', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { version: 2 });
    const scopePath = writeScope(ctx, data);
    const result = runScript(SCRIPT, ['role', '--scope', scopePath, '--cwd', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /version must be 1/);
  } finally {
    cleanup(ctx);
  }
});

test('role prefers the PWD environment variable over the real process cwd when --cwd is omitted', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    const scopePath = writeScope(ctx, data);
    const primaryPath = data.projects[0].path;
    const result = spawnSync(process.execPath, [SCRIPT, 'role', '--scope', scopePath, '--json'], {
      cwd: ctx.cwd,
      env: { ...process.env, HOME: ctx.home, PWD: primaryPath },
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.name, 'a');
  } finally {
    cleanup(ctx);
  }
});

test('role falls back to the real process cwd when neither --cwd nor PWD is set', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    // Record the *realpath* of the primary so it matches process.cwd()'s
    // symlink-resolved output (e.g. macOS's /var -> /private/var) once the
    // fallback (not PWD, which preserves the shell's unresolved path) kicks in.
    data.projects[0].path = fs.realpathSync(data.projects[0].path);
    const scopePath = writeScope(ctx, data);
    const env = { ...process.env, HOME: ctx.home };
    delete env.PWD;
    const result = spawnSync(process.execPath, [SCRIPT, 'role', '--scope', scopePath, '--json'], {
      cwd: data.projects[0].path,
      env,
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.name, 'a');
  } finally {
    cleanup(ctx);
  }
});

test('primary-job prints the canonical job directory', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    const scopePath = writeScope(ctx, data);
    const result = runScript(SCRIPT, ['primary-job', '--scope', scopePath], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), path.join(data.projects[0].path, data.projects[0].job_path));
  } finally {
    cleanup(ctx);
  }
});

test('primary-job fails when the scope itself is invalid', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { version: 2 });
    const scopePath = writeScope(ctx, data);
    const result = runScript(SCRIPT, ['primary-job', '--scope', scopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /version must be 1/);
  } finally {
    cleanup(ctx);
  }
});

test('projects fails when the scope itself is invalid', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx, { version: 2 });
    const scopePath = writeScope(ctx, data);
    const result = runScript(SCRIPT, ['projects', '--scope', scopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /version must be 1/);
  } finally {
    cleanup(ctx);
  }
});

test('projects lists each project in text and --json modes', () => {
  const ctx = scratch();
  try {
    const data = validScope(ctx);
    const scopePath = writeScope(ctx, data);
    const textResult = runScript(SCRIPT, ['projects', '--scope', scopePath], ctx);
    assert.strictEqual(textResult.status, 0);
    assert.match(textResult.stdout, /a: primary /);
    assert.match(textResult.stdout, /b: participant /);

    const jsonResult = runScript(SCRIPT, ['projects', '--scope', scopePath, '--json'], ctx);
    const parsed = JSON.parse(jsonResult.stdout);
    assert.strictEqual(parsed.length, 2);
  } finally {
    cleanup(ctx);
  }
});

run();
