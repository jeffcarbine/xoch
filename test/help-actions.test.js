'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'help-actions.js');

function writePrompt(ctx, filename, frontmatterLines) {
  const promptsDir = path.join(ctx.cwd, 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });
  const body = ['---', ...frontmatterLines, '---', '', '# Body', ''].join('\n');
  fs.writeFileSync(path.join(promptsDir, filename), body);
}

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /help-actions\.js list/);
  } finally {
    cleanup(ctx);
  }
});

test('an unrecognized command prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('list errors when the prompts directory does not exist', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout + result.stderr, /Prompts directory not found/);
  } finally {
    cleanup(ctx);
  }
});

test('list prints each command\'s name and description from its own frontmatter', () => {
  const ctx = scratch();
  try {
    writePrompt(ctx, 'doc.md', ['name: xoch-doc', 'description: Create, refresh, or repair documentation']);
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /xoch-doc - Create, refresh, or repair documentation/);
  } finally {
    cleanup(ctx);
  }
});

test('list excludes prompts/README.md', () => {
  const ctx = scratch();
  try {
    writePrompt(ctx, 'doc.md', ['name: xoch-doc', 'description: Docs command']);
    fs.writeFileSync(path.join(ctx.cwd, 'prompts', 'README.md'), '# Prompt authoring guide\n');
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(!result.stdout.includes('README'));
  } finally {
    cleanup(ctx);
  }
});

test('list excludes files under prompts/core/ and prompts/partials/', () => {
  const ctx = scratch();
  try {
    writePrompt(ctx, 'doc.md', ['name: xoch-doc', 'description: Docs command']);
    fs.mkdirSync(path.join(ctx.cwd, 'prompts', 'core'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'prompts', 'core', 'doc-core.md'), '---\nname: xoch-doc-core\n---\n');
    fs.mkdirSync(path.join(ctx.cwd, 'prompts', 'partials'), { recursive: true });
    fs.writeFileSync(path.join(ctx.cwd, 'prompts', 'partials', 'context-economy.md'), 'partial body\n');
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(!result.stdout.includes('doc-core'));
    assert.ok(!result.stdout.includes('context-economy'));
  } finally {
    cleanup(ctx);
  }
});

test('list sorts commands alphabetically by name, not by filename', () => {
  const ctx = scratch();
  try {
    writePrompt(ctx, 'zzz-file.md', ['name: xoch-alpha', 'description: Comes first alphabetically']);
    writePrompt(ctx, 'aaa-file.md', ['name: xoch-beta', 'description: Comes second alphabetically']);
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    const alphaIndex = result.stdout.indexOf('xoch-alpha');
    const betaIndex = result.stdout.indexOf('xoch-beta');
    assert.ok(alphaIndex >= 0 && betaIndex >= 0 && alphaIndex < betaIndex);
  } finally {
    cleanup(ctx);
  }
});

test('a prompt file missing description: is listed with an empty description, not a crash', () => {
  const ctx = scratch();
  try {
    writePrompt(ctx, 'doc.md', ['name: xoch-doc']);
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /xoch-doc - $/m);
  } finally {
    cleanup(ctx);
  }
});

test('a prompt file missing name: falls back to its filename', () => {
  const ctx = scratch();
  try {
    writePrompt(ctx, 'doc.md', ['description: Docs command']);
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /doc - Docs command/);
  } finally {
    cleanup(ctx);
  }
});

test('a prompt file with no frontmatter at all is listed without crashing', () => {
  const ctx = scratch();
  try {
    const promptsDir = path.join(ctx.cwd, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(path.join(promptsDir, 'meow.md'), 'No frontmatter here.\n');
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /meow - $/m);
  } finally {
    cleanup(ctx);
  }
});

test('list --json prints a sorted array of {name, description, file}', () => {
  const ctx = scratch();
  try {
    writePrompt(ctx, 'doc.md', ['name: xoch-doc', 'description: Docs command']);
    writePrompt(ctx, 'spec.md', ['name: xoch-spec', 'description: Spec command']);
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.length, 2);
    assert.deepStrictEqual(data.map((d) => d.name), ['xoch-doc', 'xoch-spec']);
    assert.strictEqual(data[0].description, 'Docs command');
    assert.strictEqual(data[0].file, 'doc.md');
  } finally {
    cleanup(ctx);
  }
});

test('an empty prompts directory yields an empty list, not an error', () => {
  const ctx = scratch();
  try {
    fs.mkdirSync(path.join(ctx.cwd, 'prompts'), { recursive: true });
    const result = runScript(SCRIPT, ['list', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 0);
    assert.deepStrictEqual(JSON.parse(result.stdout), []);
  } finally {
    cleanup(ctx);
  }
});

test('omitting --root defaults to the prompts/ directory next to bin/', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['list', '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    const names = data.map((d) => d.name);
    assert.ok(names.includes('xoch-doc'));
    assert.ok(names.includes('xoch-help'));
  } finally {
    cleanup(ctx);
  }
});

run();
