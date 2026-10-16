#!/usr/bin/env node
'use strict';

// Xoch deterministic helper actions.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { isMainModule } from './lib/is-main.js';

import { readJson, writeJson } from './lib/json-store.js';
import { parseFlags } from './lib/args.js';
import { prettyGenerate } from './lib/ruby-json.js';
import { cleanId, generateJobId } from './generate-job-id.js';
import { JobState } from './lib/job-state.js';
import { Phases } from './lib/phases.js';
import { ArcState } from './lib/arc-state.js';
import { ArcJobs, SECTIONS as ARC_SECTIONS } from './lib/arc-jobs.js';
import { CurrentPointer } from './lib/current-pointer.js';

function die(message) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

// Matches Ruby's Kernel#abort as used inside the bash original's embedded
// ruby heredocs: prints the message as-is, with no "Error:" prefix
// (unlike the bash-level die() above, used for argument-parsing failures
// in the surrounding shell function bodies), and exits 1.
function abortRuby(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function today() {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Matches Ruby's Time.now.utc.iso8601: no fractional seconds, unlike
// Date#toISOString which always includes milliseconds.
function utcIso8601(date = new Date()) {
  return `${date.toISOString().split('.')[0]}Z`;
}

// Xoch's own slugify() is identical to generate-job-id.sh's --id
// cleaning path, so xoch-actions.js reuses cleanId() rather than
// re-deriving the same regex chain twice.
const slugify = cleanId;

// Resolve the Xoch storage root for the current project directory.
// Prints ".xoch" (relative, in-repo mode) by default, or an absolute
// "$HOME/.xoch/projects/<slug>" path when ~/.xoch/config.json sets
// storage.mode to "centralized". Any missing/invalid config falls back
// to in-repo so existing projects are unaffected.
function xochRoot() {
  const configPath = path.join(os.homedir(), '.xoch', 'config.json');
  const config = readJson(configPath);
  const mode = config && config.storage && ['in-repo', 'centralized'].includes(config.storage.mode)
    ? config.storage.mode
    : 'in-repo';

  if (mode === 'centralized') {
    const slug = slugify(path.basename(process.cwd()));
    return path.join(os.homedir(), '.xoch', 'projects', slug);
  }
  return '.xoch';
}

function ensureRoot() {
  fs.mkdirSync(xochRoot(), { recursive: true });
}

// Parses a legacy markdown pointer's "**Key**: value" lines into
// snake_case fields (e.g. "**Job ID**:" -> job_id). Used only for the
// read-only .xoch/context/current.md legacy fallback.
function markdownFields(filePath) {
  const fields = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    if (m) {
      const key = m[1].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      fields[key] = m[2].trim();
    }
  }
  return fields;
}

// Shown when a job or arc still has the markdown files Xoch used before its
// state moved to JSON. Those formats are detected so the error is clear,
// but no longer read or converted.
const OLD_FORMAT = 'which this version of Xoch no longer reads';

function jobDir(jobId) {
  return path.join(xochRoot(), 'work', 'jobs', jobId);
}

function arcDir(arcId) {
  return path.join(xochRoot(), 'work', 'arcs', arcId);
}

/**
 * Loads a job's state, dying with a clear message when the job is missing,
 * still on markdown state, or its state.json is invalid.
 * @param {string} jobId
 * @param {string} [missing] - Message used when the job doesn't exist.
 * @returns {{dir: string, state: JobState}}
 */
function loadJob(jobId, missing) {
  const dir = jobDir(jobId);
  if (!JobState.exists(dir)) {
    if (fs.existsSync(path.join(dir, 'state.md'))) die(`job ${jobId} uses the old markdown state format (state.md), ${OLD_FORMAT}`);
    die(missing || `state not found: ${JobState.pathIn(dir)}`);
  }
  try {
    return { dir, state: JobState.load(dir) };
  } catch (e) {
    return die(e.message);
  }
}

/**
 * Loads a job's phases document, or null when it has none yet.
 * @param {string} dir - Job directory.
 * @returns {Phases|null}
 */
function loadPhases(dir) {
  if (!Phases.exists(dir)) {
    if (fs.existsSync(path.join(dir, 'phases.md'))) die(`job ${path.basename(dir)} uses the old markdown phases format (phases.md), ${OLD_FORMAT}`);
    return null;
  }
  try {
    return Phases.load(dir);
  } catch (e) {
    return die(e.message);
  }
}

/**
 * Loads a job's phases document, dying when it has none.
 * @param {string} jobId
 * @param {string} dir - Job directory.
 * @returns {Phases}
 */
function requirePhases(jobId, dir) {
  const phases = loadPhases(dir);
  if (!phases) die(`job ${jobId} has no phases yet; write them with: xoch phase write --job ${jobId}`);
  return phases;
}

/**
 * Loads an arc's state and membership (membership empty when the arc has
 * no jobs.json yet), dying when the arc is missing or still on markdown.
 * @param {string} arcId
 * @returns {{dir: string, state: ArcState, jobs: ArcJobs}}
 */
function loadArc(arcId) {
  const dir = arcDir(arcId);
  if (!ArcState.exists(dir)) {
    if (fs.existsSync(path.join(dir, 'state.md'))) die(`arc ${arcId} uses the old markdown state format (state.md), ${OLD_FORMAT}`);
    die(`arc not found: ${arcId}`);
  }
  try {
    return { dir, state: ArcState.load(dir), jobs: ArcJobs.exists(dir) ? ArcJobs.load(dir) : ArcJobs.create() };
  } catch (e) {
    return die(e.message);
  }
}

/**
 * Applies a validated change to a shape instance, dying with the shape's
 * own message (and writing nothing) when it doesn't validate.
 * @param {function(): void} change
 */
function applyOrDie(change) {
  try {
    change();
  } catch (e) {
    die(e.message);
  }
}

/**
 * Reads a JSON object from stdin, dying when it isn't valid JSON.
 * @returns {*}
 */
function readStdinJson() {
  const text = fs.readFileSync(0, 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    return die(`input is not valid JSON: ${e.message}`);
  }
}

function nullable(value) {
  return value === undefined || value === null || value === '' || value === 'null' ? null : value;
}

// Job types `job open --type` accepts. A job whose state predates the
// job_type field is read as 'standard'.
const JOB_TYPES = ['standard', 'qa'];

/**
 * Reads a job's type from its state. JobState fills job_type with
 * 'standard' for jobs written before job_type existed.
 * @param {Object} state - Job state data.
 * @returns {string} The job's type.
 */
function jobTypeOf(state) {
  return state.job_type;
}

function workflowFromState(state, existing = null) {
  const active = nullable(state.active_workflow);
  if (!active) return null;
  const workflow = {
    name: active,
    stage: nullable(state.workflow_stage) || 'in_progress',
    pending_action: nullable(state.pending_action) || 'resume_workflow',
    artifact: nullable(state.workflow_artifact),
    return_command: nullable(state.return_command) || nullable(state.next_command) || active,
    started_at: nullable(state.workflow_started_at) || (existing && existing.started_at) || null,
  };
  const unchanged = existing && Object.keys(workflow).every((key) => existing[key] === workflow[key]);
  workflow.updated_at = unchanged ? existing.updated_at : utcIso8601();
  return workflow;
}

function validatePointer(data, pointerPath, root) {
  if (data.version !== 1) abortRuby(`Invalid Xoch pointer version in ${pointerPath}`);
  const job = data.job;
  if (!job || typeof job !== 'object' || !job.id || !job.directory) abortRuby(`Invalid Xoch job pointer in ${pointerPath}`);
  const expectedDirectory = path.join(root, 'work', 'jobs', String(job.id));
  const actualDirectory = String(job.directory).replace(/\/$/, '');
  if (actualDirectory !== expectedDirectory) abortRuby(`Invalid Xoch job directory in ${pointerPath}`);
  const workflow = data.workflow;
  if (workflow) {
    const required = ['name', 'stage', 'pending_action', 'return_command'];
    const missing = required.filter((key) => !workflow[key]);
    if (missing.length) abortRuby(`Invalid Xoch workflow pointer in ${pointerPath}; missing ${missing.join(', ')}`);
  }
}

function writeAtomicJson(filePath, data) {
  writeJson(filePath, data);
}

function writeAtomicText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(temp, content);
  fs.renameSync(temp, filePath);
}

// Resolves a --job/--path pair to an absolute path inside that job's
// directory, rejecting traversal the same way workflow artifacts are
// guarded, and requiring the job to already exist.
// Files only the state/phase helpers may change; `file write`/`file edit`
// refuse them so every change to them is validated.
const HELPER_OWNED_FILES = [JobState.FILENAME, Phases.FILENAME];

function resolveJobFile(jobId, relPath, { write = false } = {}) {
  if (!jobId) die('--job is required');
  if (!relPath) die('--path is required');
  if (isTraversalArtifact(relPath)) die('File path must be job-relative');
  const { dir } = loadJob(jobId, `job not found: ${jobId}`);
  const target = path.join(dir, relPath);
  if (write && HELPER_OWNED_FILES.includes(path.relative(dir, target))) {
    die(`${path.relative(dir, target)} is managed by xoch helpers; use xoch state set/update or xoch phase write instead`);
  }
  return target;
}

// Resolves the active job pointer: current.json (kept in sync with its
// job's state on every read, writing back only when the projection
// changed), or else the legacy .xoch/context/current.md pointer, read-only.
// An old markdown work/current.md pointer is refused rather than migrated.
function resolveCurrentPointer() {
  const root = xochRoot();
  const jsonPath = path.join(root, 'work', 'current.json');
  const markdownPath = path.join(root, 'work', 'current.md');
  const legacyPath = '.xoch/context/current.md';

  let data = null;
  let pointer = null;

  if (fs.existsSync(jsonPath)) {
    try {
      data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      abortRuby(`Invalid JSON in ${jsonPath}: ${e.message}`);
    }
    validatePointer(data, jsonPath, root);
    if (JobState.exists(data.job.directory) || fs.existsSync(path.join(data.job.directory, 'state.md'))) {
      const state = loadJob(String(data.job.id)).state.toJSON();
      const projectedWorkflow = workflowFromState(state, data.workflow);
      const projectedNextCommand = nullable(state.next_command);
      const projectedCurrentStep = nullable(state.current_step);
      const projectedJobType = jobTypeOf(state);
      const changed = JSON.stringify(projectedWorkflow) !== JSON.stringify(data.workflow)
        || projectedNextCommand !== nullable(data.next_command)
        || projectedCurrentStep !== nullable(data.current_step)
        || projectedJobType !== data.job_type;
      if (changed) {
        data.workflow = projectedWorkflow;
        data.next_command = projectedNextCommand;
        data.current_step = projectedCurrentStep;
        data.job_type = projectedJobType;
        data.updated_at = utcIso8601();
        writeAtomicJson(jsonPath, data);
      }
    }
    pointer = jsonPath;
  } else if (fs.existsSync(markdownPath)) {
    die(`${markdownPath} uses the old markdown pointer format, ${OLD_FORMAT}`);
  } else if (fs.existsSync(legacyPath)) {
    const fields = markdownFields(legacyPath);
    data = {
      version: 1,
      legacy: true,
      job_type: 'standard',
      job: {
        id: fields.job_id || fields.task_id,
        title: fields.title,
        directory: fields.job_directory || fields.task_directory,
      },
      workflow: null,
      updated_at: null,
    };
    pointer = legacyPath;
  }

  return { data, pointer };
}

function jobCurrent(argv) {
  const mode = argv[0] === '--json' ? 'json' : 'text';
  const { data, pointer } = resolveCurrentPointer();

  if (data === null) {
    console.log(mode === 'json' ? '{}' : 'No active Xoch job.');
  } else if (mode === 'json') {
    data.pointer = pointer;
    console.log(prettyGenerate(data));
  } else {
    console.log(`job_id: ${data.job.id}`);
    console.log(`job_directory: ${data.job.directory}`);
    console.log(`active_workflow: ${(data.workflow && data.workflow.name) || 'none'}`);
    console.log(`workflow_stage: ${(data.workflow && data.workflow.stage) || 'none'}`);
    console.log(`next_command: ${data.next_command || 'none'}`);
    console.log(`current_step: ${data.current_step || 'none'}`);
    console.log(`job_type: ${data.job_type}`);
    console.log(`pointer: ${pointer}`);
  }
}

function existingPath(candidate) {
  return fs.existsSync(candidate) ? candidate : null;
}

function jobEvidence(argv) {
  const flags = parseFlags(argv, ['json']);
  const jobId = flags.job;
  const mode = flags.json ? 'json' : 'text';
  if (!jobId) die('job evidence requires --job');

  const { dir, state } = loadJob(jobId, `job not found: ${jobId}`);
  const currentPhase = state.get('current_phase');

  const result = {
    job_directory: dir,
    state: JobState.pathIn(dir),
    spec: existingPath(path.join(dir, 'spec.md')),
    plan: existingPath(path.join(dir, 'plan.md')),
    phases: existingPath(Phases.pathIn(dir)),
    review: existingPath(path.join(dir, 'review.md')),
    closure: existingPath(path.join(dir, 'closure.md')),
    current_phase: currentPhase === null ? null : String(currentPhase),
    current_phase_snapshot: currentPhase ? existingPath(path.join(dir, 'snapshots', `phase-${currentPhase}.md`)) : null,
    notes_dir: path.join(dir, 'notes'),
    snapshots_dir: path.join(dir, 'snapshots'),
    revisions_dir: path.join(dir, 'revisions'),
  };

  printEvidence(result, mode);
}

function arcEvidence(argv) {
  const flags = parseFlags(argv, ['json']);
  const arcId = flags.arc;
  const mode = flags.json ? 'json' : 'text';
  if (!arcId) die('arc evidence requires --arc');

  const { dir } = loadArc(arcId);
  const result = {
    arc_directory: dir,
    state: ArcState.pathIn(dir),
    jobs: existingPath(ArcJobs.pathIn(dir)),
    notes: existingPath(path.join(dir, 'notes.md')),
    closure: existingPath(path.join(dir, 'closure.md')),
    revisions_dir: path.join(dir, 'revisions'),
  };

  printEvidence(result, mode);
}

function printEvidence(result, mode) {
  if (mode === 'json') {
    console.log(prettyGenerate(result));
  } else {
    for (const [key, value] of Object.entries(result)) {
      console.log(`${key}: ${value === null ? '(not found)' : value}`);
    }
  }
}

// Rebuilds current.json from a job's state -- the single place that derives
// the pointer's workflow/next_command/current_step projection, used both
// when a job is freshly opened and when it's explicitly made current again
// (job set-current). resolveCurrentPointer() separately keeps an
// already-written pointer in sync on every read.
function syncCurrentPointer(jobId) {
  const root = xochRoot();
  const { dir, state: jobState } = loadJob(jobId);
  const state = jobState.toJSON();

  CurrentPointer.fromJSON({
    version: 1,
    job: {
      id: jobId, title: state.title, arc: state.arc || 'standalone', directory: dir,
    },
    workflow: workflowFromState(state),
    next_command: nullable(state.next_command),
    current_step: nullable(state.current_step),
    job_type: jobTypeOf(state),
    started_at: state.started || today(),
    updated_at: utcIso8601(),
  }).save(path.join(root, 'work'));
}

function jobOpen(argv) {
  const flags = parseFlags(argv, []);
  const { title } = flags;
  if (!title) die('job open requires --title');
  const jobType = flags.type || 'standard';
  if (!JOB_TYPES.includes(jobType)) die(`job open --type must be one of: ${JOB_TYPES.join(', ')}`);
  const id = generateJobId({ id: flags.id || title });
  const dir = jobDir(id);

  for (const sub of ['notes', 'revisions', 'snapshots']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }

  JobState.create({
    id,
    title,
    description: flags.description,
    jobType,
    arc: flags.arc || 'standalone',
    docScope: flags['doc-scope'] || 'unknown',
    docPath: flags['doc-path'] || 'unknown',
    started: today(),
  }).save(dir);
  syncCurrentPointer(id);

  console.log(`Job opened: ${id}`);
  console.log(`Job directory: ${dir}`);
}

function jobSetCurrent(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  if (!jobId) die('job set-current requires --job');
  loadJob(jobId);

  syncCurrentPointer(jobId);
  console.log(`Current job set: ${jobId}`);
}

/**
 * Prints a job's whole state, or one field, as JSON. A string field read
 * without --json prints raw; an absent field prints null.
 * @param {string[]} argv - `--job ID [--field F] [--json]`.
 */
function stateGet(argv) {
  const flags = parseFlags(argv, ['json']);
  if (!flags.job) die('state get requires --job');
  const { state } = loadJob(flags.job);
  if (!flags.field) {
    console.log(JSON.stringify(state.toJSON(), null, 2));
    return;
  }
  const value = state.get(flags.field);
  if (typeof value === 'string' && !flags.json) console.log(value);
  else console.log(JSON.stringify(value === undefined ? null : value, null, 2));
}

/**
 * Sets one state field. The value is a string unless --json is given (then
 * it is parsed as JSON); a plain "null" clears the field.
 * @param {string[]} argv - `--job ID --field F --value V [--json]`.
 */
function stateSet(argv) {
  const flags = parseFlags(argv, ['json']);
  const jobId = flags.job;
  const field = flags.field;
  const raw = flags.value;
  if (!jobId) die('state set requires --job');
  if (!field) die('state set requires --field');
  const { dir, state } = loadJob(jobId);

  let value = raw === undefined || raw === 'null' ? null : raw;
  if (flags.json && raw !== undefined) {
    try {
      value = JSON.parse(raw);
    } catch (e) {
      die(`--value is not valid JSON: ${e.message}`);
    }
  }
  applyOrDie(() => state.update({ [field]: value, last_updated: today() }));
  state.save(dir);

  console.log(`Updated ${JobState.pathIn(dir)}: ${field}=${typeof value === 'string' ? value : JSON.stringify(value)}`);
}

/**
 * Merges a JSON object from stdin into job state -- all fields or none --
 * stamping last_updated unless the input sets it.
 * @param {string[]} argv - `--job ID`.
 */
function stateUpdate(argv) {
  const flags = parseFlags(argv, []);
  if (!flags.job) die('state update requires --job');
  const { dir, state } = loadJob(flags.job);
  const fields = readStdinJson();
  if (fields === null || typeof fields !== 'object' || Array.isArray(fields)) die('state update input must be a JSON object');
  applyOrDie(() => state.update({ last_updated: today(), ...fields }));
  state.save(dir);
  console.log(`Updated ${JobState.pathIn(dir)}: ${Object.keys(fields).join(', ')}`);
}

function pointerClear(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  if (!jobId) die('pointer clear requires --job');
  const root = xochRoot();
  const jsonPath = path.join(root, 'work', 'current.json');
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (data.job && data.job.id === jobId) {
      fs.unlinkSync(jsonPath);
      console.log(`Cleared pointer: ${jsonPath}`);
    }
  }
  const legacyPath = '.xoch/context/current.md';
  if (fs.existsSync(legacyPath)) {
    const text = fs.readFileSync(legacyPath, 'utf8');
    if (text.includes(`**Job ID**: ${jobId}`) || text.includes(`**Task ID**: ${jobId}`)) {
      fs.unlinkSync(legacyPath);
      console.log(`Cleared pointer: ${legacyPath}`);
    }
  }
}

function arcOpen(argv) {
  const flags = parseFlags(argv, ['adopt-active']);
  const { title } = flags;
  if (!title) die('arc open requires --title');
  const id = flags.id || slugify(title);
  const started = today();
  const dir = arcDir(id);

  fs.mkdirSync(path.join(dir, 'notes'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'revisions'), { recursive: true });

  ArcState.create({
    id,
    title,
    purpose: flags.purpose,
    success: flags.success || 'TBD',
    docScope: flags['doc-scope'] || 'unknown',
    docPath: flags['doc-path'] || 'unknown',
    started,
  }).save(dir);

  let active;
  if (flags['adopt-active']) {
    const { data } = resolveCurrentPointer();
    const currentJob = data && !data.legacy && data.job && data.job.id;
    if (currentJob) {
      active = { id: currentJob, title: data.job.title || null };
      if (JobState.exists(jobDir(currentJob))) {
        const { dir: adoptedDir, state } = loadJob(currentJob);
        active.title = active.title || state.get('title');
        state.update({ arc: id, last_updated: today() });
        state.save(adoptedDir);
      }
    }
  }
  ArcJobs.create({ active }).save(dir);

  fs.writeFileSync(path.join(dir, 'notes.md'), `# Arc Notes - ${id}

Opened: ${started}
`);

  console.log(`Arc opened: ${id}`);
  console.log(`Arc directory: ${dir}`);
}

/**
 * Prints an arc's state and membership, as JSON or as readable text.
 * @param {string[]} argv - `--arc ID [--json]`.
 */
function arcGet(argv) {
  const flags = parseFlags(argv, ['json']);
  if (!flags.arc) die('arc get requires --arc');
  const { state, jobs } = loadArc(flags.arc);
  const data = { state: state.toJSON(), jobs: jobs.toJSON() };
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  for (const [key, value] of Object.entries(data.state)) {
    console.log(`${key}: ${typeof value === 'string' || value === null ? value : JSON.stringify(value)}`);
  }
  for (const section of ARC_SECTIONS) {
    console.log(`\n${section[0].toUpperCase()}${section.slice(1)}:`);
    const entries = data.jobs[section];
    if (!entries.length) console.log('  - None');
    for (const entry of entries) console.log(`  - ${entry.id}${entry.title ? ` - ${entry.title}` : ''}`);
  }
}

/**
 * Merges a JSON object from stdin into arc state -- all fields or none --
 * stamping last_updated unless the input sets it.
 * @param {string[]} argv - `--arc ID`.
 */
function arcUpdate(argv) {
  const flags = parseFlags(argv, []);
  if (!flags.arc) die('arc update requires --arc');
  const { dir, state } = loadArc(flags.arc);
  const fields = readStdinJson();
  if (fields === null || typeof fields !== 'object' || Array.isArray(fields)) die('arc update input must be a JSON object');
  applyOrDie(() => state.update({ last_updated: today(), ...fields }));
  state.save(dir);
  console.log(`Updated ${ArcState.pathIn(dir)}: ${Object.keys(fields).join(', ')}`);
}

/**
 * Moves one job between an arc's Active, Planned, Complete, and Parked
 * lists, adding it when the arc doesn't list it yet. `--from` names a
 * differently-keyed entry (typically a Planned placeholder) to take the
 * title from and replace.
 * @param {string[]} argv - `--arc ID --job ID --to SECTION [--from ID] [--title TITLE]`.
 */
function arcJobMove(argv) {
  const flags = parseFlags(argv, []);
  const { arc, job, to } = flags;
  if (!arc || !job || !to) die('arc job-move requires --arc, --job, and --to');
  const section = to.toLowerCase();
  if (!ARC_SECTIONS.includes(section)) die(`--to must be one of ${ARC_SECTIONS.join(', ')}`);

  const { dir, jobs } = loadArc(arc);
  jobs.move(job, section, { title: flags.title, from: flags.from });
  jobs.save(dir);
  console.log(`Arc ${arc}: ${job} -> ${section[0].toUpperCase()}${section.slice(1)}`);
}

function validateToken(label, value) {
  if (!/^[a-z][a-z0-9_-]*$/.test(value)) abortRuby(`Invalid ${label}: ${value}`);
}

function isTraversalArtifact(artifact) {
  return artifact.startsWith('/') || artifact.split('/').includes('..');
}

function workflowAction(action, argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  const name = flags.name || '';
  let stage = flags.stage || '';
  let pending = flags.pending || '';
  const artifact = flags.artifact || '';
  let returnCommand = flags.return || '';
  const nextCommand = flags.next || '';
  const reason = flags.reason || '';

  if (!jobId) die(`workflow ${action} requires --job`);
  if (action === 'begin' && !name) die('workflow begin requires --name');
  if (action === 'abandon' && !reason) die('workflow abandon requires --reason');

  // Reading current state first syncs the pointer with job state.
  resolveCurrentPointer();

  const root = xochRoot();
  const pointerPath = path.join(root, 'work', 'current.json');
  const dir = jobDir(jobId);
  if (!fs.existsSync(pointerPath)) abortRuby(`Current Xoch pointer not found: ${pointerPath}`);
  if (!JobState.exists(dir)) abortRuby(`Job state not found: ${JobState.pathIn(dir)}`);
  const { state } = loadJob(jobId);

  const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
  if (!pointer.job || pointer.job.id !== jobId) abortRuby(`Current job is ${pointer.job && pointer.job.id}, not ${jobId}`);

  let workflow = pointer.workflow;
  const now = utcIso8601();
  const todayStr = today();
  let updates;

  if (action === 'begin') {
    if (workflow) abortRuby(`Workflow already active: ${workflow.name}`);
    validateToken('workflow name', name);
    stage = stage || 'in_progress';
    pending = pending || 'continue_workflow';
    validateToken('workflow stage', stage);
    validateToken('pending action', pending);
    if (!returnCommand) returnCommand = nullable(state.get('next_command')) || name;
    validateToken('return command', returnCommand);
    if (artifact && isTraversalArtifact(artifact)) abortRuby('Workflow artifact must be job-relative');
    workflow = {
      name,
      stage,
      pending_action: pending,
      artifact: artifact || null,
      return_command: returnCommand,
      started_at: now,
      updated_at: now,
    };
    updates = {
      active_workflow: name,
      workflow_stage: stage,
      pending_action: pending,
      workflow_artifact: artifact || null,
      return_command: returnCommand,
      workflow_started_at: now,
      next_command: name,
      last_updated: todayStr,
    };
  } else if (action === 'update') {
    if (!workflow) abortRuby('No active workflow');
    if (name && name !== workflow.name) abortRuby(`Workflow name does not match: ${workflow.name}`);
    if (stage) {
      validateToken('workflow stage', stage);
      workflow.stage = stage;
    }
    if (pending) {
      validateToken('pending action', pending);
      workflow.pending_action = pending;
    }
    if (artifact) {
      if (isTraversalArtifact(artifact)) abortRuby('Workflow artifact must be job-relative');
      workflow.artifact = artifact;
    }
    if (returnCommand) {
      validateToken('return command', returnCommand);
      workflow.return_command = returnCommand;
    }
    workflow.updated_at = now;
    updates = {
      active_workflow: workflow.name,
      workflow_stage: workflow.stage,
      pending_action: workflow.pending_action,
      workflow_artifact: workflow.artifact || null,
      return_command: workflow.return_command,
      workflow_started_at: workflow.started_at || now,
      next_command: workflow.name,
      last_updated: todayStr,
    };
  } else if (action === 'complete' || action === 'abandon') {
    if (!workflow) abortRuby('No active workflow');
    if (name && name !== workflow.name) abortRuby(`Workflow name does not match: ${workflow.name}`);
    // workflow is only ever non-null here via resolveCurrentPointer's own
    // sync (called above), which always fills pending_action with a
    // non-empty default -- it can never be falsy at this point.
    if (action === 'complete' && workflow.artifact && /^(finalize|write|record)_/.test(workflow.pending_action)) {
      const jobRoot = path.resolve(pointer.job.directory);
      const artifactPath = path.resolve(jobRoot, workflow.artifact);
      if (!artifactPath.startsWith(jobRoot + path.sep)) abortRuby('Workflow artifact escapes job directory');
      if (!fs.existsSync(artifactPath)) abortRuby(`Required workflow artifact not found: ${artifactPath}`);
      if (String(workflow.pending_action).startsWith('finalize_')) {
        const content = fs.readFileSync(artifactPath, 'utf8');
        if (/^\*\*Status\*\*:\s*Draft\s*$/im.test(content)) abortRuby(`Workflow artifact is still marked Draft: ${artifactPath}`);
      }
    }
    const destination = nextCommand || workflow.return_command;
    validateToken('next command', destination);
    updates = {
      active_workflow: null,
      workflow_stage: null,
      pending_action: null,
      workflow_artifact: null,
      return_command: null,
      workflow_started_at: null,
      last_workflow: workflow.name,
      last_workflow_status: action === 'complete' ? 'complete' : 'abandoned',
      last_workflow_reason: action === 'complete' ? 'completed' : reason.replace(/[\r\n]+/g, ' '),
      next_command: destination,
      last_updated: todayStr,
    };
    workflow = null;
  } else {
    abortRuby(`Unknown workflow action: ${action}`);
  }

  state.update(updates);
  state.save(dir);
  pointer.workflow = workflow;
  pointer.updated_at = now;
  writeAtomicJson(pointerPath, pointer);

  if (action === 'complete' || action === 'abandon') {
    const label = action === 'complete' ? 'completed' : 'abandoned';
    console.log(`Workflow ${label}: ${updates.last_workflow}`);
  } else {
    console.log(`Workflow ${action}: ${workflow.name} (${workflow.stage})`);
  }
}

function snapshotCreate(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  const phase = flags.phase;
  if (!jobId) die('snapshot create requires --job');
  if (!phase) die('snapshot create requires --phase');
  const title = flags.title || `Phase ${phase}`;
  const status = flags.status || 'Complete';
  const nextText = flags.next || 'TBD';
  const bodyFile = flags['body-file'];

  const dir = path.join(xochRoot(), 'work', 'jobs', jobId, 'snapshots');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `phase-${phase}.md`);

  if (bodyFile) {
    if (!fs.existsSync(bodyFile)) die(`body file not found: ${bodyFile}`);
    fs.copyFileSync(bodyFile, file);
  } else {
    fs.writeFileSync(file, `# Phase ${phase} Snapshot - ${title}

**Completed**: ${today()}
**Status**: ${status}

## What Changed

TBD

## Files Changed

- TBD

## Acceptance Criteria

- TBD

## Validation

- TBD

## Additional Notes

- TBD

## Next

${nextText}
`);
  }

  console.log(`Snapshot written: ${file}`);
}

/**
 * The current-phase fields job state carries for phase N, taken from the
 * phases document. A QA phase's validation is its case IDs.
 * @param {Phases} phases
 * @param {number} n - 1-based phase number.
 * @returns {Object}
 */
function currentPhaseFields(phases, n) {
  const phase = phases.at(n);
  return {
    current_phase: n,
    current_phase_title: phase.title,
    current_phase_goal: phase.goal,
    current_phase_type: phase.type,
    current_phase_files: phase.files.map((f) => f.path),
    current_phase_acceptance_criteria: phase.acceptance_criteria,
    current_phase_validation: phase.cases.length ? phase.cases.map((c) => c.id) : phase.testing_requirements,
  };
}

const CLEARED_PHASE_FIELDS = {
  current_phase: null,
  current_phase_title: null,
  current_phase_goal: null,
  current_phase_type: null,
  current_phase_files: [],
  current_phase_acceptance_criteria: [],
  current_phase_validation: [],
};

/**
 * Parses a --phase value as a non-negative integer, dying otherwise.
 * @param {string} value
 * @returns {number}
 */
function phaseNumber(value) {
  if (!/^\d+$/.test(String(value))) die(`phase ${value} is not a phase number`);
  return Number(value);
}

/**
 * Crosses a phase boundary by position: marks phase N complete (N=0 is the
 * entry idiom -- nothing is marked) and makes phase N+1 current, with its
 * details taken from the phases document; after the last phase, routes the
 * job to final_review. A QA job cannot enter phase 1 until its environment
 * is confirmed.
 * @param {string[]} argv - `--job ID --phase N`.
 */
function phaseAdvance(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  if (!jobId) die('phase advance requires --job');
  if (flags.phase === undefined) die('phase advance requires --phase');
  const { dir, state } = loadJob(jobId);
  const n = phaseNumber(flags.phase);

  // A QA job sends real test input at a real target, so it cannot enter
  // phase 1 until `qa confirm-env` has recorded a dev or staging target.
  if (n === 0 && jobTypeOf(state.toJSON()) === 'qa' && state.get('qa_environment_confirmed') !== true) {
    die(`QA job ${jobId} cannot enter phase 1 until its environment is confirmed -- run 'qa confirm-env' with a dev or staging target first`);
  }

  const phases = requirePhases(jobId, dir);
  const next = n + 1;
  applyOrDie(() => {
    // setStatus range-checks phase N; entering phase 1 needs a phase 1.
    if (n > 0) phases.setStatus(n, 'complete');
    else phases.indexOf(1);
  });

  const common = { phase_count: phases.count(), next_command: 'xoch-do', last_updated: today() };
  if (next <= phases.count()) {
    phases.setCurrent(next);
    state.update({
      ...common, ...currentPhaseFields(phases, next), status: 'phase_ready', current_step: 'implement', phase_index: phases.phaseIndex(),
    });
  } else {
    phases.setCurrent(null);
    state.update({
      ...common, ...CLEARED_PHASE_FIELDS, status: 'implementation_complete', current_step: 'final_review', phase_index: phases.phaseIndex(),
    });
  }
  phases.save(dir);
  state.save(dir);
  console.log(`Phase advanced for job ${jobId}: ${n} -> ${next <= phases.count() ? next : 'review'}`);
}

/**
 * Writes a whole phases document from stdin after validating it, then
 * refreshes job state's phase_count and phase_index -- and, when the
 * document names a current phase, its current-phase fields.
 * @param {string[]} argv - `--job ID`.
 */
function phaseWrite(argv) {
  const flags = parseFlags(argv, []);
  if (!flags.job) die('phase write requires --job');
  const { dir, state } = loadJob(flags.job);
  const input = readStdinJson();
  let phases;
  applyOrDie(() => {
    phases = Phases.fromJSON(input);
  });
  const current = phases.toJSON().current_phase;
  phases.save(dir);
  state.update({
    phase_count: phases.count(),
    phase_index: phases.phaseIndex(),
    ...(current === null ? {} : currentPhaseFields(phases, current)),
    last_updated: today(),
  });
  state.save(dir);
  console.log(`Phases written for job ${flags.job}: ${phases.count()} phase${phases.count() === 1 ? '' : 's'}`);
}

/**
 * Prints the phases document, or one phase (with its position as `phase`),
 * as JSON.
 * @param {string[]} argv - `--job ID [--phase N] [--json]`.
 */
function phaseGet(argv) {
  const flags = parseFlags(argv, ['json']);
  if (!flags.job) die('phase get requires --job');
  const { dir } = loadJob(flags.job);
  const phases = requirePhases(flags.job, dir);
  if (flags.phase === undefined) {
    console.log(JSON.stringify(phases.toJSON(), null, 2));
    return;
  }
  const n = phaseNumber(flags.phase);
  let phase;
  applyOrDie(() => {
    phase = phases.at(n);
  });
  console.log(JSON.stringify({ phase: n, ...phase }, null, 2));
}

// Labeled list fields `phase show` renders, in display order.
const SHOW_LISTS = [
  ['projects', 'Projects'],
  ['acceptance_criteria', 'Acceptance criteria'],
  ['behavior_tests', 'Behavior tests'],
  ['coverage_backfill', 'Coverage backfill'],
  ['testing_requirements', 'Testing requirements'],
  ['verification_focus', 'Verification focus'],
  ['engineer_instructions', 'Engineer instructions'],
  ['completion_evidence', 'Completion evidence'],
  ['notes', 'Notes'],
];

/**
 * Renders one phase as readable text.
 * @param {Object} phase
 * @param {number} n - 1-based phase number.
 * @returns {string}
 */
function renderPhase(phase, n) {
  const lines = [`## Phase ${n}: ${phase.title}`, `Type: ${phase.type}`, `Status: ${phase.status}`];
  if (phase.goal) lines.push(`Goal: ${phase.goal}`);
  for (const [key, label] of [['required_capability', 'Required capability'], ['allowed_owners', 'Allowed owners']]) {
    if (phase[key]) lines.push(`${label}: ${phase[key]}`);
  }
  if (phase.description) lines.push('', phase.description);
  if (phase.files.length) {
    lines.push('', 'Files:');
    for (const f of phase.files) lines.push(`- ${f.project ? `${f.project}: ` : ''}${f.path}${f.note ? ` - ${f.note}` : ''}`);
  }
  if (phase.cases.length) {
    lines.push('', 'Cases:');
    for (const c of phase.cases) {
      const details = Object.entries(c).filter(([k]) => k !== 'id').map(([k, v]) => `${k}: ${v}`).join('; ');
      lines.push(`- ${c.id}${details ? ` - ${details}` : ''}`);
    }
  }
  for (const [key, label] of SHOW_LISTS) {
    if (!phase[key].length) continue;
    lines.push('', `${label}:`);
    for (const item of phase[key]) lines.push(`- ${item}`);
  }
  return lines.join('\n');
}

/**
 * Prints the phases document, or one phase, as readable text.
 * @param {string[]} argv - `--job ID [--phase N]`.
 */
function phaseShow(argv) {
  const flags = parseFlags(argv, []);
  if (!flags.job) die('phase show requires --job');
  const { dir } = loadJob(flags.job);
  const phases = requirePhases(flags.job, dir);
  if (flags.phase !== undefined) {
    const n = phaseNumber(flags.phase);
    let phase;
    applyOrDie(() => {
      phase = phases.at(n);
    });
    console.log(renderPhase(phase, n));
    return;
  }
  const doc = phases.toJSON();
  const out = [`Current phase: ${doc.current_phase === null ? 'none' : doc.current_phase}`];
  doc.phases.forEach((phase, i) => out.push('', renderPhase(phase, i + 1)));
  if (doc.notes.length) out.push('', '## Notes', ...doc.notes.map((note) => `- ${note}`));
  console.log(out.join('\n'));
}

// Step-only transitions for a bundled multi-step command (xoch-open,
// xoch-do): no phase-index bookkeeping involved and no outcome-dependent
// judgment involved, so no --next-* content is needed. The caller (a bundled
// skill) invokes this with no step name of its own choosing and reports
// whatever current_step comes back -- it never decides or writes the step
// name itself. Two kinds of transition are deliberately excluded from this
// table, since a fixed lookup would get them wrong:
//   - Crossing a phase boundary (entering phase 1, moving to the next phase,
//     or falling through to final_review once every phase is done) needs
//     phase-content flags and phases.md/phase_index bookkeeping that only
//     phaseAdvance has; it sets current_step too.
//   - Leaving final_review is outcome-dependent, not mechanical: a passing
//     review routes to xoch-doc, a failing one routes back into
//     implementation, and review-core.md's own state update already
//     carries that judgment -- it sets current_step directly as part of the
//     same update, rather than asking this helper to guess it.
// Per job type: a QA job's open sequence runs through `intake` instead of
// `spec`; the xoch-do steps are shared so `phase advance` is type-agnostic.
const STEP_TRANSITIONS = {
  standard: {
    title: 'spec',
    spec: 'plan',
    implement: 'advance',
  },
  qa: {
    title: 'intake',
    intake: 'plan',
    implement: 'advance',
  },
};

// Environments a QA job may run against. Anything else -- production
// included -- is refused outright rather than confirmed twice.
const QA_ENVIRONMENTS = ['dev', 'staging'];

/**
 * Records the engineer's confirmation that a QA job targets a dev or
 * staging environment, which `phase advance` requires before phase 1.
 * @param {string[]} argv - `--job ID --env dev|staging --target TEXT`.
 */
function qaConfirmEnv(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  if (!jobId) die('qa confirm-env requires --job');
  if (!flags.env) die('qa confirm-env requires --env');
  if (!flags.target) die('qa confirm-env requires --target');
  if (!QA_ENVIRONMENTS.includes(flags.env)) {
    die(`qa confirm-env --env must be one of: ${QA_ENVIRONMENTS.join(', ')}`);
  }
  const { dir, state } = loadJob(jobId);

  state.update({
    qa_environment: flags.env,
    qa_target: flags.target,
    qa_environment_confirmed: true,
    last_updated: today(),
  });
  state.save(dir);
  console.log(`QA environment confirmed for job ${jobId}: ${flags.env} (${flags.target})`);
}

/**
 * Records which QA capabilities the agent has (browser automation, HTTP
 * requests, shell), as one `qa_capabilities` string in job state.
 * @param {string[]} argv - `--job ID --browser yes|no --http yes|no --shell yes|no`.
 */
function qaCapabilities(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  if (!jobId) die('qa capabilities requires --job');
  const parts = [];
  for (const name of ['browser', 'http', 'shell']) {
    if (!['yes', 'no'].includes(flags[name])) die(`qa capabilities --${name} must be yes or no`);
    parts.push(`${name}=${flags[name]}`);
  }
  const { dir, state } = loadJob(jobId);

  const value = parts.join(', ');
  state.update({ qa_capabilities: value, last_updated: today() });
  state.save(dir);
  console.log(`QA capabilities recorded for job ${jobId}: ${value}`);
}

function stepAdvance(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  if (!jobId) die('job step-advance requires --job');
  const { dir, state: jobState } = loadJob(jobId);
  const state = jobState.toJSON();
  const currentStep = nullable(state.current_step);
  if (!currentStep) die(`job ${jobId} has no current_step set`);

  const jobType = jobTypeOf(state);
  if (!Object.prototype.hasOwnProperty.call(STEP_TRANSITIONS, jobType)) {
    die(`job ${jobId} has unknown job_type '${jobType}' -- expected one of: ${JOB_TYPES.join(', ')}`);
  }
  const transitions = STEP_TRANSITIONS[jobType];

  if (!Object.prototype.hasOwnProperty.call(transitions, currentStep)) {
    die(`step-advance has no deterministic follow-up for '${currentStep}' -- phase-crossing transitions go through 'phase advance', and leaving final_review is written directly to job state by review's own outcome`);
  }

  const updates = { current_step: transitions[currentStep], last_updated: today() };
  jobState.update(updates);
  jobState.save(dir);
  console.log(`Step advanced for job ${jobId}: ${currentStep} -> ${updates.current_step}`);
}

// Separator line used by `file edit`'s stdin format: old text, then a
// line matching this exactly, then new text.
const EDIT_SEPARATOR = '-----XOCH-EDIT-SEPARATOR-----';

function fileWrite(argv) {
  const flags = parseFlags(argv, ['append']);
  const target = resolveJobFile(flags.job, flags.path, { write: true });
  const content = fs.readFileSync(0, 'utf8');

  if (flags.append && fs.existsSync(target)) {
    writeAtomicText(target, fs.readFileSync(target, 'utf8') + content);
    console.log(`File appended: ${target}`);
  } else {
    writeAtomicText(target, content);
    console.log(`File written: ${target}`);
  }
}

function fileRead(argv) {
  const flags = parseFlags(argv, []);
  const target = resolveJobFile(flags.job, flags.path);
  if (!fs.existsSync(target)) die(`file not found: ${target}`);
  process.stdout.write(fs.readFileSync(target, 'utf8'));
}

function fileEdit(argv) {
  const flags = parseFlags(argv, ['replace-all']);
  const target = resolveJobFile(flags.job, flags.path, { write: true });
  if (!fs.existsSync(target)) die(`file not found: ${target}`);

  const stdin = fs.readFileSync(0, 'utf8');
  const marker = `\n${EDIT_SEPARATOR}\n`;
  const sepIndex = stdin.indexOf(marker);
  if (sepIndex === -1) die(`file edit stdin must contain old text, a line with exactly "${EDIT_SEPARATOR}", then new text`);
  // The marker consumes the newline terminating old text's last line; put
  // it back, since that newline is part of the file content being matched,
  // not part of the separator itself.
  const oldText = `${stdin.slice(0, sepIndex)}\n`;
  const newText = stdin.slice(sepIndex + marker.length);

  const content = fs.readFileSync(target, 'utf8');
  const occurrences = content.split(oldText).length - 1;
  if (occurrences === 0) die('old text not found in file');
  if (occurrences > 1 && !flags['replace-all']) die(`old text is ambiguous (${occurrences} matches); pass --replace-all to replace all occurrences`);

  const updated = flags['replace-all'] ? content.split(oldText).join(newText) : content.replace(oldText, newText);
  writeAtomicText(target, updated);
  console.log(`File edited: ${target} (${occurrences} replacement${occurrences === 1 ? '' : 's'})`);
}

// Discovery findings live in a shared directory rather than a job's own
// notes -- unlike everything else in this file, they need to be writable
// and readable with no job active at all, and stay discoverable by a
// later, unrelated job. Filenames are date-topic-discovery.md, matching
// the shape discovery-core.md already documented before this existed as a
// deterministic command; a same-day rewrite of the same topic gets a
// numeric suffix instead of overwriting the earlier finding.
function discoveryWrite(argv) {
  const flags = parseFlags(argv, []);
  const topic = flags.topic;
  if (!topic) die('--topic is required');
  const topicSlug = slugify(topic);
  if (!topicSlug) die(`--topic produces an empty slug: '${topic}'`);

  const content = fs.readFileSync(0, 'utf8');
  const discoveriesDir = path.join(xochRoot(), 'discoveries');
  const datePrefix = today();
  const base = `${datePrefix}-${topicSlug}`;

  let target = path.join(discoveriesDir, `${base}-discovery.md`);
  let suffix = 2;
  while (fs.existsSync(target)) {
    target = path.join(discoveriesDir, `${base}-${suffix}-discovery.md`);
    suffix += 1;
  }

  writeAtomicText(target, content);
  console.log(`Discovery written: ${target}`);
}

function discoveryRead(argv) {
  const flags = parseFlags(argv, []);
  const relPath = flags.path;
  if (!relPath) die('--path is required');
  if (isTraversalArtifact(relPath)) die('discovery path must not escape the discoveries directory (traversal rejected)');
  const target = path.join(xochRoot(), 'discoveries', relPath);
  if (!fs.existsSync(target)) die(`discovery not found: ${target}`);
  process.stdout.write(fs.readFileSync(target, 'utf8'));
}

function usage() {
  process.stdout.write(`Usage:
  xoch-actions.js job current [--json]
  xoch-actions.js job open --id ID --title TITLE [--description TEXT] [--arc ARC] [--doc-scope SCOPE] [--doc-path PATH] [--type standard|qa]
  xoch-actions.js job set-current --job ID
  xoch-actions.js qa confirm-env --job ID --env dev|staging --target TEXT
  xoch-actions.js qa capabilities --job ID --browser yes|no --http yes|no --shell yes|no
  xoch-actions.js state get --job ID [--field FIELD] [--json]
  xoch-actions.js state set --job ID --field FIELD --value VALUE [--json]
  xoch-actions.js state update --job ID            (JSON object on stdin)
  xoch-actions.js pointer clear --job ID
  xoch-actions.js workflow begin --job ID --name NAME [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
  xoch-actions.js workflow update --job ID [--name NAME] [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
  xoch-actions.js workflow complete --job ID [--name NAME] [--next COMMAND]
  xoch-actions.js workflow abandon --job ID [--name NAME] --reason TEXT [--next COMMAND]
  xoch-actions.js arc open --id ID --title TITLE [--purpose TEXT] [--success TEXT] [--doc-scope SCOPE] [--doc-path PATH] [--adopt-active]
  xoch-actions.js arc job-move --arc ID --job ID --to active|planned|complete|parked [--from ID] [--title TITLE]
  xoch-actions.js arc get --arc ID [--json]
  xoch-actions.js arc update --arc ID              (JSON object on stdin)
  xoch-actions.js snapshot create --job ID --phase N --title TITLE [--status STATUS] [--next NEXT] [--body-file FILE]
  xoch-actions.js phase advance --job ID --phase N
  xoch-actions.js phase write --job ID             (phases JSON on stdin)
  xoch-actions.js phase get --job ID [--phase N] [--json]
  xoch-actions.js phase show --job ID [--phase N]
  xoch-actions.js job step-advance --job ID
  xoch-actions.js config root
  xoch-actions.js job evidence --job ID [--json]
  xoch-actions.js arc evidence --arc ID [--json]
  xoch-actions.js file write --job ID --path PATH [--append]
  xoch-actions.js file read --job ID --path PATH
  xoch-actions.js file edit --job ID --path PATH [--replace-all]
  xoch-actions.js discovery write --topic TOPIC
  xoch-actions.js discovery read --path PATH
`);
}

function main(argv) {
  // Matches require_project_root running unconditionally before any
  // other check in bash's main() -- the storage root is created even
  // for -h/--help/no-args invocations.
  ensureRoot();
  const [group, action] = argv;

  if (group === '-h' || group === '--help' || !group) {
    usage();
    if (!group) process.exit(1);
    return;
  }

  const rest = argv.slice(2);
  const key = `${group}:${action || ''}`;

  switch (key) {
    case 'config:root':
      console.log(xochRoot());
      break;
    case 'job:current':
      jobCurrent(rest);
      break;
    case 'job:evidence':
      jobEvidence(rest);
      break;
    case 'arc:evidence':
      arcEvidence(rest);
      break;
    case 'job:open':
      jobOpen(rest);
      break;
    case 'job:set-current':
      jobSetCurrent(rest);
      break;
    case 'arc:open':
      arcOpen(rest);
      break;
    case 'arc:job-move':
      arcJobMove(rest);
      break;
    case 'state:get':
      stateGet(rest);
      break;
    case 'state:set':
      stateSet(rest);
      break;
    case 'state:update':
      stateUpdate(rest);
      break;
    case 'arc:get':
      arcGet(rest);
      break;
    case 'arc:update':
      arcUpdate(rest);
      break;
    case 'phase:write':
      phaseWrite(rest);
      break;
    case 'phase:get':
      phaseGet(rest);
      break;
    case 'phase:show':
      phaseShow(rest);
      break;
    case 'pointer:clear':
      pointerClear(rest);
      break;
    case 'workflow:begin':
      workflowAction('begin', rest);
      break;
    case 'workflow:update':
      workflowAction('update', rest);
      break;
    case 'workflow:complete':
      workflowAction('complete', rest);
      break;
    case 'workflow:abandon':
      workflowAction('abandon', rest);
      break;
    case 'snapshot:create':
      snapshotCreate(rest);
      break;
    case 'phase:advance':
      phaseAdvance(rest);
      break;
    case 'job:step-advance':
      stepAdvance(rest);
      break;
    case 'qa:confirm-env':
      qaConfirmEnv(rest);
      break;
    case 'qa:capabilities':
      qaCapabilities(rest);
      break;
    case 'file:write':
      fileWrite(rest);
      break;
    case 'file:read':
      fileRead(rest);
      break;
    case 'file:edit':
      fileEdit(rest);
      break;
    case 'discovery:write':
      discoveryWrite(rest);
      break;
    case 'discovery:read':
      discoveryRead(rest);
      break;
    default:
      die(`unknown action: ${group} ${action || ''}`);
  }
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}

export {
  die,
  today,
  slugify,
  xochRoot,
  parseFlags,
  ensureRoot,
  markdownFields,
  nullable,
  workflowFromState,
  validatePointer,
  jobCurrent,
  jobEvidence,
  arcEvidence,
  syncCurrentPointer,
  jobOpen,
  jobSetCurrent,
  stateGet,
  stateSet,
  stateUpdate,
  pointerClear,
  arcOpen,
  arcJobMove,
  arcGet,
  arcUpdate,
  workflowAction,
  resolveCurrentPointer,
  snapshotCreate,
  phaseAdvance,
  phaseWrite,
  phaseGet,
  phaseShow,
  writeAtomicText,
  resolveJobFile,
  fileWrite,
  fileRead,
  fileEdit,
  discoveryWrite,
  discoveryRead,
  main,
};
