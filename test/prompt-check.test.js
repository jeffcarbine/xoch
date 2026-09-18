'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { test, run as runTests } from './lib/runner.js';
import { scratch, cleanup, runScript } from './lib/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRIPT = path.join(__dirname, '..', 'bin', 'prompt-check.js');
const REAL_XOCH_JS = path.join(__dirname, '..', 'bin', 'xoch.js');
const REAL_INIT_JS = path.join(__dirname, '..', 'bin', 'init.js');
const REAL_IS_MAIN_JS = path.join(__dirname, '..', 'bin', 'lib', 'is-main.js');

// Pure functions (no process.exit calls) -- safe to import in-process.
const { listJsFilesRecursive, scanForUnresolvedMarkers } = await import(pathToFileURL(SCRIPT).href);

function run(args, ctx) {
  return runScript(SCRIPT, args, ctx);
}

// Direct call to an exported function that may call process.exit(),
// isolated in its own subprocess so a failure exit doesn't kill the test
// runner. Used for checkHelperNaming/checkSyntax/resolveRoot/
// checkClaudeSkill, whose interesting failure branches are either faster
// to construct directly than through the full `run` pipeline, or (for
// checkClaudeSkill) impossible to reach through it at all -- see below.
function callExported(fnName, args, ctx) {
  const specifier = JSON.stringify(pathToFileURL(SCRIPT).href);
  const script = `import(${specifier}).then((m) => m.${fnName}(${args.map((a) => JSON.stringify(a)).join(', ')}));`;
  return spawnSync(process.execPath, ['-e', script], {
    cwd: ctx.cwd,
    env: { ...process.env, HOME: ctx.home },
    encoding: 'utf8',
  });
}

// ---------------------------------------------------------------------
// dispatch / usage
// ---------------------------------------------------------------------

test('--help prints usage and exits 0', () => {
  const ctx = scratch();
  try {
    const result = run(['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('an unrecognized top-level command prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = run(['bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('no arguments at all prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = run([], ctx);
    assert.strictEqual(result.status, 2);
  } finally {
    cleanup(ctx);
  }
});

test('"run -h" and "run --help" print usage and exit 0', () => {
  const ctx = scratch();
  try {
    const short = run(['run', '-h'], ctx);
    assert.strictEqual(short.status, 0);
    assert.match(short.stdout, /Usage:/);
    const long = run(['run', '--help'], ctx);
    assert.strictEqual(long.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown option after "run" prints an error, usage, and exits 2', () => {
  const ctx = scratch();
  try {
    const result = run(['run', '--bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /Unknown option: --bogus/);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// resolveRoot
// ---------------------------------------------------------------------

test('a --root that does not exist fails like a shell cd, exit 1', () => {
  const ctx = scratch();
  try {
    const result = run(['run', '--root', path.join(ctx.cwd, 'nonexistent')], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /cd: .*No such file or directory/);
  } finally {
    cleanup(ctx);
  }
});

test('a --root with no bin/xoch.js fails distinctly, exit 2', () => {
  const ctx = scratch();
  try {
    const emptyRoot = path.join(ctx.cwd, 'empty-root');
    fs.mkdirSync(emptyRoot);
    const result = run(['run', '--root', emptyRoot], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /bin\/xoch\.js not found/);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// checkHelperNaming (direct call)
// ---------------------------------------------------------------------

test('checkHelperNaming is a no-op when bin/ does not exist', () => {
  const ctx = scratch();
  try {
    const result = callExported('checkHelperNaming', [ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('checkHelperNaming passes for well-formed kebab-case helper names', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, 'bin'));
    fs.writeFileSync(path.join(ctx.cwd, 'bin', 'my-helper.js'), '// ok\n');
    const result = callExported('checkHelperNaming', [ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('checkHelperNaming rejects a non-kebab-case helper filename', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, 'bin'));
    fs.writeFileSync(path.join(ctx.cwd, 'bin', 'MyHelper.js'), '// bad name\n');
    const result = callExported('checkHelperNaming', [ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Helper filename is not kebab-case: MyHelper\.js/);
  } finally {
    cleanup(ctx);
  }
});

test('checkHelperNaming skips non-.js files and subdirectories in bin/', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, 'bin', 'lib'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'bin', 'README.txt'), 'ignore me');
    fs.writeFileSync(path.join(ctx.cwd, 'bin', 'lib', 'Weird_Name.js'), '// nested, not scanned at this level\n');
    const result = callExported('checkHelperNaming', [ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// listJsFilesRecursive (pure, in-process)
// ---------------------------------------------------------------------

test('listJsFilesRecursive returns an empty array for a directory that does not exist', () => {
  const ctx = scratch();
  try {
    assert.deepStrictEqual(listJsFilesRecursive(path.join(ctx.cwd, 'missing')), []);
  } finally {
    cleanup(ctx);
  }
});

test('listJsFilesRecursive finds .js files at every nesting depth, ignoring non-.js files', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'src');
    fs.mkdirSync(path.join(dir, 'nested', 'deeper'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'top.js'), '');
    fs.writeFileSync(path.join(dir, 'notes.md'), '');
    fs.writeFileSync(path.join(dir, 'nested', 'mid.js'), '');
    fs.writeFileSync(path.join(dir, 'nested', 'deeper', 'leaf.js'), '');
    const found = listJsFilesRecursive(dir).sort();
    assert.deepStrictEqual(found, [
      path.join(dir, 'nested', 'deeper', 'leaf.js'),
      path.join(dir, 'nested', 'mid.js'),
      path.join(dir, 'top.js'),
    ].sort());
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// checkSyntax (direct call)
// ---------------------------------------------------------------------

test('checkSyntax passes for valid JS in bin/', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, 'bin'));
    fs.writeFileSync(path.join(ctx.cwd, 'bin', 'ok.js'), 'const x = 1;\n');
    const result = callExported('checkSyntax', [ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('checkSyntax fails and exits with the syntax checker\'s own status for a broken helper', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, 'bin'));
    fs.writeFileSync(path.join(ctx.cwd, 'bin', 'broken.js'), 'const x = ;\n');
    const result = callExported('checkSyntax', [ctx.cwd], ctx);
    assert.notStrictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

// DOCUMENTED COVERAGE EXCEPTION (gate-bdd-system, 2026-08-20): no test
// here exercises checkSyntax's `e.status || 1` fallback (bin/prompt-check.js,
// same site marked there). That branch only fires when the `node --check`
// child is killed by a signal rather than exiting normally, and `--check`
// never executes the file being checked -- so nothing in the checked file
// can trigger it. Contrast with the "runInit falls back to exit code 1
// when the init subprocess is killed by a signal" test below, which covers
// an identical-looking `e.status || 1` fallback for runInit: that one IS
// testable, since the executed bin/xoch.js child can self-signal. See
// review.md for the full investigation.

// ---------------------------------------------------------------------
// scanForUnresolvedMarkers (pure, in-process)
// ---------------------------------------------------------------------

test('scanForUnresolvedMarkers returns false for a directory that does not exist', () => {
  const ctx = scratch();
  try {
    assert.strictEqual(scanForUnresolvedMarkers(path.join(ctx.cwd, 'missing')), false);
  } finally {
    cleanup(ctx);
  }
});

test('scanForUnresolvedMarkers returns false when nothing is unresolved', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'prompts');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'clean.md'), 'Nothing to see here.\n');
    assert.strictEqual(scanForUnresolvedMarkers(dir), false);
  } finally {
    cleanup(ctx);
  }
});

test('scanForUnresolvedMarkers detects a leftover {{xoch-partial:...}} marker', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'prompts');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'bad.md'), 'Body {{xoch-partial:whatever}}\n');
    assert.strictEqual(scanForUnresolvedMarkers(dir), true);
  } finally {
    cleanup(ctx);
  }
});

test('scanForUnresolvedMarkers detects a leftover {{VAR}} placeholder, even nested in a subdirectory', () => {
  const ctx = scratch();
  try {
    const dir = path.join(ctx.cwd, 'prompts');
    fs.mkdirSync(path.join(dir, 'core'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'clean.md'), 'Fine.\n');
    fs.writeFileSync(path.join(dir, 'core', 'nested.md'), 'Body {{missing_var}}\n');
    assert.strictEqual(scanForUnresolvedMarkers(dir), true);
  } finally {
    cleanup(ctx);
  }
});

test('runInit falls back to exit code 1 when the init subprocess is killed by a signal rather than exiting normally', () => {
  const ctx = scratch();
  try {
    const root = path.join(ctx.cwd, 'signal-root');
    fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
    // execFileSync's error has status: null (not a number) when the child
    // is killed by a signal instead of exiting -- the only way to force
    // the `e.status || 1` fallback rather than a real (truthy) exit code.
    fs.writeFileSync(path.join(root, 'bin', 'xoch.js'), "process.kill(process.pid, 'SIGTERM');\nsetTimeout(() => {}, 5000);\n");
    const result = callExported('runInit', [root, ctx.home], ctx);
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// checkClaudeSkill (direct call)
//
// This can't be reached through the full `run` pipeline: xoch init
// always installs a prompt and its Claude skill together (already proven
// 100%-covered in its own test file), and the temp $HOME `run` uses is
// randomly generated internally with no way to intercept it mid-run. So
// these fixtures build a tempHome-shaped directory directly.
// ---------------------------------------------------------------------

function tempHomeFixture(ctx) {
  const home = path.join(ctx.cwd, 'temp-home');
  fs.mkdirSync(path.join(home, '.xoch', 'prompts'), { recursive: true });
  fs.mkdirSync(path.join(home, '.claude', 'skills'), { recursive: true });
  return home;
}

test('checkClaudeSkill is a no-op when the rendered prompts directory does not exist', () => {
  const ctx = scratch();
  try {
    const result = callExported('checkClaudeSkill', [path.join(ctx.cwd, 'nonexistent-home')], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('checkClaudeSkill skips non-.md and non-file entries in the prompts directory', () => {
  const ctx = scratch();
  try {
    const home = tempHomeFixture(ctx);
    fs.writeFileSync(path.join(home, '.xoch', 'prompts', 'README.txt'), 'ignore');
    fs.mkdirSync(path.join(home, '.xoch', 'prompts', 'core'));
    const result = callExported('checkClaudeSkill', [home], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

test('checkClaudeSkill fails when a rendered prompt has no matching Claude skill', () => {
  const ctx = scratch();
  try {
    const home = tempHomeFixture(ctx);
    fs.writeFileSync(path.join(home, '.xoch', 'prompts', 'meow.md'), 'body');
    const result = callExported('checkClaudeSkill', [home], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /missing Claude skill xoch-meow/);
  } finally {
    cleanup(ctx);
  }
});

test('checkClaudeSkill fails when the Claude skill permits model invocation', () => {
  const ctx = scratch();
  try {
    const home = tempHomeFixture(ctx);
    fs.writeFileSync(path.join(home, '.xoch', 'prompts', 'meow.md'), 'body');
    const skillDir = path.join(home, '.claude', 'skills', 'xoch-meow');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: meow\n---\n\nBody, no invocation guard.\n');
    const result = callExported('checkClaudeSkill', [home], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /permits model invocation/);
  } finally {
    cleanup(ctx);
  }
});

test('checkClaudeSkill passes when every prompt has a correctly-guarded Claude skill', () => {
  const ctx = scratch();
  try {
    const home = tempHomeFixture(ctx);
    fs.writeFileSync(path.join(home, '.xoch', 'prompts', 'meow.md'), 'body');
    const skillDir = path.join(home, '.claude', 'skills', 'xoch-meow');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: meow\ndisable-model-invocation: true\n---\n\nBody.\n');
    const result = callExported('checkClaudeSkill', [home], ctx);
    assert.strictEqual(result.status, 0);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// full pipeline (`run`) -- real bin/xoch.js + bin/init.js, real
// subprocess, slower
// ---------------------------------------------------------------------

function buildFixtureRoot(ctx) {
  const root = path.join(ctx.cwd, 'fixture-repo');
  fs.mkdirSync(path.join(root, 'bin', 'lib'), { recursive: true });
  fs.mkdirSync(path.join(root, 'prompts', 'partials'), { recursive: true });
  // bin/xoch.js's own module-load package.json read (readFileSync off an
  // import.meta.url-derived path) needs a real file here regardless of
  // which subcommand runs. "type": "module" is required too -- Node
  // resolves each copied script's module system from the nearest
  // package.json, and the copied bin/xoch.js and bin/init.js use ESM
  // import/export syntax.
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0-test', type: 'module' }));
  fs.copyFileSync(REAL_XOCH_JS, path.join(root, 'bin', 'xoch.js'));
  fs.copyFileSync(REAL_INIT_JS, path.join(root, 'bin', 'init.js'));
  // Both copied scripts import ./lib/is-main.js (their require.main-
  // equivalent CLI-entry guard) relative to their own location, so this
  // fixture needs a real copy alongside them too.
  fs.copyFileSync(REAL_IS_MAIN_JS, path.join(root, 'bin', 'lib', 'is-main.js'));
  fs.writeFileSync(path.join(root, 'bin', 'helper-one.js'), '// noop\n');
  fs.writeFileSync(path.join(root, 'bin', 'lib', 'sub-helper.js'), '// noop\n');
  fs.writeFileSync(path.join(root, 'prompts', 'meow.md'), '---\nname: meow\ndescription: A test prompt\n---\n\nHello, meow.\n');
  return root;
}

test('run passes end to end against a small, valid fixture repo', () => {
  const ctx = scratch();
  try {
    const root = buildFixtureRoot(ctx);
    const result = run(['run', '--root', root], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Xoch prompt and helper checks passed\./);
  } finally {
    cleanup(ctx);
  }
});

test('run fails fast on a non-kebab-case helper before ever installing anything', () => {
  const ctx = scratch();
  try {
    const root = buildFixtureRoot(ctx);
    fs.writeFileSync(path.join(root, 'bin', 'BadName.js'), '// bad\n');
    const result = run(['run', '--root', root], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /not kebab-case/);
  } finally {
    cleanup(ctx);
  }
});

test('run fails when xoch init itself fails', () => {
  const ctx = scratch();
  try {
    const root = buildFixtureRoot(ctx);
    fs.rmSync(path.join(root, 'prompts'), { recursive: true, force: true });
    const result = run(['run', '--root', root], ctx);
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('run fails on an unresolved partial marker left in a rendered prompt', () => {
  const ctx = scratch();
  try {
    const root = buildFixtureRoot(ctx);
    fs.writeFileSync(path.join(root, 'prompts', 'meow.md'), '---\nname: meow\n---\n\n{{stray_var}}\n');
    const result = run(['run', '--root', root], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unresolved partial or variable/);
  } finally {
    cleanup(ctx);
  }
});

runTests();
