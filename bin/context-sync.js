#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFlags } = require('./lib/args.js');
const { scopeErrors } = require('./lib/project-scope-validator.js');
const { prettyGenerate } = require('./lib/ruby-json.js');

const SHARED_ITEMS = [
  'state.md', 'spec.md', 'plan.md', 'phases.md', 'phases', 'snapshots', 'notes', 'revisions', 'review.md', 'closure.md',
];

// context-sync.sh's own validate_scope! wording -- distinct from
// project-scope.sh's scope_errors (see project-scope.js), even for
// checks that test the same condition.
const contextSyncMessages = {
  version: () => 'scope version must be 1',
  jobId: () => 'scope job_id is required',
  mode: () => 'scope mode must be multi-project',
  tooFewProjects: () => 'scope must contain at least two projects',
  notObject: (i) => `projects[${i}] must be an object`,
  nameRequired: (i) => `projects[${i}].name is required`,
  duplicateName: (name) => `duplicate project name: ${name}`,
  roleInvalid: (i) => `projects[${i}].role is invalid`,
  pathNotAbsolute: (i) => `projects[${i}].path must be absolute`,
  duplicatePath: (i, expandedPath) => `duplicate project path: ${expandedPath}`,
  jobPathMismatch: (i, expected) => `projects[${i}].job_path must be ${expected}`,
  primaryCount: () => 'scope must contain exactly one primary project',
  primaryMismatch: () => 'scope primary must match the primary project',
};

function usage() {
  console.log('Usage:');
  console.log('  context-sync.js sync --scope PATH [--dry-run]');
  console.log('  context-sync.js check --scope PATH');
  console.log('');
  console.log('The primary repository owns canonical job context. This helper mirrors only Xoch');
  console.log('job artifacts to participants; it never copies source files or current.json.');
}

function die(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function failWith(message, code = 2) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function readJson(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') failWith(`scope file not found: ${filePath}`, 1);
    throw e;
  }
  try {
    return JSON.parse(content);
  } catch (e) {
    failWith(`invalid scope JSON in ${filePath}: ${e.message}`);
    return null;
  }
}

// Matches validate_scope!'s abort-on-first-error behavior (as opposed to
// project-scope.js's collect-all-errors behavior): take just the first
// message from the shared validator, always at code 2, since that's
// validate_scope!'s consistent default throughout.
function validateScope(data) {
  const errors = scopeErrors(data, contextSyncMessages);
  if (errors.length) failWith(errors[0], 2);
}

function jobRoot(project) {
  return path.join(path.resolve(project.path), project.job_path);
}

function digestPath(target, hash, prefix) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    hash.update(`file\0${prefix}\0`);
    hash.update(fs.readFileSync(target));
  } else if (stat.isDirectory()) {
    hash.update(`dir\0${prefix}\0`);
    for (const child of fs.readdirSync(target).sort()) {
      digestPath(path.join(target, child), hash, path.join(prefix, child));
    }
  }
}

function contextDigest(root) {
  const hash = crypto.createHash('sha256');
  for (const item of SHARED_ITEMS) digestPath(path.join(root, item), hash, item);
  return hash.digest('hex');
}

function samePath(source, destination) {
  if (!fs.existsSync(source) || !fs.existsSync(destination)) return false;
  const sourceStat = fs.statSync(source);
  const destStat = fs.statSync(destination);
  if (sourceStat.isFile() && destStat.isFile()) {
    return fs.readFileSync(source).equals(fs.readFileSync(destination));
  }
  if (!(sourceStat.isDirectory() && destStat.isDirectory())) return false;
  const sourceChildren = fs.readdirSync(source).sort();
  const destChildren = fs.readdirSync(destination).sort();
  if (sourceChildren.length !== destChildren.length || sourceChildren.some((c, i) => c !== destChildren[i])) return false;
  return sourceChildren.every((child) => samePath(path.join(source, child), path.join(destination, child)));
}

function copyPath(source, destination) {
  if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.statSync(source).isDirectory()) {
    fs.cpSync(source, destination, { recursive: true });
  } else {
    fs.copyFileSync(source, destination);
  }
}

// Matches Ruby's Time.now.utc.iso8601: no fractional seconds, unlike
// Date#toISOString which always includes milliseconds.
function utcIso8601(date = new Date()) {
  return `${date.toISOString().split('.')[0]}Z`;
}

function run(command, argv) {
  const flags = parseFlags(argv, ['dry-run']);
  if (!flags.scope) die('--scope is required');
  const dryRun = Boolean(flags['dry-run']);
  const scopeArgument = path.resolve(flags.scope);

  const requestedScope = readJson(scopeArgument);
  validateScope(requestedScope);
  const projects = requestedScope.projects;
  const primary = projects.find((project) => project.role === 'primary');

  const canonicalRoot = jobRoot(primary);
  const canonicalScopePath = path.join(canonicalRoot, 'projects.json');
  const canonical = readJson(canonicalScopePath);
  validateScope(canonical);
  if (requestedScope.job_id !== canonical.job_id) failWith('scope job_id does not match canonical scope');

  const canonicalProjects = canonical.projects;
  const canonicalPrimary = canonicalProjects.find((project) => project.role === 'primary');
  if (!(primary.name === canonicalPrimary.name && path.resolve(primary.path) === path.resolve(canonicalPrimary.path))) {
    failWith('requested scope primary does not match canonical scope');
  }

  const participants = canonicalProjects.filter((project) => project.role === 'participant');
  for (const participant of participants) {
    if (!fs.existsSync(participant.path) || !fs.statSync(participant.path).isDirectory()) {
      failWith(`participant path does not exist: ${participant.path}`, 1);
    }
  }

  const sourceRevision = canonical.revision;
  if (!(Number.isInteger(sourceRevision) && sourceRevision >= 0)) failWith('canonical revision must be a non-negative integer');
  const sourceDigest = contextDigest(canonicalRoot);
  const mode = command === 'check' ? 'check' : (dryRun ? 'dry-run' : 'sync');
  const summary = {
    job_id: canonical.job_id,
    mode,
    primary: canonicalPrimary.name,
    canonical_job: canonicalRoot,
    source_revision: sourceRevision,
    source_digest: sourceDigest,
    participants: [],
  };

  let unsafe = false;
  for (const participant of participants) {
    const destinationRoot = jobRoot(participant);
    const destinationScopePath = path.join(destinationRoot, 'projects.json');
    const entry = { name: participant.name, job: destinationRoot, status: 'ready', changed: [] };

    const destRootExists = fs.existsSync(destinationRoot) && fs.statSync(destinationRoot).isDirectory();
    const destScopeExists = fs.existsSync(destinationScopePath) && fs.statSync(destinationScopePath).isFile();
    const destRootEmpty = destRootExists && fs.readdirSync(destinationRoot).length === 0;

    if (destRootExists && !destScopeExists && !destRootEmpty) {
      entry.status = 'unmanaged-context';
      unsafe = true;
    } else if (destScopeExists) {
      const destinationScope = readJson(destinationScopePath);
      if (destinationScope.job_id !== canonical.job_id) {
        entry.status = 'different-job';
        unsafe = true;
      } else if (Number.isInteger(destinationScope.revision) && destinationScope.revision > sourceRevision) {
        entry.status = 'newer-participant';
        unsafe = true;
      } else if (destinationScope.content_digest && contextDigest(destinationRoot) !== destinationScope.content_digest) {
        entry.status = 'participant-modified';
        unsafe = true;
      }
    }

    if (!(unsafe && entry.status !== 'ready')) {
      for (const item of SHARED_ITEMS) {
        const source = path.join(canonicalRoot, item);
        const destination = path.join(destinationRoot, item);
        if (fs.existsSync(source) && !samePath(source, destination)) entry.changed.push(item);
        if (!fs.existsSync(source) && fs.existsSync(destination)) entry.changed.push(item);
      }
      const scopesMatch = destScopeExists && fs.readFileSync(destinationScopePath).equals(fs.readFileSync(canonicalScopePath));
      if (!scopesMatch) entry.changed.push('projects.json');
      if (command === 'check' && entry.changed.length) entry.status = 'out-of-sync';
    }
    summary.participants.push(entry);
  }

  if (unsafe) {
    console.log(prettyGenerate(summary));
    failWith('sync refused because participant context is unmanaged, newer, or independently modified', 1);
  }

  if (command === 'check') {
    console.log(prettyGenerate(summary));
    process.exitCode = summary.participants.every((p) => p.changed.length === 0) ? 0 : 1;
    return;
  }

  if (!dryRun) {
    canonical.revision = sourceRevision + 1;
    canonical.content_digest = sourceDigest;
    canonical.last_synced_at = utcIso8601();
    const temp = `${canonicalScopePath}.tmp.${process.pid}`;
    fs.writeFileSync(temp, `${prettyGenerate(canonical)}\n`);
    fs.renameSync(temp, canonicalScopePath);

    for (const participant of participants) {
      const destinationRoot = jobRoot(participant);
      fs.mkdirSync(destinationRoot, { recursive: true });
      for (const item of SHARED_ITEMS) {
        const source = path.join(canonicalRoot, item);
        const destination = path.join(destinationRoot, item);
        if (fs.existsSync(source)) copyPath(source, destination);
        else if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
      }
      fs.copyFileSync(canonicalScopePath, path.join(destinationRoot, 'projects.json'));
    }
    summary.revision = canonical.revision;
  }

  console.log(prettyGenerate(summary));
}

function main(argv) {
  const command = argv[0];
  if (!['sync', 'check'].includes(command)) {
    if (command === '--help' || command === '-h') { usage(); return; }
    if (!command) { usage(); process.exit(2); }
    die(`unknown command: ${command}`);
  }
  run(command, argv.slice(1));
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { run, main, contextDigest, samePath };
