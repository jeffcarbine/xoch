'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { test, run } from './lib/runner.js';
import { spawnSync } from 'child_process';
import { scratch, scratchInRepo, cleanup, runScript } from './lib/cli.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRIPT = path.join(__dirname, '..', 'bin', 'conventions-actions.js');

const DOC = `---
generated: 2026-10-25
---

## Testing

### CV-015: Tests use the shared runner
- scope: test/**/*.test.js
- status: confirmed
- confidence: high

## General

### CV-001: Prefer early returns
- status: inferred
- confidence: medium

### CV-011: Export main(argv) alongside the CLI entry
- scope: bin/*.js, !bin/lib/**
- status: confirmed
- confidence: high
`;

function centralDocPath(ctx) {
  return path.join(ctx.home, '.xoch', 'projects', 'proj', 'docs', 'conventions.md');
}

// In-repo storage resolves from process.cwd(), which is the real path
// (macOS's tmpdir is a /var -> /private/var symlink).
function inRepoDocPath(ctx) {
  return path.join(fs.realpathSync(ctx.cwd), '.xoch', 'docs', 'conventions.md');
}

function writeDoc(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function rulesJson(ctx, files) {
  const result = runScript(SCRIPT, ['rules', '--json', '--files', ...files], ctx);
  return { ...result, json: result.stdout ? JSON.parse(result.stdout) : null };
}

test('no command prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    assert.strictEqual(runScript(SCRIPT, [], ctx).status, 2);
  } finally {
    cleanup(ctx);
  }
});

test('--help and -h print usage', () => {
  const ctx = scratch();
  try {
    for (const flag of ['--help', '-h']) {
      const result = runScript(SCRIPT, [flag], ctx);
      assert.strictEqual(result.status, 0);
      assert.match(result.stdout, /Usage:/);
    }
  } finally {
    cleanup(ctx);
  }
});

test('an unknown command exits 2 with an error', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /Error: unknown command: bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('rules without any files exits 2 with an error', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['rules', '--json'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--files/);
  } finally {
    cleanup(ctx);
  }
});

test('with centralized storage, the conventions file is read from the project\'s central docs folder', () => {
  const ctx = scratch();
  try {
    writeDoc(centralDocPath(ctx), DOC);
    const { status, json } = rulesJson(ctx, ['bin/xoch.js']);
    assert.strictEqual(status, 0);
    assert.strictEqual(json.path, centralDocPath(ctx));
    assert.strictEqual(json.exists, true);
  } finally {
    cleanup(ctx);
  }
});

test('with in-repo storage, the conventions file is read from the repo\'s .xoch/docs folder', () => {
  const ctx = scratchInRepo();
  try {
    writeDoc(inRepoDocPath(ctx), DOC);
    writeDoc(centralDocPath(ctx), '### not a rule\n');
    const { status, json } = rulesJson(ctx, ['bin/xoch.js']);
    assert.strictEqual(status, 0);
    assert.strictEqual(json.path, inRepoDocPath(ctx));
    assert.strictEqual(json.exists, true);
  } finally {
    cleanup(ctx);
  }
});

test('with no conventions file, rules reports exists false and an empty list and exits 0', () => {
  const ctx = scratch();
  try {
    const { status, json } = rulesJson(ctx, ['bin/xoch.js']);
    assert.strictEqual(status, 0);
    assert.deepStrictEqual(json, {
      path: centralDocPath(ctx), exists: false, files: ['bin/xoch.js'], unmatched: [], rules: [],
    });
  } finally {
    cleanup(ctx);
  }
});

test('a rule is returned only when at least one given file is in its scope, and lists exactly the files it matched', () => {
  const ctx = scratch();
  try {
    writeDoc(centralDocPath(ctx), DOC);
    const { json } = rulesJson(ctx, ['test/a.test.js', 'bin/lib/git.js']);
    assert.deepStrictEqual(json.rules.map((r) => [r.id, r.matched]), [
      ['CV-015', ['test/a.test.js']],
      ['CV-001', ['test/a.test.js', 'bin/lib/git.js']],
    ]);
    assert.deepStrictEqual(json.rules[0], {
      id: 'CV-015',
      statement: 'Tests use the shared runner',
      category: 'Testing',
      scope: ['test/**/*.test.js'],
      status: 'confirmed',
      confidence: 'high',
      evidence: null,
      matched: ['test/a.test.js'],
    });
  } finally {
    cleanup(ctx);
  }
});

test('absolute and dot-dot paths are normalized to repo-relative paths, and paths outside the repo are reported as unmatched', () => {
  const ctx = scratch();
  try {
    writeDoc(centralDocPath(ctx), DOC);
    const outside = path.join(ctx.home, 'elsewhere.js');
    const { json } = rulesJson(ctx, [path.join(ctx.cwd, 'bin', 'xoch.js'), 'test/../bin/init.js', outside, '../proj']);
    assert.deepStrictEqual(json.files, ['bin/xoch.js', 'bin/init.js']);
    assert.deepStrictEqual(json.unmatched, [outside, '../proj']);
    assert.deepStrictEqual(json.rules.find((r) => r.id === 'CV-011').matched, ['bin/xoch.js', 'bin/init.js']);
  } finally {
    cleanup(ctx);
  }
});

test('a malformed conventions file makes rules exit non-zero with the offending line', () => {
  const ctx = scratch();
  try {
    writeDoc(centralDocPath(ctx), '## X\n\n### Use tabs\n');
    const { status, json } = rulesJson(ctx, ['bin/xoch.js']);
    assert.strictEqual(status, 1);
    assert.strictEqual(json.line, 3);
    assert.match(json.error, /CV-/);
  } finally {
    cleanup(ctx);
  }
});

test('without --json, rules prints a readable list and parse errors go to stderr', () => {
  const ctx = scratch();
  try {
    writeDoc(centralDocPath(ctx), DOC);
    const ok = runScript(SCRIPT, ['rules', '--files', 'bin/xoch.js', '../x.js'], ctx);
    assert.strictEqual(ok.status, 0);
    assert.match(ok.stdout, /CV-011 \[confirmed\] Export main\(argv\) alongside the CLI entry\n {2}matched: bin\/xoch\.js/);
    assert.ok(!/CV-015/.test(ok.stdout));
    assert.match(ok.stdout, /Outside the repo, not checked: \.\.\/x\.js/);

    writeDoc(centralDocPath(ctx), '### Use tabs\n');
    const bad = runScript(SCRIPT, ['rules', '--files', 'bin/xoch.js'], ctx);
    assert.strictEqual(bad.status, 1);
    assert.match(bad.stderr, /line 1/);
  } finally {
    cleanup(ctx);
  }
});

test('without --json, a missing conventions file is reported plainly', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['rules', '--files', 'bin/xoch.js'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /No conventions file/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// scan -- run against real temporary git repos. PATH is narrowed to a
// folder holding only `git` (and, per test, a fake `gh` shell script), so
// the machine's own gh never leaks in.

const REAL_GIT = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();

function fakeBin(ctx, ghScript) {
  const dir = path.join(ctx.home, 'fakebin');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.symlinkSync(REAL_GIT, path.join(dir, 'git'));
  if (ghScript) {
    fs.writeFileSync(path.join(dir, 'gh'), `#!/bin/sh\n${ghScript}\n`);
    fs.chmodSync(path.join(dir, 'gh'), 0o755);
  }
  return dir;
}

function scan(ctx, args, ghScript) {
  const result = spawnSync(process.execPath, [SCRIPT, 'scan', ...args], {
    cwd: ctx.cwd,
    env: { ...process.env, HOME: ctx.home, PATH: fakeBin(ctx, ghScript) },
    encoding: 'utf8',
  });
  const json = args.includes('--json') && result.stdout ? JSON.parse(result.stdout) : null;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

function g(ctx, args, author = 'Ada Lovelace <ada@example.com>') {
  const [, name, email] = author.match(/^(.*) <(.*)>$/);
  const env = {
    ...process.env, HOME: ctx.home, GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email,
  };
  const result = spawnSync(REAL_GIT, ['-C', ctx.cwd, '-c', 'commit.gpgsign=false', ...args], { env, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function commitFile(ctx, file, text, subject, author) {
  const full = path.join(ctx.cwd, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
  g(ctx, ['add', '-A']);
  g(ctx, ['commit', '-q', '-m', subject], author);
}

function initRepo(ctx, branch = 'main') {
  g(ctx, ['init', '-q', '-b', branch]);
  commitFile(ctx, 'README.md', '# proj\n', 'Initial commit');
}

test('scan outside a git repository exits 1 with an error', () => {
  const ctx = scratch();
  try {
    const { status, json } = scan(ctx, ['--json']);
    assert.strictEqual(status, 1);
    assert.match(json.error, /not a git repository/);
  } finally {
    cleanup(ctx);
  }
});

test('scan rejects a threshold or limit that is not a positive whole number', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    const result = scan(ctx, ['--json', '--min-occurrences', 'three']);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--min-occurrences must be a positive whole number/);
  } finally {
    cleanup(ctx);
  }
});

test('small follow-up commits that mention nits, lint, renames, or review feedback are reported, without author names', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    commitFile(ctx, 'src/a.js', 'var a = 1;\n', 'Add a (#1)');
    commitFile(ctx, 'src/a.js', 'const a = 1;\n', 'Address review feedback (#1)');
    commitFile(ctx, 'src/big.js', `${'x\n'.repeat(30)}`, 'fix lint (#2)');
    commitFile(ctx, 'logo.bin', Buffer.from([0, 1, 2, 0, 255]), 'rename logo (#3)');
    commitFile(ctx, 'src/c.js', 'let c;\n', 'Add the c module (#4)');
    commitFile(ctx, 'src/d.js', 'let d;\n', 'fix nits', 'dependabot[bot] <bot@dependabot.com>');
    const { status, json } = scan(ctx, ['--json']);
    assert.strictEqual(status, 0);
    assert.strictEqual(json.base, 'main');
    assert.strictEqual(json.commits_scanned, 7);
    assert.deepStrictEqual(json.fixup_commits.map((c) => [c.subject, c.unit, c.files, c.lines]), [
      ['Address review feedback (#1)', 'pr:1', ['src/a.js'], 2],
    ]);
    assert.ok(!/Ada|Lovelace|ada@example/.test(JSON.stringify(json)));

    const withBots = scan(ctx, ['--json', '--include-bots']).json;
    assert.deepStrictEqual(withBots.fixup_commits.map((c) => c.subject), ['fix nits', 'Address review feedback (#1)']);
    assert.match(withBots.fixup_commits[0].unit, /^commit:[0-9a-f]{7}$/);
  } finally {
    cleanup(ctx);
  }
});

test('a repeated token swap is reported only when it meets the occurrence and PR thresholds, and the flags change that', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    commitFile(ctx, 'src/a.js', 'var a = 1;\nvar b = 2;\n', 'Add a and b (#1)');
    commitFile(ctx, 'src/a.js', 'const a = 1;\nconst b = 2;\n', 'nits (#1)');
    // Commits merged as PR #7 through a merge commit rather than a squash.
    g(ctx, ['checkout', '-q', '-b', 'feature']);
    commitFile(ctx, 'src/e.js', 'var e = 5;\n', 'Add e');
    commitFile(ctx, 'src/e.js', 'const e = 5;\n', 'address comments');
    g(ctx, ['checkout', '-q', 'main']);
    g(ctx, ['merge', '-q', '--no-ff', 'feature', '-m', 'Merge pull request #7 from someone/feature']);

    const defaults = scan(ctx, ['--json']).json;
    assert.deepStrictEqual(defaults.thresholds, { min_occurrences: 3, min_prs: 2 });
    assert.deepStrictEqual(defaults.token_substitutions, [
      { from: 'var', to: 'const', occurrences: 3, prs: ['pr:1', 'pr:7'], files: ['src/a.js', 'src/e.js'] },
    ]);
    assert.deepStrictEqual(scan(ctx, ['--json', '--min-prs', '3']).json.token_substitutions, []);
    assert.deepStrictEqual(scan(ctx, ['--json', '--min-occurrences', '4']).json.token_substitutions, []);
    assert.strictEqual(scan(ctx, ['--json', '--limit', '1']).json.commits_scanned, 1);
  } finally {
    cleanup(ctx);
  }
});

test('the base branch comes from --base, then origin/HEAD, then main, then master, then HEAD', () => {
  const ctx = scratch();
  try {
    initRepo(ctx, 'master');
    assert.strictEqual(scan(ctx, ['--json']).json.base, 'master');
    g(ctx, ['branch', '-q', '-m', 'trunk']);
    assert.strictEqual(scan(ctx, ['--json']).json.base, 'HEAD');
    assert.strictEqual(scan(ctx, ['--json', '--base', 'trunk']).json.base, 'trunk');

    const clone = { home: ctx.home, cwd: path.join(ctx.home, 'clone') };
    spawnSync(REAL_GIT, ['clone', '-q', ctx.cwd, clone.cwd]);
    assert.strictEqual(scan(clone, ['--json']).json.base, 'origin/trunk');
  } finally {
    cleanup(ctx);
  }
});

test('when gh is not installed, scan still succeeds and reports gh_available false', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    const { status, json } = scan(ctx, ['--json']);
    assert.strictEqual(status, 0);
    assert.strictEqual(json.gh_available, false);
    assert.strictEqual(json.gh_reason, 'gh is not installed');
    assert.deepStrictEqual(json.review_comments, []);
  } finally {
    cleanup(ctx);
  }
});

test('when gh is not authenticated, scan still succeeds and reports why', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    const { status, json } = scan(ctx, ['--json'], 'exit 1');
    assert.strictEqual(status, 0);
    assert.strictEqual(json.gh_available, false);
    assert.strictEqual(json.gh_reason, 'gh is not authenticated');
  } finally {
    cleanup(ctx);
  }
});

test('when gh is available, merged PR review comments are included without reviewer names, and bots are excluded', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    const longBody = 'b'.repeat(400);
    const gh = `
case "$1 $2" in
  "auth status") exit 0 ;;
  "pr list")
    case "$*" in *"--base main"*"--limit 2"*) ;; *) echo "unexpected: $*" >&2; exit 1 ;; esac
    printf '%s' '[{"number":5,"author":{"login":"ada","is_bot":false}},{"number":6,"author":{"login":"dependabot","is_bot":true}}]' ;;
  "api repos/{owner}/{repo}/pulls/5/comments")
    printf '%s\\n' '{"path":"src/a.js","body":"Prefer const here","user":{"login":"grace","type":"User"}}'
    printf '%s\\n' '{"path":"src/a.js","body":"LGTM","user":{"login":"ci-bot[bot]","type":"Bot"}}'
    printf '%s\\n' '{"path":"src/b.js","body":"${longBody}","user":{"login":"linus","type":"User"}}' ;;
  *) echo "unexpected: $*" >&2; exit 1 ;;
esac`;
    const { status, json, stderr } = scan(ctx, ['--json', '--max-prs', '2'], gh);
    assert.strictEqual(status, 0, stderr);
    assert.strictEqual(json.gh_available, true);
    assert.strictEqual(json.gh_reason, null);
    assert.strictEqual(json.pr_count, 1);
    assert.deepStrictEqual(json.review_comments, [
      { pr: 5, path: 'src/a.js', body: 'Prefer const here' },
      { pr: 5, path: 'src/b.js', body: `${'b'.repeat(300)}...` },
    ]);
    assert.ok(!/grace|linus|ada/.test(JSON.stringify(json)));
  } finally {
    cleanup(ctx);
  }
});

test('a failing gh call is reported instead of crashing the scan', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    const gh = 'case "$1 $2" in "auth status") exit 0 ;; *) echo "boom" >&2; exit 1 ;; esac';
    const { status, json } = scan(ctx, ['--json'], gh);
    assert.strictEqual(status, 0);
    assert.strictEqual(json.gh_available, false);
    assert.match(json.gh_reason, /gh pr list failed: boom/);
  } finally {
    cleanup(ctx);
  }
});

test('scan lists linter and formatter configs found at the repo root', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    fs.writeFileSync(path.join(ctx.cwd, '.editorconfig'), 'root = true\n');
    assert.deepStrictEqual(scan(ctx, ['--json']).json.linters, [{ tool: 'editorconfig', file: '.editorconfig' }]);
  } finally {
    cleanup(ctx);
  }
});

test('without --json, scan prints a short summary', () => {
  const ctx = scratch();
  try {
    initRepo(ctx);
    fs.writeFileSync(path.join(ctx.cwd, '.editorconfig'), 'root = true\n');
    const plain = scan(ctx, []);
    assert.strictEqual(plain.status, 0);
    assert.match(plain.stdout, /Base: main \(1 commits scanned\)/);
    assert.match(plain.stdout, /Review follow-up commits: 0/);
    assert.match(plain.stdout, /Token substitutions: 0/);
    assert.match(plain.stdout, /Review comments: 0 \(gh is not installed\)/);
    assert.match(plain.stdout, /Linters: editorconfig/);

    const gh = 'case "$1 $2" in "auth status") exit 0 ;; "pr list") printf "[]" ;; esac';
    const withGh = scan(ctx, [], gh);
    assert.match(withGh.stdout, /Review comments: 0 from 0 PRs/);
    fs.rmSync(path.join(ctx.cwd, '.editorconfig'));
    assert.match(scan(ctx, []).stdout, /Linters: none/);
  } finally {
    cleanup(ctx);
  }
});

run();
