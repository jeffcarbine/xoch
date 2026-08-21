'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'dependency-actions.js');

function write(ctx, relPath, content) {
  const full = path.join(ctx.cwd, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function writeHome(ctx, relPath, content) {
  const full = path.join(ctx.home, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

test('no command prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, [], ctx);
    assert.strictEqual(result.status, 2);
  } finally {
    cleanup(ctx);
  }
});

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

test('-h also prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['-h'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
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

test('a missing dependencies file fails with JSON and exit code 1', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.match(data.error, /dependencies file not found/);
  } finally {
    cleanup(ctx);
  }
});

test('invalid JSON in the dependencies file fails with exit code 2', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', 'not json');
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 2);
    const data = JSON.parse(result.stdout);
    assert.match(data.error, /invalid dependencies JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('a dependencies file whose "dependencies" key is not an array fails with exit code 2', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: 'nope' }));
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 2);
    const data = JSON.parse(result.stdout);
    assert.match(data.error, /must contain a dependencies array/);
  } finally {
    cleanup(ctx);
  }
});

test('a non-object dependency entry fails with exit code 2', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: ['bogus'] }));
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 2);
    const data = JSON.parse(result.stdout);
    assert.match(data.error, /dependencies\[0\] must be an object/);
  } finally {
    cleanup(ctx);
  }
});

test('a dependency entry missing a name fails with exit code 2', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{}] }));
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 2);
    const data = JSON.parse(result.stdout);
    assert.match(data.error, /dependencies\[0\]\.name is required/);
  } finally {
    cleanup(ctx);
  }
});

test('a dependency not present in the workspace map is reported as missing, and the exit code is 1', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.resolved.length, 0);
    assert.strictEqual(data.missing.length, 1);
    assert.match(data.missing[0].reason, /not present in/);
  } finally {
    cleanup(ctx);
  }
});

test('invalid JSON in the workspace map fails with exit code 2', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    writeHome(ctx, '.xoch/workspace-map.json', 'not json');
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 2);
    const data = JSON.parse(result.stdout);
    assert.match(data.error, /invalid workspace map JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('a workspace map entry given as a bare string path is treated as { path }', () => {
  const ctx = scratch();
  try {
    const siblingDir = path.join(path.dirname(ctx.cwd), 'sibling-project');
    fs.mkdirSync(siblingDir, { recursive: true });
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    writeHome(ctx, '.xoch/workspace-map.json', JSON.stringify({ projects: { sibling: siblingDir } }));
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.resolved.length, 1);
    assert.strictEqual(data.resolved[0].path, siblingDir);
    assert.strictEqual(data.resolved[0].in_job_scope, false);
  } finally {
    cleanup(ctx);
  }
});

test('a workspace map entry whose mapped path does not exist is reported as missing', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    writeHome(ctx, '.xoch/workspace-map.json', JSON.stringify({ projects: { sibling: { path: path.join(ctx.cwd, 'nope') } } }));
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.missing.length, 1);
    assert.match(data.missing[0].reason, /mapped path does not exist/);
  } finally {
    cleanup(ctx);
  }
});

test('a workspace map entry whose mapped path is a file (not a directory) is reported as missing', () => {
  const ctx = scratch();
  try {
    const filePath = path.join(ctx.cwd, 'not-a-dir.txt');
    fs.writeFileSync(filePath, 'x');
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    writeHome(ctx, '.xoch/workspace-map.json', JSON.stringify({ projects: { sibling: { path: filePath } } }));
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.missing.length, 1);
    assert.match(data.missing[0].reason, /mapped path does not exist/);
  } finally {
    cleanup(ctx);
  }
});

test('a resolved dependency reports in_job_scope true when its name is present in the --scope file', () => {
  const ctx = scratch();
  try {
    const siblingDir = path.join(path.dirname(ctx.cwd), 'scoped-sibling');
    fs.mkdirSync(siblingDir, { recursive: true });
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    writeHome(ctx, '.xoch/workspace-map.json', JSON.stringify({ projects: { sibling: { path: siblingDir } } }));
    write(ctx, 'scope.json', JSON.stringify({ projects: [{ name: 'sibling' }] }));
    const result = runScript(SCRIPT, ['resolve', '--scope', path.join(ctx.cwd, 'scope.json')], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.resolved[0].in_job_scope, true);
    assert.strictEqual(data.resolved[0].documentation, path.join(siblingDir, '.xoch', 'docs'));
  } finally {
    cleanup(ctx);
  }
});

test('a --scope file that does not exist fails with exit code 1', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    const result = runScript(SCRIPT, ['resolve', '--scope', path.join(ctx.cwd, 'missing-scope.json')], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.match(data.error, /scope file not found/);
  } finally {
    cleanup(ctx);
  }
});

test('invalid JSON in the --scope file fails with exit code 2', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    write(ctx, 'scope.json', 'not json');
    const result = runScript(SCRIPT, ['resolve', '--scope', path.join(ctx.cwd, 'scope.json')], ctx);
    assert.strictEqual(result.status, 2);
    const data = JSON.parse(result.stdout);
    assert.match(data.error, /invalid project scope JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('all dependencies resolved reports exit code 0, with a custom --dependencies path honored', () => {
  const ctx = scratch();
  try {
    const siblingDir = path.join(path.dirname(ctx.cwd), 'all-good-sibling');
    fs.mkdirSync(siblingDir, { recursive: true });
    write(ctx, 'custom-deps.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    writeHome(ctx, '.xoch/workspace-map.json', JSON.stringify({ projects: { sibling: { path: siblingDir } } }));
    const result = runScript(SCRIPT, ['resolve', '--dependencies', path.join(ctx.cwd, 'custom-deps.json')], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.missing.length, 0);
  } finally {
    cleanup(ctx);
  }
});

test('a workspace map file whose "projects" key is missing falls back to an empty projects object', () => {
  const ctx = scratch();
  try {
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    writeHome(ctx, '.xoch/workspace-map.json', '{}');
    const result = runScript(SCRIPT, ['resolve'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.missing.length, 1);
    assert.match(data.missing[0].reason, /not present in/);
  } finally {
    cleanup(ctx);
  }
});

test('a --scope file whose "projects" key is missing falls back to an empty scope list', () => {
  const ctx = scratch();
  try {
    const siblingDir = path.join(path.dirname(ctx.cwd), 'no-scope-projects-sibling');
    fs.mkdirSync(siblingDir, { recursive: true });
    write(ctx, '.xoch/docs/dependencies.json', JSON.stringify({ dependencies: [{ name: 'sibling' }] }));
    writeHome(ctx, '.xoch/workspace-map.json', JSON.stringify({ projects: { sibling: { path: siblingDir } } }));
    write(ctx, 'scope.json', '{}');
    const result = runScript(SCRIPT, ['resolve', '--scope', path.join(ctx.cwd, 'scope.json')], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.resolved[0].in_job_scope, false);
  } finally {
    cleanup(ctx);
  }
});

run();
