#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseFlags } = require('./lib/args.js');
const { prettyGenerate } = require('./lib/ruby-json.js');

function usage() {
  console.log('Usage:');
  console.log('  workspace-actions.js list [--map PATH] [--json]');
  console.log('  workspace-actions.js add --name NAME --path PATH [--map PATH] [--replace]');
  console.log('  workspace-actions.js remove --name NAME [--map PATH]');
  console.log('  workspace-actions.js validate [--map PATH] [--json]');
  console.log('');
  console.log('The workspace map is machine-local. Its default path is:');
  console.log('  ~/.xoch/workspace-map.json');
}

function die(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function failWith(message, code = 2) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

// Matches Ruby's Time.now.utc.iso8601: no fractional seconds, unlike
// Date#toISOString which always includes milliseconds.
function utcIso8601(date = new Date()) {
  return `${date.toISOString().split('.')[0]}Z`;
}

function loadMap(mapPath) {
  if (!fs.existsSync(mapPath)) return { version: 1, updated_at: null, projects: {} };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch (e) {
    failWith(`invalid workspace map JSON: ${e.message}`);
  }
  if (typeof data.projects !== 'object' || data.projects === null || Array.isArray(data.projects)) {
    failWith('workspace map must contain a projects object');
  }
  return data;
}

function writeMap(mapPath, data) {
  fs.mkdirSync(path.dirname(mapPath), { recursive: true });
  data.version = 1;
  data.updated_at = utcIso8601();
  const temp = `${mapPath}.tmp.${process.pid}`;
  fs.writeFileSync(temp, `${prettyGenerate(data)}\n`);
  fs.renameSync(temp, mapPath);
}

function main(argv) {
  const command = argv[0];
  if (!['list', 'add', 'remove', 'validate'].includes(command)) {
    if (command === '--help' || command === '-h') { usage(); return; }
    if (!command) { usage(); process.exit(2); }
    die(`unknown command: ${command}`);
  }
  const flags = parseFlags(argv.slice(1), ['json', 'replace']);
  const mapPath = path.resolve(flags.map || path.join(os.homedir(), '.xoch', 'workspace-map.json'));
  const name = flags.name || '';
  const projectPath = flags.path || '';
  const jsonMode = Boolean(flags.json);
  const replace = Boolean(flags.replace);

  const data = loadMap(mapPath);
  const projects = data.projects;

  if (command === 'list') {
    if (jsonMode) {
      console.log(prettyGenerate(data));
    } else if (Object.keys(projects).length === 0) {
      console.log('No Xoch workspace projects mapped.');
    } else {
      for (const projectName of Object.keys(projects).sort()) {
        console.log(`${projectName}: ${projects[projectName].path}`);
      }
    }
  } else if (command === 'add') {
    if (!name.trim()) failWith('--name is required');
    if (!/^[A-Za-z0-9._-]+$/.test(name)) failWith('project names may contain only letters, numbers, dots, underscores, and hyphens');
    if (!projectPath.trim()) failWith('--path is required');

    const expanded = path.resolve(projectPath);
    if (!fs.existsSync(expanded) || !fs.statSync(expanded).isDirectory()) failWith(`project path does not exist: ${expanded}`, 1);
    const existing = projects[name];
    if (existing && path.resolve(String(existing.path || '')) !== expanded && !replace) {
      failWith(`${name} already maps to ${existing.path}; pass --replace after engineer confirmation`, 1);
    }

    projects[name] = { path: expanded, source: 'xoch-workspace', last_seen: utcIso8601() };
    writeMap(mapPath, data);
    console.log(`Workspace project mapped: ${name} -> ${expanded}`);
  } else if (command === 'remove') {
    if (!name.trim()) failWith('--name is required');
    if (!(name in projects)) failWith(`workspace project not found: ${name}`, 1);
    delete projects[name];
    writeMap(mapPath, data);
    console.log(`Workspace project removed: ${name}`);
  } else if (command === 'validate') {
    const errors = [];
    const seenPaths = {};
    for (const [projectName, entry] of Object.entries(projects)) {
      const entryPath = String((entry && entry.path) || '');
      // path.resolve(entryPath) with an empty string resolves to cwd,
      // matching Ruby's File.expand_path("") -- do not fall back to '/'.
      const expanded = path.resolve(entryPath);
      if (!entryPath) errors.push(`${projectName}: missing path`);
      if (!fs.existsSync(expanded) || !fs.statSync(expanded).isDirectory()) errors.push(`${projectName}: path does not exist: ${expanded}`);
      if (seenPaths[expanded]) errors.push(`${projectName}: path is also mapped as ${seenPaths[expanded]}`);
      else seenPaths[expanded] = projectName;
    }

    const result = { valid: errors.length === 0, map: mapPath, project_count: Object.keys(projects).length, errors };
    if (jsonMode) {
      console.log(prettyGenerate(result));
    } else if (errors.length === 0) {
      console.log(`Workspace map valid: ${mapPath} (${Object.keys(projects).length} projects)`);
    } else {
      console.error(`Workspace map invalid: ${mapPath}`);
      for (const error of errors) console.error(`- ${error}`);
    }
    process.exitCode = errors.length === 0 ? 0 : 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { main, loadMap, writeMap };
