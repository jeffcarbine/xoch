'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'docs-drift.js');

function initRepo(cwd) {
  execFileSync('git', ['-C', cwd, 'init', '-q']);
  execFileSync('git', ['-C', cwd, 'checkout', '-q', '-b', 'main']);
  execFileSync('git', ['-C', cwd, 'config', 'user.email', 't@t.com']);
  execFileSync('git', ['-C', cwd, 'config', 'user.name', 't']);
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

test('an unknown subcommand prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 2);
  } finally {
    cleanup(ctx);
  }
});

test('baseline errors when --root does not exist', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['baseline', '--root', path.join(ctx.cwd, 'missing')], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Project root not found/);
  } finally {
    cleanup(ctx);
  }
});

test('baseline in a non-git directory falls back to walk(), filtering by extension/special-file/excluded-prefix', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), 'a');
    fs.writeFileSync(path.join(ctx.cwd, 'package.json'), '{}');
    fs.writeFileSync(path.join(ctx.cwd, 'readme.txt'), 'not source');
    fs.mkdirSync(path.join(ctx.cwd, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'node_modules', 'excluded.js'), 'a');
    fs.mkdirSync(path.join(ctx.cwd, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'dist', 'excluded.js'), 'a');

    const result = runScript(SCRIPT, ['baseline', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Documentation drift baseline written/);

    const baselinePath = path.join(ctx.cwd, '.xoch', 'docs', 'drift-baseline.json');
    const data = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    assert.ok('top.js' in data.files);
    assert.ok('package.json' in data.files);
    assert.ok(!('readme.txt' in data.files));
    assert.ok(!('node_modules/excluded.js' in data.files));
    assert.ok(!('dist/excluded.js' in data.files));
  } finally {
    cleanup(ctx);
  }
});

test('baseline in a git repo uses git ls-files (tracked + untracked, excluding ignored)', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, '.gitignore'), 'ignored.js\n');
    fs.writeFileSync(path.join(ctx.cwd, 'tracked.js'), 'a');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    fs.writeFileSync(path.join(ctx.cwd, 'untracked.js'), 'b');
    fs.writeFileSync(path.join(ctx.cwd, 'ignored.js'), 'c');

    const result = runScript(SCRIPT, ['baseline', '--root', ctx.cwd, '--baseline', 'custom-baseline.json'], ctx);
    assert.strictEqual(result.status, 0);
    const baselinePath = path.join(ctx.cwd, 'custom-baseline.json');
    const data = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    assert.ok('tracked.js' in data.files);
    assert.ok('untracked.js' in data.files);
    assert.ok(!('ignored.js' in data.files));
  } finally {
    cleanup(ctx);
  }
});

test('check with no baseline present reports an error and exits 1', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['check', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Drift baseline not found/);
  } finally {
    cleanup(ctx);
  }
});

test('check with an unchanged baseline reports no drift, using the default root', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), 'a');
    runScript(SCRIPT, ['baseline'], ctx);
    const result = runScript(SCRIPT, ['check'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /No documentation drift signals\./);
  } finally {
    cleanup(ctx);
  }
});

test('check detects a changed file, an added file, and a removed file, in text mode', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'changed.js'), 'a');
    fs.writeFileSync(path.join(ctx.cwd, 'removed.js'), 'a');
    runScript(SCRIPT, ['baseline', '--root', ctx.cwd], ctx);

    fs.writeFileSync(path.join(ctx.cwd, 'changed.js'), 'b');
    fs.rmSync(path.join(ctx.cwd, 'removed.js'));
    fs.writeFileSync(path.join(ctx.cwd, 'added.js'), 'a');

    const result = runScript(SCRIPT, ['check', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Documentation drift signals:/);
    assert.match(result.stdout, /- added\.js/);
    assert.match(result.stdout, /- changed\.js/);
    assert.match(result.stdout, /- removed\.js/);
  } finally {
    cleanup(ctx);
  }
});

test('check reports drift signals as JSON', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), 'a');
    runScript(SCRIPT, ['baseline', '--root', ctx.cwd], ctx);
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), 'b');
    const result = runScript(SCRIPT, ['check', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.drift, true);
    assert.deepStrictEqual(data.signals, ['top.js']);
    assert.strictEqual(data.since, null);
  } finally {
    cleanup(ctx);
  }
});

test('check --since compares against a git ref instead of the baseline file', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.js'), 'a');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    execFileSync('git', ['-C', ctx.cwd, 'tag', 'base']);
    fs.writeFileSync(path.join(ctx.cwd, 'b.js'), 'b');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'second']);

    const result = runScript(SCRIPT, ['check', '--root', ctx.cwd, '--since', 'base', '--json'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.baseline, null);
    assert.strictEqual(data.since, 'base');
    assert.deepStrictEqual(data.signals, ['b.js']);
  } finally {
    cleanup(ctx);
  }
});

test('check --since with an invalid ref reports an error and exits 1', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.js'), 'a');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);

    const result = runScript(SCRIPT, ['check', '--root', ctx.cwd, '--since', 'does-not-exist'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Unable to compare git ref/);
  } finally {
    cleanup(ctx);
  }
});

test('baseline in an empty git repo with no tracked files handles empty git ls-files output', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    const result = runScript(SCRIPT, ['baseline', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    const baselinePath = path.join(ctx.cwd, '.xoch', 'docs', 'drift-baseline.json');
    const data = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    assert.deepStrictEqual(data.files, {});
  } finally {
    cleanup(ctx);
  }
});

test('baseline hashes a git-tracked (cached) file that was deleted from disk without git rm as null', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'gone.js'), 'a');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    fs.rmSync(path.join(ctx.cwd, 'gone.js'));

    const result = runScript(SCRIPT, ['baseline', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    const baselinePath = path.join(ctx.cwd, '.xoch', 'docs', 'drift-baseline.json');
    const data = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    assert.strictEqual(data.files['gone.js'], null);
  } finally {
    cleanup(ctx);
  }
});

test('check --since with no diff between refs handles empty git diff output', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.js'), 'a');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    execFileSync('git', ['-C', ctx.cwd, 'tag', 'base']);

    const result = runScript(SCRIPT, ['check', '--root', ctx.cwd, '--since', 'base', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.signals, []);
  } finally {
    cleanup(ctx);
  }
});

test('check falls back to an empty files object when the baseline JSON has no "files" key', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, '.xoch', 'docs'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, '.xoch', 'docs', 'drift-baseline.json'), '{}');
    fs.writeFileSync(path.join(ctx.cwd, 'top.js'), 'a');

    const result = runScript(SCRIPT, ['check', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.signals, ['top.js']);
  } finally {
    cleanup(ctx);
  }
});

test('localTimestamp renders both positive and negative UTC offset signs depending on the timezone', () => {
  const ctx = scratch();
  try {
    for (const [tz, expectedSign] of [['Pacific/Kiritimati', '+'], ['America/New_York', '-']]) {
      const result = spawnSync(process.execPath, [SCRIPT, 'baseline', '--root', ctx.cwd], {
        cwd: ctx.cwd,
        env: { ...process.env, HOME: ctx.home, TZ: tz },
        encoding: 'utf8',
      });
      assert.strictEqual(result.status, 0);
      const baselinePath = path.join(ctx.cwd, '.xoch', 'docs', 'drift-baseline.json');
      const data = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      assert.match(data.generated_at, new RegExp(`\\${expectedSign}\\d{4}$`));
      fs.rmSync(baselinePath);
    }
  } finally {
    cleanup(ctx);
  }
});

run();
