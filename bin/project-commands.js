#!/usr/bin/env node
'use strict';

// Detect likely project validation commands without executing them.

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./lib/args.js');
const { prettyGenerate } = require('./lib/ruby-json.js');

function usage() {
  console.log('Usage:');
  console.log('  project-commands.js detect [--root ROOT] [--json]');
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function containsText(filePath, needle) {
  return fs.readFileSync(filePath, 'utf8').toLowerCase().includes(needle);
}

function detect(argv) {
  const flags = parseFlags(argv, ['json']);
  const root = path.resolve(flags.root || '.');
  const jsonMode = Boolean(flags.json);

  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Project root not found: ${root}`);
    process.exit(1);
  }

  const commands = [];
  const managers = [];
  const add = (kind, command, source) => {
    if (!commands.some((item) => item.command === command)) {
      commands.push({ kind, command, source });
    }
  };
  const exists = (name) => fs.existsSync(path.join(root, name));

  const packagePath = path.join(root, 'package.json');
  if (exists('package.json')) {
    const pkg = readJsonSafe(packagePath);
    const scripts = pkg.scripts || {};
    let manager = 'npm';
    if (exists('bun.lockb') || exists('bun.lock')) manager = 'bun';
    else if (exists('pnpm-lock.yaml')) manager = 'pnpm';
    else if (exists('yarn.lock')) manager = 'yarn';
    managers.push(manager);
    for (const name of ['test', 'lint', 'typecheck', 'check', 'build', 'format', 'coverage']) {
      if (!(name in scripts)) continue;
      const runner = manager === 'npm' ? `npm run ${name}` : manager === 'bun' ? `bun run ${name}` : `${manager} ${name}`;
      add(name, runner, 'package.json');
    }
  }

  if (exists('pyproject.toml') || exists('pytest.ini')) {
    managers.push('python');
    add('test', 'pytest', 'Python test configuration');
    add('coverage', 'pytest --cov', 'Python test configuration');
  }
  if (exists('go.mod')) {
    managers.push('go');
    add('test', 'go test ./...', 'go.mod');
    add('build', 'go build ./...', 'go.mod');
    add('coverage', 'go test -cover ./...', 'go.mod');
  }
  if (exists('Cargo.toml')) {
    managers.push('cargo');
    add('test', 'cargo test', 'Cargo.toml');
    add('check', 'cargo check', 'Cargo.toml');
    if (exists('tarpaulin.toml')) add('coverage', 'cargo tarpaulin', 'tarpaulin.toml');
  }
  if (exists('pom.xml')) {
    managers.push('maven');
    add('test', 'mvn test', 'pom.xml');
    if (containsText(path.join(root, 'pom.xml'), 'jacoco')) add('coverage', 'mvn jacoco:report', 'pom.xml (jacoco plugin)');
  }
  if (exists('build.gradle') || exists('build.gradle.kts')) {
    managers.push('gradle');
    add('test', './gradlew test', 'Gradle build');
    const gradleFile = exists('build.gradle') ? 'build.gradle' : 'build.gradle.kts';
    if (containsText(path.join(root, gradleFile), 'jacoco')) add('coverage', './gradlew jacocoTestReport', `${gradleFile} (jacoco plugin)`);
  }
  if (exists('composer.json')) {
    managers.push('composer');
    const composer = readJsonSafe(path.join(root, 'composer.json'));
    const scripts = composer.scripts || {};
    for (const name of ['test', 'analyse', 'analyze', 'lint', 'coverage']) {
      if (name in scripts) add(name, `composer ${name}`, 'composer.json');
    }
  }

  const result = { root, managers: [...new Set(managers)], commands };
  if (jsonMode) {
    console.log(prettyGenerate(result));
  } else {
    console.log(`Managers: ${result.managers.length ? result.managers.join(', ') : 'unknown'}`);
    for (const item of commands) console.log(`${item.kind}: ${item.command} (${item.source})`);
  }
  process.exitCode = commands.length === 0 ? 1 : 0;
}

function main(argv) {
  const [command, ...rest] = argv;
  if (command === '--help') {
    usage();
    return;
  }
  if (command !== 'detect') {
    usage();
    process.exit(2);
  }
  detect(rest);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { detect, main };
