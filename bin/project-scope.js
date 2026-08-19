#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./lib/args.js');
const { prettyGenerate } = require('./lib/ruby-json.js');

function usage() {
  console.log('Usage:');
  console.log('  project-scope.js create --job ID --primary NAME=PATH --participant NAME=PATH [--participant NAME=PATH ...]');
  console.log('  project-scope.js validate --scope PATH [--json]');
  console.log('  project-scope.js role --scope PATH [--cwd PATH] [--json]');
  console.log('  project-scope.js primary-job --scope PATH');
  console.log('  project-scope.js projects --scope PATH [--json]');
  console.log('');
  console.log('Multi-project scope is optional. Standalone Xoch jobs do not need projects.json.');
}

function die(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function failWith(message, code = 2) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function splitProject(spec, label) {
  const [name, ...rest] = spec.split('=');
  const projectPath = rest.join('=');
  if (!name || !projectPath) failWith(`${label} must use NAME=PATH`);
  if (!/^[A-Za-z0-9._-]+$/.test(name)) failWith(`invalid project name: ${name}`);
  const expanded = path.resolve(projectPath);
  if (!fs.existsSync(expanded) || !fs.statSync(expanded).isDirectory()) failWith(`project path does not exist: ${expanded}`, 1);
  return [name, expanded];
}

function loadScope(scopePath) {
  if (!scopePath) failWith('--scope is required');
  const expanded = path.resolve(scopePath);
  if (!fs.existsSync(expanded)) failWith(`scope file not found: ${expanded}`, 1);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(expanded, 'utf8'));
  } catch (e) {
    failWith(`invalid scope JSON: ${e.message}`);
  }
  return [data, expanded];
}

// project-scope.sh's own scope_errors, deliberately NOT composed from
// bin/lib/project-scope-validator.js. That shared module models
// context-sync.sh's validate_scope! (which aborts on the first failing
// check). This function's bash original (scope_errors) collects every
// error in a SINGLE per-project pass with two extra checks (path
// existence, job_path relative-path sanity) interleaved at specific
// points, plus a 3-check primary tail instead of the shared module's
// 2-check tail. Composing the two would need several hook points into
// the shared per-project loop and would end up harder to audit against
// the bash source than this direct, line-for-line port. Since every
// command here (create/role/primary-job/projects) surfaces multiple
// collected errors as one semicolon-joined string, and validate lists
// them one per line, exact per-check order matters and is preserved
// here to match scope_errors exactly.
function scopeErrors(data) {
  const errors = [];
  const projects = data.projects;
  if (data.version !== 1) errors.push('version must be 1');
  if (!data.job_id) errors.push('job_id is required');
  if (data.mode !== 'multi-project') errors.push('mode must be multi-project');
  if (!data.primary) errors.push('primary is required');
  if (!(Number.isInteger(data.revision) && data.revision >= 0)) errors.push('revision must be a non-negative integer');
  if (!(Array.isArray(projects) && projects.length >= 2)) errors.push('projects must contain at least two entries');
  if (!Array.isArray(projects)) return errors;

  const names = {};
  const paths = {};
  let primaryCount = 0;
  const expectedJobPath = path.join('.xoch', 'work', 'jobs', String(data.job_id || ''));

  projects.forEach((project, index) => {
    if (typeof project !== 'object' || project === null || Array.isArray(project)) {
      errors.push(`projects[${index}] must be an object`);
      return;
    }
    const name = String(project.name || '');
    const role = project.role;
    const projectPath = String(project.path || '');
    const jobPath = String(project.job_path || '');

    if (!name) errors.push(`projects[${index}].name is required`);
    if (name && names[name]) errors.push(`duplicate project name: ${name}`);
    if (name) names[name] = true;
    if (!['primary', 'participant'].includes(role)) errors.push(`projects[${index}].role must be primary or participant`);
    if (role === 'primary') primaryCount += 1;
    if (!projectPath.startsWith('/')) errors.push(`projects[${index}].path must be absolute`);
    if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
      errors.push(`projects[${index}].path does not exist: ${projectPath}`);
    }
    // path.resolve('') resolves to cwd, matching Ruby's File.expand_path("").
    const expandedPath = path.resolve(projectPath);
    if (paths[expandedPath]) errors.push(`projects[${index}].path is also used by ${paths[expandedPath]}`);
    if (projectPath) paths[expandedPath] = name;
    if (!jobPath || jobPath.startsWith('/') || jobPath.split('/').includes('..')) {
      errors.push(`projects[${index}].job_path must be relative`);
    }
    if (jobPath !== expectedJobPath) errors.push(`projects[${index}].job_path must be ${expectedJobPath}`);
  });

  if (primaryCount !== 1) errors.push('exactly one primary project is required');
  if (!(data.primary && names[data.primary])) errors.push('primary does not match a listed project');
  const rolePrimary = projects.find((project) => project && typeof project === 'object' && !Array.isArray(project) && project.role === 'primary');
  if (rolePrimary && rolePrimary.name !== data.primary) errors.push('primary must match the project with role primary');

  return errors;
}

// parseFlags overwrites repeated flags rather than accumulating them, so
// --participant (which bash collects into an array via `participants+=`)
// needs its own small scan here instead.
function parseCreateArgs(argv) {
  let job = '';
  let primary = '';
  const participants = [];
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--job') { job = argv[i + 1] || ''; i += 2; }
    else if (arg === '--primary') { primary = argv[i + 1] || ''; i += 2; }
    else if (arg === '--participant') { participants.push(argv[i + 1] || ''); i += 2; }
    else { i += 1; }
  }
  return { job, primary, participants };
}

function create(argv) {
  const { job, primary: primarySpec, participants: participantSpecs } = parseCreateArgs(argv);

  if (!job) failWith('--job is required');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job)) failWith('job ID must use lowercase letters, numbers, and hyphens');
  if (!primarySpec) failWith('--primary is required');
  if (participantSpecs.length === 0) failWith('at least one --participant is required');

  const [primaryName, primaryPath] = splitProject(primarySpec, '--primary');
  const projectSpecs = [[primaryName, primaryPath, 'primary']];
  for (const spec of participantSpecs) {
    const [name, projectPath] = splitProject(spec, '--participant');
    projectSpecs.push([name, projectPath, 'participant']);
  }
  const names = projectSpecs.map(([name]) => name);
  if (new Set(names).size !== names.length) failWith('project names must be unique');

  const jobPath = path.join('.xoch', 'work', 'jobs', job);
  const outputPath = path.join(primaryPath, jobPath, 'projects.json');
  if (fs.existsSync(outputPath)) failWith(`scope already exists: ${outputPath}`, 1);

  const data = {
    version: 1,
    job_id: job,
    mode: 'multi-project',
    primary: primaryName,
    revision: 0,
    content_digest: null,
    last_synced_at: null,
    projects: projectSpecs.map(([name, projectPath, role]) => ({ name, role, path: projectPath, job_path: jobPath })),
  };
  const errors = scopeErrors(data);
  if (errors.length) failWith(errors.join('; '));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temp = `${outputPath}.tmp.${process.pid}`;
  fs.writeFileSync(temp, `${prettyGenerate(data)}\n`);
  fs.renameSync(temp, outputPath);
  console.log(`Multi-project scope created: ${outputPath}`);
}

function validate(argv) {
  const flags = parseFlags(argv, ['json']);
  const [data, expanded] = loadScope(flags.scope);
  const errors = scopeErrors(data);
  const result = { valid: errors.length === 0, scope: expanded, errors };
  if (flags.json) {
    console.log(prettyGenerate(result));
  } else if (errors.length === 0) {
    console.log(`Project scope valid: ${expanded}`);
  } else {
    console.error(`Project scope invalid: ${expanded}`);
    for (const error of errors) console.error(`- ${error}`);
  }
  process.exitCode = errors.length === 0 ? 0 : 1;
}

function role(argv) {
  const flags = parseFlags(argv, ['json']);
  const [data] = loadScope(flags.scope);
  const errors = scopeErrors(data);
  if (errors.length) failWith(errors.join('; '), 1);
  // Bash's default (`cwd="$PWD"`) is the shell's logical, symlink-unresolved
  // path; Node's process.cwd() calls getcwd() and returns the OS-resolved
  // real path, which differs from bash's on symlinked trees (e.g. macOS's
  // /var -> /private/var). process.env.PWD (inherited from the invoking
  // shell) matches bash's semantics; process.cwd() is only a fallback for
  // when PWD isn't set (e.g. not launched from a shell).
  const expandedCwd = path.resolve(flags.cwd || process.env.PWD || process.cwd());
  const project = data.projects.find((candidate) => {
    const candidatePath = path.resolve(candidate.path);
    return expandedCwd === candidatePath || expandedCwd.startsWith(`${candidatePath}${path.sep}`);
  });
  let result;
  if (project) {
    const primary = data.projects.find((item) => item.role === 'primary');
    result = {
      ...project,
      is_primary: project.role === 'primary',
      primary: data.primary,
      canonical_job: path.join(primary.path, project.job_path),
    };
  } else {
    result = { name: null, role: 'unmapped', cwd: expandedCwd, primary: data.primary };
  }
  if (flags.json) {
    console.log(prettyGenerate(result));
  } else {
    for (const [key, value] of Object.entries(result)) console.log(`${key}: ${value}`);
  }
}

function primaryJob(argv) {
  const flags = parseFlags(argv, []);
  const [data] = loadScope(flags.scope);
  const errors = scopeErrors(data);
  if (errors.length) failWith(errors.join('; '), 1);
  const primary = data.projects.find((project) => project.role === 'primary');
  console.log(path.join(primary.path, primary.job_path));
}

function projects(argv) {
  const flags = parseFlags(argv, ['json']);
  const [data] = loadScope(flags.scope);
  const errors = scopeErrors(data);
  if (errors.length) failWith(errors.join('; '), 1);
  if (flags.json) {
    console.log(prettyGenerate(data.projects));
  } else {
    for (const project of data.projects) console.log(`${project.name}: ${project.role} ${project.path}`);
  }
}

function main(argv) {
  const command = argv[0];
  if (!['create', 'validate', 'role', 'primary-job', 'projects'].includes(command)) {
    if (command === '--help' || command === '-h') { usage(); return; }
    if (!command) { usage(); process.exit(2); }
    die(`unknown command: ${command}`);
  }
  const rest = argv.slice(1);
  if (command === 'create') create(rest);
  else if (command === 'validate') validate(rest);
  else if (command === 'role') role(rest);
  else if (command === 'primary-job') primaryJob(rest);
  else if (command === 'projects') projects(rest);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { scopeErrors, create, validate, role, primaryJob, projects, main };
