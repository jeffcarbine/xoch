'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'git-state.js');

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

test('inspecting a non-git directory reports an error and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['inspect', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /Not a git repository/);
  } finally {
    cleanup(ctx);
  }
});

test('a clean repo with no upstream reports clean_handoff true, in JSON mode', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'hi');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    const result = runScript(SCRIPT, ['inspect', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.branch, 'main');
    assert.strictEqual(data.upstream, null);
    assert.strictEqual(data.dirty, false);
    assert.strictEqual(data.ahead, 0);
    assert.strictEqual(data.operation, null);
    assert.deepStrictEqual(data.conflicts, []);
    assert.strictEqual(data.clean_handoff, true);
  } finally {
    cleanup(ctx);
  }
});

test('a clean repo reports the same state in text mode, using the default root', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'hi');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    const result = runScript(SCRIPT, ['inspect'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Branch: main/);
    assert.match(result.stdout, /Upstream: none/);
    assert.match(result.stdout, /Operation: none/);
    assert.match(result.stdout, /Conflicts: none/);
  } finally {
    cleanup(ctx);
  }
});

test('a dirty working tree with local upstream commits ahead is reported', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'hi');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    execFileSync('git', ['-C', ctx.cwd, 'branch', 'upstream-ref']);
    execFileSync('git', ['-C', ctx.cwd, 'branch', '--set-upstream-to=upstream-ref', 'main']);
    fs.writeFileSync(path.join(ctx.cwd, 'b.txt'), 'second');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'second commit']);
    fs.writeFileSync(path.join(ctx.cwd, 'c.txt'), 'untracked change');
    const result = runScript(SCRIPT, ['inspect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.upstream, 'upstream-ref');
    assert.strictEqual(data.ahead, 1);
    assert.strictEqual(data.dirty, true);
    assert.ok(data.changed_count > 0);
    assert.strictEqual(data.clean_handoff, false);
  } finally {
    cleanup(ctx);
  }
});

test('a detached HEAD reports branch as null (JSON) / "detached" (text)', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'hi');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    execFileSync('git', ['-C', ctx.cwd, 'checkout', '-q', '--detach', 'HEAD']);

    const jsonResult = runScript(SCRIPT, ['inspect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(jsonResult.stdout);
    assert.strictEqual(data.branch, null);

    const textResult = runScript(SCRIPT, ['inspect', '--root', ctx.cwd], ctx);
    assert.match(textResult.stdout, /Branch: detached/);
  } finally {
    cleanup(ctx);
  }
});

test('an upstream with zero commits ahead reports ahead: 0 via the parseInt fallback', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'hi');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    execFileSync('git', ['-C', ctx.cwd, 'branch', 'upstream-ref']);
    execFileSync('git', ['-C', ctx.cwd, 'branch', '--set-upstream-to=upstream-ref', 'main']);
    const result = runScript(SCRIPT, ['inspect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.upstream, 'upstream-ref');
    assert.strictEqual(data.ahead, 0);
  } finally {
    cleanup(ctx);
  }
});

test('a merge conflict in text mode lists the conflicted files joined by comma', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'line one\n');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'base']);
    execFileSync('git', ['-C', ctx.cwd, 'checkout', '-q', '-b', 'feature']);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'feature line\n');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'feature change']);
    execFileSync('git', ['-C', ctx.cwd, 'checkout', '-q', 'main']);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'main line\n');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'main change']);
    try {
      execFileSync('git', ['-C', ctx.cwd, 'merge', 'feature'], { stdio: 'ignore' });
    } catch {
      // expected
    }
    const result = runScript(SCRIPT, ['inspect', '--root', ctx.cwd], ctx);
    assert.match(result.stdout, /Conflicts: a\.txt/);
    assert.match(result.stdout, /Operation: merge/);
  } finally {
    cleanup(ctx);
  }
});

test('a merge conflict is reported as operation "merge" with the conflicted file listed', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'line one\n');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'base']);
    execFileSync('git', ['-C', ctx.cwd, 'checkout', '-q', '-b', 'feature']);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'feature line\n');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'feature change']);
    execFileSync('git', ['-C', ctx.cwd, 'checkout', '-q', 'main']);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'main line\n');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'main change']);
    try {
      execFileSync('git', ['-C', ctx.cwd, 'merge', 'feature'], { stdio: 'ignore' });
    } catch {
      // expected: merge conflict makes `git merge` exit non-zero
    }

    // Also touch the other operation markers directly -- the script only
    // checks file existence, so this exercises all four operation flags
    // and the rebase-merge/rebase-apply OR's left-short-circuit branch
    // without needing to orchestrate a real cherry-pick/revert/rebase too.
    const gitDir = path.join(ctx.cwd, '.git');
    fs.writeFileSync(path.join(gitDir, 'CHERRY_PICK_HEAD'), 'x');
    fs.writeFileSync(path.join(gitDir, 'REVERT_HEAD'), 'x');
    fs.mkdirSync(path.join(gitDir, 'rebase-merge'));

    const result = runScript(SCRIPT, ['inspect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.operation, 'merge+cherry-pick+revert+rebase');
    assert.deepStrictEqual(data.conflicts, ['a.txt']);
    assert.strictEqual(data.clean_handoff, false);
  } finally {
    cleanup(ctx);
  }
});

test('rebase-apply alone (without rebase-merge) is still reported as operation "rebase"', () => {
  const ctx = scratch();
  try {
    initRepo(ctx.cwd);
    fs.writeFileSync(path.join(ctx.cwd, 'a.txt'), 'hi');
    execFileSync('git', ['-C', ctx.cwd, 'add', '-A']);
    execFileSync('git', ['-C', ctx.cwd, 'commit', '-q', '-m', 'init']);
    fs.mkdirSync(path.join(ctx.cwd, '.git', 'rebase-apply'));
    const result = runScript(SCRIPT, ['inspect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.operation, 'rebase');
  } finally {
    cleanup(ctx);
  }
});

run();
