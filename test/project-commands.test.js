'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'project-commands.js');

function write(ctx, relPath, content) {
  const full = path.join(ctx.cwd, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
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

test('missing --root defaults to the current working directory', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['detect'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Managers: unknown/);
  } finally {
    cleanup(ctx);
  }
});

test('--root that does not exist reports an error and exits 1', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['detect', '--root', path.join(ctx.cwd, 'missing')], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Project root not found/);
  } finally {
    cleanup(ctx);
  }
});

test('an empty project detects no managers or commands, in text mode', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Managers: unknown/);
  } finally {
    cleanup(ctx);
  }
});

test('a package.json with some scripts present detects npm and only the present scripts', () => {
  const ctx = scratch();
  try {
    write(ctx, 'package.json', JSON.stringify({ scripts: { test: 'node --test', build: 'node build.js' } }));
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['npm']);
    const commands = data.commands.map((c) => c.command);
    assert.ok(commands.includes('npm run test'));
    assert.ok(commands.includes('npm run build'));
    assert.strictEqual(commands.length, 2);
  } finally {
    cleanup(ctx);
  }
});

test('a malformed package.json falls back to an empty scripts object via readJsonSafe', () => {
  const ctx = scratch();
  try {
    write(ctx, 'package.json', '{ not valid json');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['npm']);
    assert.deepStrictEqual(data.commands, []);
  } finally {
    cleanup(ctx);
  }
});

test('bun.lockb selects the bun package manager', () => {
  const ctx = scratch();
  try {
    write(ctx, 'package.json', JSON.stringify({ scripts: { test: 'bun test' } }));
    write(ctx, 'bun.lockb', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['bun']);
    assert.strictEqual(data.commands[0].command, 'bun run test');
  } finally {
    cleanup(ctx);
  }
});

test('bun.lock (without bun.lockb) also selects the bun package manager', () => {
  const ctx = scratch();
  try {
    write(ctx, 'package.json', JSON.stringify({ scripts: { test: 'bun test' } }));
    write(ctx, 'bun.lock', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['bun']);
  } finally {
    cleanup(ctx);
  }
});

test('pnpm-lock.yaml selects the pnpm package manager', () => {
  const ctx = scratch();
  try {
    write(ctx, 'package.json', JSON.stringify({ scripts: { test: 'echo test' } }));
    write(ctx, 'pnpm-lock.yaml', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['pnpm']);
    assert.strictEqual(data.commands[0].command, 'pnpm test');
  } finally {
    cleanup(ctx);
  }
});

test('yarn.lock selects the yarn package manager, in text mode', () => {
  const ctx = scratch();
  try {
    write(ctx, 'package.json', JSON.stringify({ scripts: { test: 'echo test' } }));
    write(ctx, 'yarn.lock', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd], ctx);
    assert.match(result.stdout, /Managers: yarn/);
    assert.match(result.stdout, /test: yarn test \(package\.json\)/);
  } finally {
    cleanup(ctx);
  }
});

test('pyproject.toml alone detects python, with test and coverage commands', () => {
  const ctx = scratch();
  try {
    write(ctx, 'pyproject.toml', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['python']);
    const commands = data.commands.map((c) => c.command);
    assert.ok(commands.includes('pytest'));
    assert.ok(commands.includes('pytest --cov'));
  } finally {
    cleanup(ctx);
  }
});

test('pytest.ini alone (without pyproject.toml) also detects python', () => {
  const ctx = scratch();
  try {
    write(ctx, 'pytest.ini', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['python']);
  } finally {
    cleanup(ctx);
  }
});

test('go.mod detects go, with test/build/coverage commands', () => {
  const ctx = scratch();
  try {
    write(ctx, 'go.mod', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['go']);
    const commands = data.commands.map((c) => c.command);
    assert.deepStrictEqual(commands, ['go test ./...', 'go build ./...', 'go test -cover ./...']);
  } finally {
    cleanup(ctx);
  }
});

test('Cargo.toml without tarpaulin.toml detects cargo with no coverage command', () => {
  const ctx = scratch();
  try {
    write(ctx, 'Cargo.toml', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['cargo']);
    const commands = data.commands.map((c) => c.command);
    assert.deepStrictEqual(commands, ['cargo test', 'cargo check']);
  } finally {
    cleanup(ctx);
  }
});

test('Cargo.toml with tarpaulin.toml adds the cargo tarpaulin coverage command', () => {
  const ctx = scratch();
  try {
    write(ctx, 'Cargo.toml', '');
    write(ctx, 'tarpaulin.toml', '');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    const commands = data.commands.map((c) => c.command);
    assert.ok(commands.includes('cargo tarpaulin'));
  } finally {
    cleanup(ctx);
  }
});

test('pom.xml without jacoco detects maven with only the test command', () => {
  const ctx = scratch();
  try {
    write(ctx, 'pom.xml', '<project></project>');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['maven']);
    const commands = data.commands.map((c) => c.command);
    assert.deepStrictEqual(commands, ['mvn test']);
  } finally {
    cleanup(ctx);
  }
});

test('pom.xml containing "jacoco" (case-insensitive) adds the maven coverage command', () => {
  const ctx = scratch();
  try {
    write(ctx, 'pom.xml', '<project><plugin>JaCoCo</plugin></project>');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    const commands = data.commands.map((c) => c.command);
    assert.ok(commands.includes('mvn jacoco:report'));
  } finally {
    cleanup(ctx);
  }
});

test('build.gradle without jacoco detects gradle with only the test command', () => {
  const ctx = scratch();
  try {
    write(ctx, 'build.gradle', 'plugins {}');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['gradle']);
    const commands = data.commands.map((c) => c.command);
    assert.deepStrictEqual(commands, ['./gradlew test']);
  } finally {
    cleanup(ctx);
  }
});

test('build.gradle.kts (without build.gradle) with jacoco adds the gradle coverage command from the .kts file', () => {
  const ctx = scratch();
  try {
    write(ctx, 'build.gradle.kts', 'id("jacoco")');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['gradle']);
    const commands = data.commands.map((c) => c.command);
    assert.ok(commands.includes('./gradlew jacocoTestReport'));
    const coverageEntry = data.commands.find((c) => c.kind === 'coverage');
    assert.strictEqual(coverageEntry.source, 'build.gradle.kts (jacoco plugin)');
  } finally {
    cleanup(ctx);
  }
});

test('composer.json with some scripts present detects composer and only the present scripts', () => {
  const ctx = scratch();
  try {
    write(ctx, 'composer.json', JSON.stringify({ scripts: { test: 'phpunit', lint: 'phpcs' } }));
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['composer']);
    const commands = data.commands.map((c) => c.command);
    assert.deepStrictEqual(commands.sort(), ['composer lint', 'composer test']);
  } finally {
    cleanup(ctx);
  }
});

test('a malformed composer.json falls back to an empty scripts object via readJsonSafe', () => {
  const ctx = scratch();
  try {
    write(ctx, 'composer.json', 'not json');
    const result = runScript(SCRIPT, ['detect', '--root', ctx.cwd, '--json'], ctx);
    assert.strictEqual(result.status, 1);
    const data = JSON.parse(result.stdout);
    assert.deepStrictEqual(data.managers, ['composer']);
    assert.deepStrictEqual(data.commands, []);
  } finally {
    cleanup(ctx);
  }
});

run();
