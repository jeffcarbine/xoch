'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'context-sync.js');

// Builds a primary + participant project tree with a real canonical
// projects.json under primary/.xoch/work/jobs/[jobId]/, plus a seeded
// state.md (file) and notes/ (directory) so the shared-item sync logic
// has real file and directory cases to exercise.
function buildFixture(ctx, jobId = 'demo') {
  const primaryDir = path.join(ctx.cwd, 'primary');
  const participantDir = path.join(ctx.cwd, 'participant');
  fs.mkdirSync(primaryDir, { recursive: true });
  fs.mkdirSync(participantDir, { recursive: true });
  const jobPath = path.join('.xoch', 'work', 'jobs', jobId);
  const canonicalRoot = path.join(primaryDir, jobPath);
  fs.mkdirSync(canonicalRoot, { recursive: true });
  fs.writeFileSync(path.join(canonicalRoot, 'state.md'), 'canonical state\n');
  fs.mkdirSync(path.join(canonicalRoot, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(canonicalRoot, 'notes', 'a.md'), 'note a\n');
  const scopeData = {
    version: 1,
    job_id: jobId,
    mode: 'multi-project',
    primary: 'primary',
    revision: 0,
    content_digest: null,
    last_synced_at: null,
    projects: [
      { name: 'primary', role: 'primary', path: primaryDir, job_path: jobPath },
      { name: 'participant', role: 'participant', path: participantDir, job_path: jobPath },
    ],
  };
  const canonicalScopePath = path.join(canonicalRoot, 'projects.json');
  fs.writeFileSync(canonicalScopePath, JSON.stringify(scopeData));
  return { primaryDir, participantDir, canonicalRoot, jobId, jobPath, scopeData, canonicalScopePath };
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function destinationRoot(fixture) {
  return path.join(fixture.participantDir, fixture.jobPath);
}

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

test('--scope is required', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['sync'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--scope is required/);
  } finally {
    cleanup(ctx);
  }
});

test('a requested scope file that does not exist is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['sync', '--scope', path.join(ctx.cwd, 'missing.json')], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /scope file not found/);
  } finally {
    cleanup(ctx);
  }
});

test('invalid requested scope JSON is rejected', () => {
  const ctx = scratch();
  try {
    const scopePath = path.join(ctx.cwd, 'scope.json');
    fs.writeFileSync(scopePath, '{ not json');
    const result = runScript(SCRIPT, ['sync', '--scope', scopePath], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /invalid scope JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('a structurally invalid requested scope reports only the first error, using context-sync wording', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const requested = { ...fixture.scopeData, version: 2, job_id: '' };
    const requestedPath = path.join(ctx.cwd, 'requested.json');
    writeJson(requestedPath, requested);
    const result = runScript(SCRIPT, ['sync', '--scope', requestedPath], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /scope version must be 1/);
    assert.ok(!result.stderr.includes('job_id'));
  } finally {
    cleanup(ctx);
  }
});

// The context-sync-specific wording for each shared-validator check only
// surfaces when it is the *first* failing check (validateScope takes just
// errors[0]). These target request-scope validation directly -- no
// canonical file is needed, since request validation runs first -- to
// exercise every one of context-sync.js's own message functions at least
// once (function coverage), on top of the shared validator's own branch
// coverage already established by test/project-scope-validator.test.js.
function baseRequestScope(ctx, suffix) {
  const primaryDir = path.join(ctx.cwd, `req-primary-${suffix}`);
  const participantDir = path.join(ctx.cwd, `req-participant-${suffix}`);
  fs.mkdirSync(primaryDir);
  fs.mkdirSync(participantDir);
  return {
    version: 1,
    job_id: 'demo',
    mode: 'multi-project',
    primary: 'primary',
    revision: 0,
    projects: [
      { name: 'primary', role: 'primary', path: primaryDir, job_path: path.join('.xoch', 'work', 'jobs', 'demo') },
      { name: 'participant', role: 'participant', path: participantDir, job_path: path.join('.xoch', 'work', 'jobs', 'demo') },
    ],
  };
}

function runRequest(ctx, data, suffix) {
  const requestedPath = path.join(ctx.cwd, `requested-${suffix}.json`);
  writeJson(requestedPath, data);
  return runScript(SCRIPT, ['sync', '--scope', requestedPath], ctx);
}

test('too few projects uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'toofew');
    data.projects = [data.projects[0]];
    const result = runRequest(ctx, data, 'toofew');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /scope must contain at least two projects/);
  } finally {
    cleanup(ctx);
  }
});

test('a non-object project entry uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'notobject');
    data.projects[1] = 'not an object';
    const result = runRequest(ctx, data, 'notobject');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /projects\[1\] must be an object/);
  } finally {
    cleanup(ctx);
  }
});

test('a missing project name uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'noname');
    delete data.projects[1].name;
    const result = runRequest(ctx, data, 'noname');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /projects\[1\].name is required/);
  } finally {
    cleanup(ctx);
  }
});

test('a duplicate project name uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'dupname');
    data.projects[1].name = 'primary';
    data.primary = 'primary';
    const result = runRequest(ctx, data, 'dupname');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /duplicate project name: primary/);
  } finally {
    cleanup(ctx);
  }
});

test('an invalid role uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'badrole');
    data.projects[1].role = 'owner';
    const result = runRequest(ctx, data, 'badrole');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /projects\[1\].role is invalid/);
  } finally {
    cleanup(ctx);
  }
});

test('a non-absolute path uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'relpath');
    data.projects[1].path = 'relative/path';
    const result = runRequest(ctx, data, 'relpath');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /projects\[1\].path must be absolute/);
  } finally {
    cleanup(ctx);
  }
});

test('a duplicate project path uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'duppath');
    data.projects[1].path = data.projects[0].path;
    const result = runRequest(ctx, data, 'duppath');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, new RegExp(`duplicate project path: ${data.projects[0].path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    cleanup(ctx);
  }
});

test('zero primary projects uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'noprimary');
    data.projects[0].role = 'participant';
    const result = runRequest(ctx, data, 'noprimary');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /scope must contain exactly one primary project/);
  } finally {
    cleanup(ctx);
  }
});

test('a primary field that does not match the primary-role project uses context-sync wording', () => {
  const ctx = scratch();
  try {
    const data = baseRequestScope(ctx, 'mismatch');
    data.primary = 'participant';
    const result = runRequest(ctx, data, 'mismatch');
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /scope primary must match the primary project/);
  } finally {
    cleanup(ctx);
  }
});

test('a canonical scope file that does not exist is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    fs.rmSync(fixture.canonicalScopePath);
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /scope file not found/);
  } finally {
    cleanup(ctx);
  }
});

test('an invalid canonical scope is rejected using context-sync wording', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    writeJson(fixture.canonicalScopePath, { ...fixture.scopeData, mode: 'single' });
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /scope mode must be multi-project/);
  } finally {
    cleanup(ctx);
  }
});

test('a requested job_id that does not match the canonical scope is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    // The canonical file's own declared identity (job_id/job_path) can drift
    // from the directory it is physically stored in -- that mismatch is
    // exactly what this check catches. Self-consistent under its own
    // structural validation, but disagrees with the requested copy's job_id.
    const mismatched = JSON.parse(JSON.stringify(fixture.scopeData));
    mismatched.job_id = 'different-job';
    for (const project of mismatched.projects) project.job_path = path.join('.xoch', 'work', 'jobs', 'different-job');
    writeJson(fixture.canonicalScopePath, mismatched);

    // Requested scope is the original, unmodified fixture copy (job_id: demo);
    // its own primary path/job_path still locate the real canonical file.
    const requestedPath = path.join(ctx.cwd, 'requested.json');
    writeJson(requestedPath, fixture.scopeData);
    const result = runScript(SCRIPT, ['sync', '--scope', requestedPath], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /scope job_id does not match canonical scope/);
  } finally {
    cleanup(ctx);
  }
});

test('a requested primary that does not match the canonical primary is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const requested = JSON.parse(JSON.stringify(fixture.scopeData));
    requested.primary = 'renamed';
    requested.projects[0].name = 'renamed';
    const requestedPath = path.join(ctx.cwd, 'requested.json');
    writeJson(requestedPath, requested);
    const result = runScript(SCRIPT, ['sync', '--scope', requestedPath], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /requested scope primary does not match canonical scope/);
  } finally {
    cleanup(ctx);
  }
});

test('a participant path that does not exist is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const canonical = JSON.parse(JSON.stringify(fixture.scopeData));
    canonical.projects[1].path = path.join(ctx.cwd, 'nonexistent-participant');
    writeJson(fixture.canonicalScopePath, canonical);
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /participant path does not exist/);
  } finally {
    cleanup(ctx);
  }
});

test('a non-integer canonical revision is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    writeJson(fixture.canonicalScopePath, { ...fixture.scopeData, revision: -1 });
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /canonical revision must be a non-negative integer/);
  } finally {
    cleanup(ctx);
  }
});

test('a participant job directory with unrelated content and no scope file is refused as unmanaged', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const destRoot = destinationRoot(fixture);
    fs.mkdirSync(destRoot, { recursive: true });
    fs.writeFileSync(path.join(destRoot, 'unrelated.txt'), 'pre-existing');
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /sync refused/);
    assert.match(result.stdout, /"status": "unmanaged-context"/);
  } finally {
    cleanup(ctx);
  }
});

test('a participant scoped to a different job_id is refused as a different job', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const destRoot = destinationRoot(fixture);
    writeJson(path.join(destRoot, 'projects.json'), { ...fixture.scopeData, job_id: 'other-job' });
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /"status": "different-job"/);
  } finally {
    cleanup(ctx);
  }
});

test('a participant with a higher recorded revision is refused as newer', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const destRoot = destinationRoot(fixture);
    writeJson(path.join(destRoot, 'projects.json'), { ...fixture.scopeData, revision: 5 });
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /"status": "newer-participant"/);
  } finally {
    cleanup(ctx);
  }
});

test('a participant with a stale recorded content_digest is refused as independently modified', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const destRoot = destinationRoot(fixture);
    fs.mkdirSync(destRoot, { recursive: true });
    fs.writeFileSync(path.join(destRoot, 'state.md'), 'independently edited\n');
    writeJson(path.join(destRoot, 'projects.json'), { ...fixture.scopeData, content_digest: 'deadbeef' });
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /"status": "participant-modified"/);
  } finally {
    cleanup(ctx);
  }
});

test('check reports out-of-sync for an unsynced participant without writing anything', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const result = runScript(SCRIPT, ['check', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.mode, 'check');
    assert.strictEqual(summary.participants[0].status, 'out-of-sync');
    assert.ok(summary.participants[0].changed.includes('state.md'));
    assert.ok(summary.participants[0].changed.includes('notes'));
    assert.ok(!fs.existsSync(destinationRoot(fixture)));
  } finally {
    cleanup(ctx);
  }
});

test('check treats a source item whose type changed (file to directory) as changed, without tripping the modified-participant guard', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    // Establish a real, in-sync participant first so the destination's own
    // recorded content_digest matches its disk state (no unrelated drift).
    runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);

    // Canonical's "state.md" changes from a file into a directory. The
    // participant's copy is untouched, so samePath's isFile/isDirectory
    // type-mismatch branch is what flags it, not a byte-content diff.
    fs.rmSync(path.join(fixture.canonicalRoot, 'state.md'));
    fs.mkdirSync(path.join(fixture.canonicalRoot, 'state.md'));
    fs.writeFileSync(path.join(fixture.canonicalRoot, 'state.md', 'inner.txt'), 'now a directory');

    const result = runScript(SCRIPT, ['check', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.participants[0].status, 'out-of-sync');
    assert.ok(summary.participants[0].changed.includes('state.md'));
  } finally {
    cleanup(ctx);
  }
});

test('--dry-run reports the plan without writing any files or bumping the revision', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath, '--dry-run'], ctx);
    assert.strictEqual(result.status, 0);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.mode, 'dry-run');
    assert.strictEqual(summary.revision, undefined);
    assert.ok(!fs.existsSync(destinationRoot(fixture)));
    const canonicalAfter = JSON.parse(fs.readFileSync(fixture.canonicalScopePath, 'utf8'));
    assert.strictEqual(canonicalAfter.revision, 0);
  } finally {
    cleanup(ctx);
  }
});

test('sync copies shared items to a fresh participant and bumps the canonical revision', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 0);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.revision, 1);
    assert.strictEqual(summary.participants[0].status, 'ready');

    const destRoot = destinationRoot(fixture);
    assert.strictEqual(fs.readFileSync(path.join(destRoot, 'state.md'), 'utf8'), 'canonical state\n');
    assert.strictEqual(fs.readFileSync(path.join(destRoot, 'notes', 'a.md'), 'utf8'), 'note a\n');
    const participantScope = JSON.parse(fs.readFileSync(path.join(destRoot, 'projects.json'), 'utf8'));
    assert.strictEqual(participantScope.revision, 1);

    const canonicalAfter = JSON.parse(fs.readFileSync(fixture.canonicalScopePath, 'utf8'));
    assert.strictEqual(canonicalAfter.revision, 1);
    assert.ok(canonicalAfter.content_digest);
    assert.ok(canonicalAfter.last_synced_at);
  } finally {
    cleanup(ctx);
  }
});

test('check reports clean (exit 0) once the participant matches the canonical state', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    const result = runScript(SCRIPT, ['check', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 0);
    const summary = JSON.parse(result.stdout);
    assert.deepStrictEqual(summary.participants[0].changed, []);
  } finally {
    cleanup(ctx);
  }
});

test('a second sync updates changed content and removes items no longer present in canonical', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);

    // Canonical drops its "notes" directory and changes state.md's content.
    fs.rmSync(path.join(fixture.canonicalRoot, 'notes'), { recursive: true, force: true });
    fs.writeFileSync(path.join(fixture.canonicalRoot, 'state.md'), 'updated state\n');
    const canonical = JSON.parse(fs.readFileSync(fixture.canonicalScopePath, 'utf8'));
    writeJson(fixture.canonicalScopePath, canonical);

    const result = runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 0);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.revision, 2);

    const destRoot = destinationRoot(fixture);
    assert.strictEqual(fs.readFileSync(path.join(destRoot, 'state.md'), 'utf8'), 'updated state\n');
    assert.ok(!fs.existsSync(path.join(destRoot, 'notes')));
  } finally {
    cleanup(ctx);
  }
});

test('check flags a directory as changed when its child count differs, without a type change or removal', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    runScript(SCRIPT, ['sync', '--scope', fixture.canonicalScopePath], ctx);

    // Canonical's "notes" directory gains a second file; the participant's
    // synced copy still only has the original one -- same types on both
    // sides, just a different child count, so samePath's directory-length
    // check (not the file/dir type-mismatch check) is what catches it.
    fs.writeFileSync(path.join(fixture.canonicalRoot, 'notes', 'b.md'), 'note b\n');

    const result = runScript(SCRIPT, ['check', '--scope', fixture.canonicalScopePath], ctx);
    assert.strictEqual(result.status, 1);
    const summary = JSON.parse(result.stdout);
    assert.ok(summary.participants[0].changed.includes('notes'));
  } finally {
    cleanup(ctx);
  }
});

run();
