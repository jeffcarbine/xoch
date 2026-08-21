'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'archive-actions.js');

function makeJobFolder(root, id) {
  const dir = path.join(root, '.xoch', 'work', 'jobs', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'state.md'), `job_id: ${id}\n`);
  return dir;
}

function setJsonPointer(root, jobId) {
  const pointerDir = path.join(root, '.xoch', 'work');
  fs.mkdirSync(pointerDir, { recursive: true });
  fs.writeFileSync(path.join(pointerDir, 'current.json'), JSON.stringify({ job: { id: jobId } }));
}

function setMarkdownPointer(root, jobId) {
  const pointerDir = path.join(root, '.xoch', 'work');
  fs.mkdirSync(pointerDir, { recursive: true });
  fs.writeFileSync(path.join(pointerDir, 'current.md'), `**Job ID**: ${jobId}\nsome other text\n`);
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

test('omitting --root defaults to the current working directory', () => {
  const ctx = scratch();
  try {
    makeJobFolder(ctx.cwd, 'myjob');
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob'], ctx);
    assert.strictEqual(result.status, 0);
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

test('an unknown command is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus', '--kind', 'job', '--id', 'x', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Unknown command: bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('an invalid --kind is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['archive', '--kind', 'bogus', '--id', 'x', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /--kind must be job or arc/);
  } finally {
    cleanup(ctx);
  }
});

test('archive: an unsafe --id is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', '-bad', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /A safe --id is required/);
  } finally {
    cleanup(ctx);
  }
});

test('archive: a missing source folder is reported', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'nope', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Active job folder not found/);
  } finally {
    cleanup(ctx);
  }
});

test('archive: --dry-run plans the move without touching the filesystem', () => {
  const ctx = scratch();
  try {
    makeJobFolder(ctx.cwd, 'myjob');
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd, '--dry-run'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Archive plan:/);
    assert.ok(fs.existsSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'myjob')));
  } finally {
    cleanup(ctx);
  }
});

test('archive: a real archive moves the folder under archive/ with a dated stem', () => {
  const ctx = scratch();
  try {
    makeJobFolder(ctx.cwd, 'myjob');
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Archive move:/);
    assert.ok(!fs.existsSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'myjob')));
    const archived = fs.readdirSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive'));
    assert.strictEqual(archived.length, 1);
    assert.match(archived[0], /^myjob-archive-\d{4}-\d{2}-\d{2}$/);
  } finally {
    cleanup(ctx);
  }
});

test('archive: a second archive of the same id on the same day gets a -2 suffix', () => {
  const ctx = scratch();
  try {
    makeJobFolder(ctx.cwd, 'myjob');
    runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    makeJobFolder(ctx.cwd, 'myjob');
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    const archived = fs.readdirSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive')).sort();
    assert.strictEqual(archived.length, 2);
    assert.ok(archived[1].endsWith('-2'));
  } finally {
    cleanup(ctx);
  }
});

test('archive: refuses to archive the active job (current.json points to it)', () => {
  const ctx = scratch();
  try {
    makeJobFolder(ctx.cwd, 'myjob');
    setJsonPointer(ctx.cwd, 'myjob');
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Clear or pause the active job before archiving/);
  } finally {
    cleanup(ctx);
  }
});

test('archive: proceeds when current.json points to a different job', () => {
  const ctx = scratch();
  try {
    makeJobFolder(ctx.cwd, 'myjob');
    setJsonPointer(ctx.cwd, 'other-job');
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('archive: refuses to archive the active job via the legacy current.md fallback', () => {
  const ctx = scratch();
  try {
    makeJobFolder(ctx.cwd, 'myjob');
    setMarkdownPointer(ctx.cwd, 'myjob');
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Clear or pause the active job before archiving/);
  } finally {
    cleanup(ctx);
  }
});

test('archive: no pointer at all proceeds normally', () => {
  const ctx = scratch();
  try {
    makeJobFolder(ctx.cwd, 'myjob');
    const result = runScript(SCRIPT, ['archive', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('archive: --kind arc uses the arcs/ directory and never checks the job pointer', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, '.xoch', 'work', 'arcs', 'myarc');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'state.md'), 'arc_id: myarc\n');
    setJsonPointer(ctx.cwd, 'myarc');
    const result = runScript(SCRIPT, ['archive', '--kind', 'arc', '--id', 'myarc', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(fs.existsSync(path.join(ctx.cwd, '.xoch', 'work', 'arcs', 'archive')));
  } finally {
    cleanup(ctx);
  }
});

test('restore: an unsafe --id (when no --archive path given) is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--id', '-bad', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /A safe --id is required/);
  } finally {
    cleanup(ctx);
  }
});

test('restore: no archive found for --id is reported', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--id', 'nope', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /No archive found for job: nope/);
  } finally {
    cleanup(ctx);
  }
});

test('restore: by --id picks the most recently modified matching archive', () => {
  const ctx = scratch();
  try {
    const archiveRoot = path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive');
    const older = path.join(archiveRoot, 'myjob-archive-2026-01-01');
    const newer = path.join(archiveRoot, 'myjob-archive-2026-06-01');
    fs.mkdirSync(older, { recursive: true });
    fs.mkdirSync(newer, { recursive: true });
    fs.writeFileSync(path.join(newer, 'state.md'), 'job_id: myjob\n');
    fs.utimesSync(older, new Date('2026-01-01'), new Date('2026-01-01'));
    fs.utimesSync(newer, new Date('2026-06-01'), new Date('2026-06-01'));
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /2026-06-01/);
    assert.ok(fs.existsSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'myjob', 'state.md')));
  } finally {
    cleanup(ctx);
  }
});

test('restore: by --id picks the newest even when created in reverse (newest first) order', () => {
  const ctx = scratch();
  try {
    const archiveRoot = path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive');
    const newer = path.join(archiveRoot, 'myjob-archive-2026-06-01');
    const older = path.join(archiveRoot, 'myjob-archive-2026-01-01');
    // Created in the opposite order from the earlier "picks the most
    // recently modified" test, to exercise the reduce comparator's other
    // branch regardless of filesystem readdir ordering.
    fs.mkdirSync(newer, { recursive: true });
    fs.mkdirSync(older, { recursive: true });
    fs.writeFileSync(path.join(newer, 'state.md'), 'job_id: myjob\n');
    fs.utimesSync(older, new Date('2026-01-01'), new Date('2026-01-01'));
    fs.utimesSync(newer, new Date('2026-06-01'), new Date('2026-06-01'));
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /2026-06-01/);
  } finally {
    cleanup(ctx);
  }
});

test('restore: by --id keeps the current newest when the alphabetically-first entry is actually newer', () => {
  const ctx = scratch();
  try {
    // Directory readdir order tends to follow name order, not creation
    // time, on this filesystem -- both other "picks the newest" tests
    // therefore only ever exercised the reduce comparator's "replace"
    // branch. Decoupling alphabetical order from mtime order here forces
    // the comparator to hit its other branch: the first-processed entry
    // (alphabetically first) already has the later mtime, so the second
    // entry never wins the comparison and the accumulator is kept as-is.
    const archiveRoot = path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive');
    const alphaFirst = path.join(archiveRoot, 'myjob-archive-2026-01-01');
    const alphaSecond = path.join(archiveRoot, 'myjob-archive-2026-06-01');
    fs.mkdirSync(alphaFirst, { recursive: true });
    fs.mkdirSync(alphaSecond, { recursive: true });
    fs.writeFileSync(path.join(alphaFirst, 'state.md'), 'job_id: myjob\n');
    fs.utimesSync(alphaFirst, new Date('2026-09-01'), new Date('2026-09-01'));
    fs.utimesSync(alphaSecond, new Date('2026-02-01'), new Date('2026-02-01'));
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--id', 'myjob', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(fs.existsSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'myjob', 'state.md')));
  } finally {
    cleanup(ctx);
  }
});

test('restore: by --archive path outside the archive root is rejected', () => {
  const ctx = scratch();
  try {
    const outside = path.join(ctx.cwd, 'elsewhere');
    fs.mkdirSync(outside, { recursive: true });
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--archive', outside, '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Archive path is outside/);
  } finally {
    cleanup(ctx);
  }
});

test('restore: by --archive path within the archive root, deriving the id from the folder name', () => {
  const ctx = scratch();
  try {
    const archived = path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive', 'myjob-archive-2026-01-01');
    fs.mkdirSync(archived, { recursive: true });
    fs.writeFileSync(path.join(archived, 'state.md'), 'job_id: myjob\n');
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--archive', archived, '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(fs.existsSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'myjob', 'state.md')));
  } finally {
    cleanup(ctx);
  }
});

test('restore: an explicit --id overrides the id derived from the archive folder name', () => {
  const ctx = scratch();
  try {
    const archived = path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive', 'myjob-archive-2026-01-01');
    fs.mkdirSync(archived, { recursive: true });
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--archive', archived, '--id', 'renamed-job', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(fs.existsSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'renamed-job')));
  } finally {
    cleanup(ctx);
  }
});

test('restore: a missing archive folder (found via --id but deleted) is reported', () => {
  const ctx = scratch();
  try {
    // Construct an --archive path that does not exist, bypassing the
    // --id candidate search entirely, to reach the "Archive folder not
    // found" check via the --archive branch.
    const missing = path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive', 'ghost-archive-2026-01-01');
    fs.mkdirSync(path.dirname(missing), { recursive: true });
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--archive', missing, '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Archive folder not found/);
  } finally {
    cleanup(ctx);
  }
});

test('restore: refuses to overwrite an existing active job with the same id', () => {
  const ctx = scratch();
  try {
    const archived = path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive', 'myjob-archive-2026-01-01');
    fs.mkdirSync(archived, { recursive: true });
    makeJobFolder(ctx.cwd, 'myjob');
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--archive', archived, '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Refusing to overwrite active job/);
  } finally {
    cleanup(ctx);
  }
});

test('restore: --dry-run plans the move without touching the filesystem', () => {
  const ctx = scratch();
  try {
    const archived = path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'archive', 'myjob-archive-2026-01-01');
    fs.mkdirSync(archived, { recursive: true });
    const result = runScript(SCRIPT, ['restore', '--kind', 'job', '--archive', archived, '--root', ctx.cwd, '--dry-run'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Restore plan:/);
    assert.ok(fs.existsSync(archived));
    assert.ok(!fs.existsSync(path.join(ctx.cwd, '.xoch', 'work', 'jobs', 'myjob')));
  } finally {
    cleanup(ctx);
  }
});

run();
