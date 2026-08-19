#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseFlags } = require('./lib/args.js');
const { prettyGenerate } = require('./lib/ruby-json.js');

function usage() {
  console.log('Usage:');
  console.log('  dependency-actions.js resolve [--dependencies PATH] [--map PATH] [--scope PATH]');
  console.log('');
  console.log('Defaults:');
  console.log('  dependencies: .xoch/docs/dependencies.json');
  console.log('  map:          ~/.xoch/workspace-map.json');
  console.log('');
  console.log('The command prints JSON and exits 1 when a declared project cannot be resolved.');
}

// Matches the bash original's fail_json helper: prints the accumulated
// result (with an "error" key) as JSON before exiting, default code 2
// unless explicitly overridden -- distinct from most other ported
// scripts, which exit 1 on internal validation failure.
function failJson(result, message, code = 2) {
  result.error = message;
  console.log(prettyGenerate(result));
  process.exit(code);
}

function readJsonSafe(filePath, result, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    failJson(result, `invalid ${label} JSON: ${e.message}`);
    return null;
  }
}

function resolve(argv) {
  const flags = parseFlags(argv, []);
  const dependenciesPath = path.resolve(flags.dependencies || '.xoch/docs/dependencies.json');
  const mapPath = path.resolve(flags.map || path.join(os.homedir(), '.xoch', 'workspace-map.json'));
  const scopePath = flags.scope ? path.resolve(flags.scope) : '';

  const result = {
    dependencies_file: dependenciesPath,
    workspace_map: mapPath,
    scope: scopePath || null,
    resolved: [],
    missing: [],
  };

  if (!fs.existsSync(dependenciesPath)) {
    failJson(result, `dependencies file not found: ${dependenciesPath}`, 1);
  }

  const dependencyData = readJsonSafe(dependenciesPath, result, 'dependencies');
  const dependencies = dependencyData.dependencies;
  if (!Array.isArray(dependencies)) {
    failJson(result, 'dependencies file must contain a dependencies array');
  }

  let workspaceProjects = {};
  if (fs.existsSync(mapPath)) {
    const mapData = readJsonSafe(mapPath, result, 'workspace map');
    workspaceProjects = mapData.projects && typeof mapData.projects === 'object' ? mapData.projects : {};
  }

  let scopeProjects = [];
  if (scopePath) {
    if (!fs.existsSync(scopePath)) {
      failJson(result, `scope file not found: ${scopePath}`, 1);
    }
    const scopeData = readJsonSafe(scopePath, result, 'project scope');
    scopeProjects = (scopeData.projects || []).map((project) => project.name);
  }

  dependencies.forEach((dependency, index) => {
    if (typeof dependency !== 'object' || dependency === null || Array.isArray(dependency)) {
      failJson(result, `dependencies[${index}] must be an object`);
    }
    const name = String(dependency.name || '');
    if (!name) {
      failJson(result, `dependencies[${index}].name is required`);
    }

    let entry = workspaceProjects[name];
    if (typeof entry === 'string') entry = { path: entry };
    if (entry && typeof entry === 'object' && entry.path) {
      const resolvedPath = path.resolve(entry.path);
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        result.resolved.push({
          name,
          path: resolvedPath,
          in_job_scope: scopeProjects.includes(name),
          documentation: path.join(resolvedPath, '.xoch', 'docs'),
          declaration: dependency,
        });
      } else {
        result.missing.push({ name, reason: `mapped path does not exist: ${resolvedPath}`, declaration: dependency });
      }
    } else {
      result.missing.push({ name, reason: `not present in ${mapPath}`, declaration: dependency });
    }
  });

  console.log(prettyGenerate(result));
  process.exitCode = result.missing.length === 0 ? 0 : 1;
}

function main(argv) {
  const command = argv[0];
  if (command === 'resolve') {
    resolve(argv.slice(1));
  } else if (command === '--help' || command === '-h') {
    usage();
  } else if (!command) {
    usage();
    process.exit(2);
  } else {
    console.error(`Error: unknown command: ${command}`);
    process.exit(2);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { resolve, main };
