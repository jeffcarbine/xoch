'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'workspace-actions.js');

function defaultMapPath(ctx) {
  return path.join(ctx.home, '.xoch', 'workspace-map.json');
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

test('-h prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['-h'], ctx);
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
    assert.match(result.stderr, /unknown command: bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('list on a fresh (nonexistent) map reports no projects mapped', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['list'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /No Xoch workspace projects mapped\./);
  } finally {
    cleanup(ctx);
  }
});

test('list --json on a fresh map prints the default structure', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['list', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.version, 1);
    assert.deepStrictEqual(data.projects, {});
  } finally {
    cleanup(ctx);
  }
});

test('add requires --name', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['add', '--path', ctx.cwd], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--name is required/);
  } finally {
    cleanup(ctx);
  }
});

test('add rejects a name with characters outside letters, numbers, dots, underscores, hyphens', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['add', '--name', 'bad name', '--path', ctx.cwd], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /project names may contain only/);
  } finally {
    cleanup(ctx);
  }
});

test('add requires --path', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['add', '--name', 'proj'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--path is required/);
  } finally {
    cleanup(ctx);
  }
});

test('add rejects a path that does not exist', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['add', '--name', 'proj', '--path', path.join(ctx.cwd, 'missing')], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /project path does not exist/);
  } finally {
    cleanup(ctx);
  }
});

test('add maps a project and it appears in list', () => {
  const ctx = scratch();
  try {
    const projectDir = path.join(ctx.cwd, 'proj');
    fs.mkdirSync(projectDir);
    const addResult = runScript(SCRIPT, ['add', '--name', 'proj', '--path', projectDir], ctx);
    assert.strictEqual(addResult.status, 0);
    assert.match(addResult.stdout, /Workspace project mapped: proj -> /);
    assert.ok(fs.existsSync(defaultMapPath(ctx)));

    const listResult = runScript(SCRIPT, ['list'], ctx);
    assert.match(listResult.stdout, new RegExp(`proj: ${projectDir}`));
  } finally {
    cleanup(ctx);
  }
});

test('re-adding the same name at the same path succeeds without --replace', () => {
  const ctx = scratch();
  try {
    const projectDir = path.join(ctx.cwd, 'proj');
    fs.mkdirSync(projectDir);
    runScript(SCRIPT, ['add', '--name', 'proj', '--path', projectDir], ctx);
    const result = runScript(SCRIPT, ['add', '--name', 'proj', '--path', projectDir], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Workspace project mapped: proj -> /);
  } finally {
    cleanup(ctx);
  }
});

test('adding the same name at a different path without --replace is rejected', () => {
  const ctx = scratch();
  try {
    const first = path.join(ctx.cwd, 'first');
    const second = path.join(ctx.cwd, 'second');
    fs.mkdirSync(first);
    fs.mkdirSync(second);
    runScript(SCRIPT, ['add', '--name', 'proj', '--path', first], ctx);
    const result = runScript(SCRIPT, ['add', '--name', 'proj', '--path', second], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /already maps to/);
  } finally {
    cleanup(ctx);
  }
});

test('adding the same name at a different path with --replace succeeds', () => {
  const ctx = scratch();
  try {
    const first = path.join(ctx.cwd, 'first');
    const second = path.join(ctx.cwd, 'second');
    fs.mkdirSync(first);
    fs.mkdirSync(second);
    runScript(SCRIPT, ['add', '--name', 'proj', '--path', first], ctx);
    const result = runScript(SCRIPT, ['add', '--name', 'proj', '--path', second, '--replace'], ctx);
    assert.strictEqual(result.status, 0);
    const listResult = runScript(SCRIPT, ['list'], ctx);
    assert.match(listResult.stdout, new RegExp(`proj: ${second}`));
  } finally {
    cleanup(ctx);
  }
});

test('a collision against an entry with no recorded path is reported using an empty path', () => {
  const ctx = scratch();
  try {
    const mapPath = defaultMapPath(ctx);
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, JSON.stringify({ version: 1, projects: { proj: {} } }));
    const projectDir = path.join(ctx.cwd, 'proj');
    fs.mkdirSync(projectDir);
    const result = runScript(SCRIPT, ['add', '--name', 'proj', '--path', projectDir], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /proj already maps to/);
  } finally {
    cleanup(ctx);
  }
});

test('remove requires --name', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['remove'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /--name is required/);
  } finally {
    cleanup(ctx);
  }
});

test('remove rejects a name that is not mapped', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['remove', '--name', 'nope'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /workspace project not found: nope/);
  } finally {
    cleanup(ctx);
  }
});

test('remove deletes a mapped project', () => {
  const ctx = scratch();
  try {
    const projectDir = path.join(ctx.cwd, 'proj');
    fs.mkdirSync(projectDir);
    runScript(SCRIPT, ['add', '--name', 'proj', '--path', projectDir], ctx);
    const result = runScript(SCRIPT, ['remove', '--name', 'proj'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Workspace project removed: proj/);
    const listResult = runScript(SCRIPT, ['list'], ctx);
    assert.match(listResult.stdout, /No Xoch workspace projects mapped\./);
  } finally {
    cleanup(ctx);
  }
});

test('validate on an empty map reports valid', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['validate'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Workspace map valid: .* \(0 projects\)/);
  } finally {
    cleanup(ctx);
  }
});

test('validate --json reports a structured result', () => {
  const ctx = scratch();
  try {
    const projectDir = path.join(ctx.cwd, 'proj');
    fs.mkdirSync(projectDir);
    runScript(SCRIPT, ['add', '--name', 'proj', '--path', projectDir], ctx);
    const result = runScript(SCRIPT, ['validate', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.valid, true);
    assert.strictEqual(data.project_count, 1);
    assert.deepStrictEqual(data.errors, []);
  } finally {
    cleanup(ctx);
  }
});

test('validate reports a project whose path no longer exists', () => {
  const ctx = scratch();
  try {
    const mapPath = defaultMapPath(ctx);
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(
      mapPath,
      JSON.stringify({ version: 1, projects: { gone: { path: path.join(ctx.cwd, 'missing') } } })
    );
    const result = runScript(SCRIPT, ['validate'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Workspace map invalid/);
    assert.match(result.stderr, /gone: path does not exist/);
  } finally {
    cleanup(ctx);
  }
});

test('validate reports a project entry with a missing path', () => {
  const ctx = scratch();
  try {
    const mapPath = defaultMapPath(ctx);
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, JSON.stringify({ version: 1, projects: { empty: { path: '' } } }));
    const result = runScript(SCRIPT, ['validate'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /empty: missing path/);
  } finally {
    cleanup(ctx);
  }
});

test('validate reports two projects that map to the same path as duplicates', () => {
  const ctx = scratch();
  try {
    const projectDir = path.join(ctx.cwd, 'proj');
    fs.mkdirSync(projectDir);
    const mapPath = defaultMapPath(ctx);
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(
      mapPath,
      JSON.stringify({
        version: 1,
        projects: { a: { path: projectDir }, b: { path: projectDir } },
      })
    );
    const result = runScript(SCRIPT, ['validate'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /b: path is also mapped as a/);
  } finally {
    cleanup(ctx);
  }
});

test('an unreadable/invalid JSON map file is rejected', () => {
  const ctx = scratch();
  try {
    const mapPath = defaultMapPath(ctx);
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, '{ not valid json');
    const result = runScript(SCRIPT, ['list'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /invalid workspace map JSON/);
  } finally {
    cleanup(ctx);
  }
});

test('a map whose "projects" value is a string is rejected', () => {
  const ctx = scratch();
  try {
    const mapPath = defaultMapPath(ctx);
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, JSON.stringify({ version: 1, projects: 'nope' }));
    const result = runScript(SCRIPT, ['list'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /workspace map must contain a projects object/);
  } finally {
    cleanup(ctx);
  }
});

test('a map whose "projects" value is null is rejected', () => {
  const ctx = scratch();
  try {
    const mapPath = defaultMapPath(ctx);
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, JSON.stringify({ version: 1, projects: null }));
    const result = runScript(SCRIPT, ['list'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /workspace map must contain a projects object/);
  } finally {
    cleanup(ctx);
  }
});

test('a map whose "projects" value is an array is rejected', () => {
  const ctx = scratch();
  try {
    const mapPath = defaultMapPath(ctx);
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, JSON.stringify({ version: 1, projects: [] }));
    const result = runScript(SCRIPT, ['list'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /workspace map must contain a projects object/);
  } finally {
    cleanup(ctx);
  }
});

test('a custom --map path is honored instead of the default location', () => {
  const ctx = scratch();
  try {
    const customMap = path.join(ctx.cwd, 'custom-map.json');
    const projectDir = path.join(ctx.cwd, 'proj');
    fs.mkdirSync(projectDir);
    const result = runScript(SCRIPT, ['add', '--name', 'proj', '--path', projectDir, '--map', customMap], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(fs.existsSync(customMap));
    assert.ok(!fs.existsSync(defaultMapPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

run();
