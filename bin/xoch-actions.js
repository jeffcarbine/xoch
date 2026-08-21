#!/usr/bin/env node
'use strict';

// Xoch deterministic helper actions.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { readJson } = require('./lib/json-store.js');
const { parseFlags } = require('./lib/args.js');
const { prettyGenerate } = require('./lib/ruby-json.js');
const { cleanId, generateJobId } = require('./generate-job-id.js');

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

// Parse a state.md's top-level "key: value" scalar lines. Indented list
// entries (e.g. under phase_index:) do not match and are skipped, same
// as the bash original's line-anchored regex.
function scalarState(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const data = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return data;
}

// Parses a legacy markdown pointer's "**Key**: value" lines into
// snake_case fields (e.g. "**Job ID**:" -> job_id). Used for both the
// target-model current.md migration and the .xoch/context/current.md
// legacy read-only fallback.
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

function nullable(value) {
  return value === undefined || value === null || value === '' || value === 'null' ? null : value;
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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(temp, `${prettyGenerate(data)}\n`);
  fs.renameSync(temp, filePath);
}

// Resolves the active job pointer, migrating a target-model current.md
// pointer to current.json (deleting the .md afterward) or falling back
// to reading the legacy .xoch/context/current.md pointer read-only, in
// that priority order -- matching job_current's full three-branch bash
// logic. Also normalizes an existing current.json's projected workflow
// against its job's state.md, writing back only if it changed.
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
    const state = scalarState(path.join(data.job.directory, 'state.md'));
    if (Object.keys(state).length) {
      const projectedWorkflow = workflowFromState(state, data.workflow);
      if (JSON.stringify(projectedWorkflow) !== JSON.stringify(data.workflow)) {
        data.workflow = projectedWorkflow;
        data.updated_at = utcIso8601();
        writeAtomicJson(jsonPath, data);
      }
    }
    pointer = jsonPath;
  } else if (fs.existsSync(markdownPath)) {
    const fields = markdownFields(markdownPath);
    const jobId = fields.job_id || fields.task_id;
    if (!jobId) abortRuby(`Cannot migrate ${markdownPath}: job ID is missing`);
    const state = scalarState(path.join(root, 'work', 'jobs', jobId, 'state.md'));
    const workflow = workflowFromState(state);
    data = {
      version: 1,
      job: {
        id: jobId,
        title: fields.title || state.title || jobId,
        arc: fields.arc || state.arc || 'standalone',
        directory: fields.job_directory || path.join(root, 'work', 'jobs', jobId),
      },
      workflow,
      updated_at: utcIso8601(),
    };
    writeAtomicJson(jsonPath, data);
    fs.unlinkSync(markdownPath);
    pointer = jsonPath;
  } else if (fs.existsSync(legacyPath)) {
    const fields = markdownFields(legacyPath);
    data = {
      version: 1,
      legacy: true,
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

  const jobDir = path.join(xochRoot(), 'work', 'jobs', jobId);
  const statePath = path.join(jobDir, 'state.md');
  if (!fs.existsSync(statePath)) die(`job not found: ${jobId}`);

  const state = scalarState(statePath);
  const currentPhase = nullable(state.current_phase);

  const result = {
    job_directory: jobDir,
    state: statePath,
    spec: existingPath(path.join(jobDir, 'spec.md')),
    plan: existingPath(path.join(jobDir, 'plan.md')),
    phases: existingPath(path.join(jobDir, 'phases.md')),
    review: existingPath(path.join(jobDir, 'review.md')),
    closure: existingPath(path.join(jobDir, 'closure.md')),
    current_phase: currentPhase,
    current_phase_snapshot: currentPhase ? existingPath(path.join(jobDir, 'snapshots', `phase-${currentPhase}.md`)) : null,
    current_phase_body: currentPhase ? existingPath(path.join(jobDir, 'phases', `phase-${currentPhase}.md`)) : null,
    notes_dir: path.join(jobDir, 'notes'),
    snapshots_dir: path.join(jobDir, 'snapshots'),
    revisions_dir: path.join(jobDir, 'revisions'),
  };

  printEvidence(result, mode);
}

function arcEvidence(argv) {
  const flags = parseFlags(argv, ['json']);
  const arcId = flags.arc;
  const mode = flags.json ? 'json' : 'text';
  if (!arcId) die('arc evidence requires --arc');

  const arcDir = path.join(xochRoot(), 'work', 'arcs', arcId);
  const statePath = path.join(arcDir, 'state.md');
  if (!fs.existsSync(statePath)) die(`arc not found: ${arcId}`);

  const result = {
    arc_directory: arcDir,
    state: statePath,
    jobs: existingPath(path.join(arcDir, 'jobs.md')),
    notes: existingPath(path.join(arcDir, 'notes.md')),
    closure: existingPath(path.join(arcDir, 'closure.md')),
    revisions_dir: path.join(arcDir, 'revisions'),
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

function writeCurrent(jobId, title, arc, started) {
  const root = xochRoot();
  const jobDir = path.join(root, 'work', 'jobs', jobId);
  const pointerPath = path.join(root, 'work', 'current.json');
  writeAtomicJson(pointerPath, {
    version: 1,
    job: { id: jobId, title, arc, directory: jobDir },
    workflow: null,
    started_at: started,
    updated_at: utcIso8601(),
  });
  const currentMd = path.join(root, 'work', 'current.md');
  if (fs.existsSync(currentMd)) fs.unlinkSync(currentMd);
}

function jobOpen(argv) {
  const flags = parseFlags(argv, []);
  const { title } = flags;
  if (!title) die('job open requires --title');
  const arc = flags.arc || 'standalone';
  const docScope = flags['doc-scope'] || 'unknown';
  const docPath = flags['doc-path'] || 'unknown';
  const id = generateJobId({ id: flags.id || title });
  const description = flags.description || title;
  const started = today();
  const jobDir = path.join(xochRoot(), 'work', 'jobs', id);

  for (const sub of ['notes', 'phases', 'revisions', 'snapshots']) {
    fs.mkdirSync(path.join(jobDir, sub), { recursive: true });
  }

  const stateContent = `job_id: ${id}
title: ${title}
description: ${description}
status: active
arc: ${arc}
current_phase: null
phase_count: 0
current_phase_title: null
current_phase_goal: null
current_phase_files: []
current_phase_acceptance_criteria: []
current_phase_validation: []
phase_index: []
documentation_targets:
  - scope: ${docScope}
    path: ${docPath}
decisions: []
risks: []
unresolved_questions: []
active_workflow: null
workflow_stage: null
pending_action: null
workflow_artifact: null
return_command: null
workflow_started_at: null
review_status: null
closure_status: null
next_command: xoch-spec
started: ${started}
last_updated: ${started}
`;
  fs.writeFileSync(path.join(jobDir, 'state.md'), stateContent);
  writeCurrent(id, title, arc, started);

  console.log(`Job opened: ${id}`);
  console.log(`Job directory: ${jobDir}`);
}

function jobSetCurrent(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  if (!jobId) die('job set-current requires --job');
  const root = xochRoot();
  const statePath = path.join(root, 'work', 'jobs', jobId, 'state.md');
  if (!fs.existsSync(statePath)) die(`state not found: ${statePath}`);

  const state = scalarState(statePath);
  const title = state.title || jobId;
  const arc = state.arc || 'standalone';
  const started = state.started || today();
  const active = nullable(state.active_workflow);
  const workflow = active ? {
    name: active,
    stage: nullable(state.workflow_stage) || 'in_progress',
    pending_action: nullable(state.pending_action) || 'resume_workflow',
    artifact: nullable(state.workflow_artifact),
    return_command: nullable(state.return_command) || nullable(state.next_command) || active,
    started_at: nullable(state.workflow_started_at),
    updated_at: utcIso8601(),
  } : null;

  writeAtomicJson(path.join(root, 'work', 'current.json'), {
    version: 1,
    job: { id: jobId, title, arc, directory: path.join(root, 'work', 'jobs', jobId) },
    workflow,
    started_at: started,
    updated_at: utcIso8601(),
  });
  const currentMd = path.join(root, 'work', 'current.md');
  if (fs.existsSync(currentMd)) fs.unlinkSync(currentMd);

  console.log(`Current job set: ${jobId}`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stateSet(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  const field = flags.field;
  const value = flags.value;
  if (!jobId) die('state set requires --job');
  if (!field) die('state set requires --field');
  const statePath = path.join(xochRoot(), 'work', 'jobs', jobId, 'state.md');
  if (!fs.existsSync(statePath)) die(`state not found: ${statePath}`);

  const fieldPattern = new RegExp(`^${escapeRegex(field)}:`);
  const lines = fs.readFileSync(statePath, 'utf8').replace(/\n$/, '').split('\n');
  let found = false;
  const out = lines.map((line) => {
    if (fieldPattern.test(line)) {
      found = true;
      return `${field}: ${value}`;
    }
    if (/^last_updated:/.test(line)) return `last_updated: ${today()}`;
    return line;
  });
  if (!found) out.push(`${field}: ${value}`);
  if (!out.some((line) => line.startsWith('last_updated:'))) out.push(`last_updated: ${today()}`);
  fs.writeFileSync(statePath, `${out.join('\n')}\n`);

  console.log(`Updated ${statePath}: ${field}=${value}`);
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
  for (const file of [path.join(root, 'work', 'current.md'), '.xoch/context/current.md']) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!(text.includes(`**Job ID**: ${jobId}`) || text.includes(`**Task ID**: ${jobId}`))) continue;
    fs.unlinkSync(file);
    console.log(`Cleared pointer: ${file}`);
  }
}

function arcOpen(argv) {
  const flags = parseFlags(argv, ['adopt-active']);
  const { title } = flags;
  if (!title) die('arc open requires --title');
  const id = flags.id || slugify(title);
  const purpose = flags.purpose || title;
  const success = flags.success || 'TBD';
  const docScope = flags['doc-scope'] || 'unknown';
  const docPath = flags['doc-path'] || 'unknown';
  const adoptActive = Boolean(flags['adopt-active']);
  const started = today();
  const root = xochRoot();
  const arcDir = path.join(root, 'work', 'arcs', id);

  fs.mkdirSync(path.join(arcDir, 'notes'), { recursive: true });
  fs.mkdirSync(path.join(arcDir, 'revisions'), { recursive: true });

  const stateContent = `arc_id: ${id}
title: ${title}
purpose: ${purpose}
status: active
documentation_targets:
  - scope: ${docScope}
    path: ${docPath}
success_outcome: ${success}
risks: []
unresolved_questions: []
started: ${started}
last_updated: ${started}
next_command: xoch-open-job
`;
  fs.writeFileSync(path.join(arcDir, 'state.md'), stateContent);

  let activeLine = '- None';
  if (adoptActive) {
    // Reading current state also migrates a target-model current.md pointer.
    resolveCurrentPointer();
    const pointerPath = path.join(root, 'work', 'current.json');
    if (fs.existsSync(pointerPath)) {
      const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
      const currentJob = pointer.job && pointer.job.id;
      const currentTitle = pointer.job && pointer.job.title;
      if (currentJob) {
        activeLine = `- \`${currentJob}\` - ${currentTitle || 'unknown'}`;
        const jobStatePath = path.join(root, 'work', 'jobs', currentJob, 'state.md');
        if (fs.existsSync(jobStatePath)) {
          const lines = fs.readFileSync(jobStatePath, 'utf8').replace(/\n$/, '').split('\n');
          let found = false;
          const out = lines.map((line) => {
            if (/^arc:/.test(line)) {
              found = true;
              return `arc: ${id}`;
            }
            if (/^last_updated:/.test(line)) return `last_updated: ${today()}`;
            return line;
          });
          if (!found) out.push(`arc: ${id}`);
          fs.writeFileSync(jobStatePath, `${out.join('\n')}\n`);
        }
      }
    }
  }

  fs.writeFileSync(path.join(arcDir, 'jobs.md'), `# Arc Jobs - ${id}

## Active

${activeLine}

## Planned

- None

## Complete

- None

## Parked

- None
`);

  fs.writeFileSync(path.join(arcDir, 'notes.md'), `# Arc Notes - ${id}

Opened: ${started}
`);

  console.log(`Arc opened: ${id}`);
  console.log(`Arc directory: ${arcDir}`);
}

function updateStateFields(statePath, updates) {
  const lines = fs.readFileSync(statePath, 'utf8').replace(/\n$/, '').split('\n');
  const found = {};
  const out = lines.map((line) => {
    const key = Object.keys(updates).find((candidate) => line.startsWith(`${candidate}:`));
    if (key) {
      found[key] = true;
      return `${key}: ${updates[key]}`;
    }
    return line;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!found[key]) out.push(`${key}: ${value}`);
  }
  fs.writeFileSync(statePath, `${out.join('\n')}\n`);
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

  // Reading current state also migrates a target-model current.md pointer.
  resolveCurrentPointer();

  const root = xochRoot();
  const pointerPath = path.join(root, 'work', 'current.json');
  const statePath = path.join(root, 'work', 'jobs', jobId, 'state.md');
  if (!fs.existsSync(pointerPath)) abortRuby(`Current Xoch pointer not found: ${pointerPath}`);
  if (!fs.existsSync(statePath)) abortRuby(`Job state not found: ${statePath}`);

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
    if (!returnCommand) returnCommand = nullable(scalarState(statePath).next_command) || name;
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
      workflow_artifact: artifact || 'null',
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
      workflow_artifact: workflow.artifact || 'null',
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
      active_workflow: 'null',
      workflow_stage: 'null',
      pending_action: 'null',
      workflow_artifact: 'null',
      return_command: 'null',
      workflow_started_at: 'null',
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

  updateStateFields(statePath, updates);
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

function csvLines(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter((item) => item.length > 0);
}

// Regex translation note: Ruby's ^/$ always match at line boundaries
// (no separate "multiline" concept), and /m only makes "." match "\n".
// JS needs the "m" flag for line-anchored ^/$ AND the "s" flag for "."
// to match "\n" -- and Ruby's trailing "\z" (absolute end of string,
// unaffected by /m) has no direct JS equivalent once "m" is in play, so
// it's expressed here as the zero-width "(?![\s\S])" lookahead instead
// of a plain "$" (which "m" would otherwise make match every line end,
// truncating the lazy capture at the phase body's first line break).
function phaseAdvance(argv) {
  const flags = parseFlags(argv, []);
  const jobId = flags.job;
  const phase = flags.phase;
  if (!jobId) die('phase advance requires --job');
  if (!phase) die('phase advance requires --phase');

  const nextPhase = flags['next-phase'] || '';
  const nextTitle = flags['next-title'] || '';
  const nextGoal = flags['next-goal'] || '';
  const nextFiles = flags['next-files'] || '';
  const nextAc = flags['next-ac'] || '';
  const nextValidation = flags['next-validation'] || '';

  const jobDir = path.join(xochRoot(), 'work', 'jobs', jobId);
  const statePath = path.join(jobDir, 'state.md');
  const phasesPath = path.join(jobDir, 'phases.md');
  if (!fs.existsSync(statePath)) die(`state not found: ${statePath}`);

  const todayStr = today();
  const phaseEntries = [];

  if (fs.existsSync(phasesPath)) {
    let text = fs.readFileSync(phasesPath, 'utf8');
    if (nextPhase) {
      text = text.replace(/(## Current Phase:\s*)\d+/, `$1${nextPhase}`);
    }
    const escapedPhase = escapeRegex(phase);
    const statusPattern = new RegExp(
      `(## Phase ${escapedPhase}:.*?)(\\*\\*Status\\*\\*:\\s*)([^\\n]+)(.*?)(?=\\n---\\n|\\n## Phase |(?![\\s\\S]))`,
      's',
    );
    text = text.replace(statusPattern, (match, before, label, status, after) => `${before}${label}Complete${after}`);
    fs.writeFileSync(phasesPath, text);

    const scanPattern = /^## Phase\s+(\d+):\s*(.*?)\n(.*?)(?=\n---\n|\n## Phase |(?![\s\S]))/gms;
    let match = scanPattern.exec(text);
    while (match !== null) {
      const [, number, title, body] = match;
      const statusMatch = body.match(/\*\*Status\*\*:\s*([^\n]+)/);
      const status = statusMatch ? statusMatch[1] : 'unknown';
      phaseEntries.push([number, title.trim(), status.trim().toLowerCase().replace(/\s+/g, '_')]);
      match = scanPattern.exec(text);
    }
  }

  const updates = nextPhase === ''
    ? {
      status: 'implementation_complete',
      current_phase: 'null',
      phase_count: String(phaseEntries.length),
      current_phase_title: 'null',
      current_phase_goal: 'null',
      current_phase_files: '[]',
      current_phase_acceptance_criteria: '[]',
      current_phase_validation: '[]',
      next_command: 'xoch-review',
      last_updated: todayStr,
    }
    : {
      status: 'phase_ready',
      current_phase: nextPhase,
      phase_count: String(phaseEntries.length),
      current_phase_title: nextTitle,
      current_phase_goal: nextGoal,
      next_command: 'xoch-make',
      last_updated: todayStr,
    };

  const skipBlocks = ['current_phase_files', 'current_phase_acceptance_criteria', 'current_phase_validation', 'phase_index'];
  const lines = fs.readFileSync(statePath, 'utf8').replace(/\n$/, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const keyMatch = line.match(/^([A-Za-z0-9_]+):/);
    const key = keyMatch ? keyMatch[1] : null;
    if (key && Object.prototype.hasOwnProperty.call(updates, key)) {
      out.push(`${key}: ${updates[key]}`);
      i += 1;
    } else if (key && skipBlocks.includes(key)) {
      i += 1;
      while (i < lines.length && /^\s+- /.test(lines[i])) i += 1;
    } else {
      out.push(line);
      i += 1;
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!out.some((line) => line.startsWith(`${key}:`))) out.push(`${key}: ${value}`);
  }

  if (nextPhase !== '') {
    out.push('current_phase_files:');
    for (const item of csvLines(nextFiles)) out.push(`  - ${item}`);
    out.push('current_phase_acceptance_criteria:');
    for (const item of csvLines(nextAc)) out.push(`  - ${item}`);
    out.push('current_phase_validation:');
    for (const item of csvLines(nextValidation)) out.push(`  - ${item}`);
  }

  if (phaseEntries.length) {
    out.push('phase_index:');
    for (const [number, title, status] of phaseEntries) {
      out.push(`  - phase: ${number}, title: ${title}, status: ${status}`);
    }
  }

  fs.writeFileSync(statePath, `${out.join('\n')}\n`);
  console.log(`Phase advanced for job ${jobId}: ${phase} -> ${nextPhase || 'review'}`);
}

function usage() {
  process.stdout.write(`Usage:
  xoch-actions.js job current [--json]
  xoch-actions.js job open --id ID --title TITLE [--description TEXT] [--arc ARC] [--doc-scope SCOPE] [--doc-path PATH]
  xoch-actions.js job set-current --job ID
  xoch-actions.js state set --job ID --field FIELD --value VALUE
  xoch-actions.js pointer clear --job ID
  xoch-actions.js workflow begin --job ID --name NAME [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
  xoch-actions.js workflow update --job ID [--name NAME] [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
  xoch-actions.js workflow complete --job ID [--name NAME] [--next COMMAND]
  xoch-actions.js workflow abandon --job ID [--name NAME] --reason TEXT [--next COMMAND]
  xoch-actions.js arc open --id ID --title TITLE [--purpose TEXT] [--success TEXT] [--doc-scope SCOPE] [--doc-path PATH] [--adopt-active]
  xoch-actions.js snapshot create --job ID --phase N --title TITLE [--status STATUS] [--next NEXT] [--body-file FILE]
  xoch-actions.js phase advance --job ID --phase N [--next-phase N] [--next-title TITLE] [--next-goal TEXT] [--next-files CSV] [--next-ac CSV] [--next-validation CSV]
  xoch-actions.js config root
  xoch-actions.js job evidence --job ID [--json]
  xoch-actions.js arc evidence --arc ID [--json]
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
    case 'state:set':
      stateSet(rest);
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
    default:
      die(`unknown action: ${group} ${action || ''}`);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  die,
  today,
  slugify,
  xochRoot,
  parseFlags,
  ensureRoot,
  scalarState,
  markdownFields,
  nullable,
  workflowFromState,
  validatePointer,
  jobCurrent,
  jobEvidence,
  arcEvidence,
  writeCurrent,
  jobOpen,
  jobSetCurrent,
  stateSet,
  pointerClear,
  arcOpen,
  workflowAction,
  resolveCurrentPointer,
  snapshotCreate,
  phaseAdvance,
  main,
};
