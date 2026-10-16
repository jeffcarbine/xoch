'use strict';

// Moves Xoch data between in-repo storage (<repo>/.xoch/) and centralized
// storage (~/.xoch/projects/<slug>/) for every known repo, so switching
// `storage.mode` never strands a repo's jobs where Xoch no longer looks.
// `config set storage.mode` plans the move, shows it, and only then
// executes it; a failure partway through undoes every move already made.
//
// Everything in a repo's .xoch/ moves except context/, the legacy job
// model, which always stays in the repo. A centralized root records the
// repo it came from in repo.json so it can be moved back.

import fs from 'fs';
import path from 'path';
import { readJson } from './lib/json-store.js';
import { git } from './lib/git.js';
import { cleanId } from './generate-job-id.js';

const STAYS_IN_REPO = ['context'];
const REPO_RECORD = 'repo.json';

function projectsDir(home) {
  return path.join(home, '.xoch', 'projects');
}

function listDir(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
}

function isDir(p) {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

/**
 * The repo a centralized root records, or null.
 * @param {string} root - Centralized root directory.
 * @returns {string|null}
 */
function recordedRepo(root) {
  const data = readJson(path.join(root, REPO_RECORD));
  return typeof data.path === 'string' ? data.path : null;
}

/**
 * Every repo Xoch knows about: the workspace map's projects, the repos
 * centralized roots record, and -- with scanDir -- each folder directly
 * under scanDir that has a .xoch folder. Only existing directories count.
 * @param {Object} options
 * @param {string} options.home - Home directory (holds .xoch/).
 * @param {string} [options.scanDir] - Folder whose children may be repos.
 * @returns {string[]} Repo paths, sorted.
 */
function findRepos({ home, scanDir }) {
  const repos = new Set();
  const map = readJson(path.join(home, '.xoch', 'workspace-map.json'));
  for (const project of Object.values(map.projects || {})) {
    if (project && typeof project.path === 'string' && isDir(project.path)) repos.add(project.path);
  }
  for (const name of listDir(projectsDir(home))) {
    const repo = recordedRepo(path.join(projectsDir(home), name));
    if (repo && isDir(repo)) repos.add(repo);
  }
  if (scanDir) {
    for (const name of listDir(scanDir)) {
      const repo = path.join(scanDir, name);
      if (isDir(path.join(repo, '.xoch'))) repos.add(repo);
    }
  }
  return [...repos].sort();
}

/**
 * Plans moving every repo's in-repo data to its centralized root.
 * @param {string} home
 * @param {string[]} repos
 * @returns {{moves: Object[], refusals: string[]}}
 */
function planToCentralized(home, repos) {
  const moves = [];
  const refusals = [];
  for (const repo of repos) {
    const from = path.join(repo, '.xoch');
    const entries = listDir(from).filter((name) => !STAYS_IN_REPO.includes(name));
    if (!entries.length) continue;
    const to = path.join(projectsDir(home), cleanId(path.basename(repo)));
    const existing = listDir(to).filter((name) => name !== REPO_RECORD);
    const owner = recordedRepo(to);
    if (existing.length || (owner && path.resolve(owner) !== path.resolve(repo))) {
      refusals.push(`${path.basename(repo)}: ${to} already holds Xoch data`);
      continue;
    }
    const tracked = git(repo, ['ls-files', '--', ...entries.map((e) => `.xoch/${e}`)]).split('\n').filter(Boolean).length;
    moves.push({
      repo, from, to, entries, tracked,
    });
  }
  const byDest = new Map();
  for (const move of moves) byDest.set(move.to, [...(byDest.get(move.to) || []), move]);
  const kept = [];
  for (const [to, group] of byDest) {
    if (group.length > 1) {
      refusals.push(`repos ${group.map((m) => m.repo).join(' and ')} would both move to ${to}`);
    } else {
      kept.push(group[0]);
    }
  }
  return { moves: kept, refusals };
}

/**
 * Plans moving every centralized root back to the repo it records.
 * @param {string} home
 * @returns {{moves: Object[], refusals: string[]}}
 */
function planToInRepo(home) {
  const moves = [];
  const refusals = [];
  for (const name of listDir(projectsDir(home))) {
    const from = path.join(projectsDir(home), name);
    const entries = listDir(from).filter((entry) => entry !== REPO_RECORD);
    const repo = recordedRepo(from);
    if (!repo) {
      refusals.push(`${name}: no repo.json, so its repo is unknown`);
      continue;
    }
    if (!isDir(repo)) {
      refusals.push(`${name}: recorded repo ${repo} no longer exists`);
      continue;
    }
    if (!entries.length) continue;
    const to = path.join(repo, '.xoch');
    const clashes = entries.filter((entry) => fs.existsSync(path.join(to, entry)));
    if (clashes.length) {
      refusals.push(`${name}: ${clashes.map((entry) => path.join(to, entry)).join(', ')} already exists`);
      continue;
    }
    moves.push({
      repo, from, to, entries, tracked: 0,
    });
  }
  return { moves, refusals };
}

/**
 * Plans a storage move. Nothing is touched; refusals name every reason the
 * move cannot safely run.
 * @param {Object} options
 * @param {string} options.to - 'centralized' or 'in-repo'.
 * @param {string} options.home - Home directory.
 * @param {string[]} options.repos - Repos to consider (for 'centralized').
 * @returns {{moves: Object[], refusals: string[]}}
 */
function planMigration({ to, home, repos }) {
  return to === 'centralized' ? planToCentralized(home, repos) : planToInRepo(home);
}

/**
 * A readable summary of a plan.
 * @param {{moves: Object[], refusals: string[]}} plan
 * @returns {string[]} Lines to print.
 */
function describePlan(plan) {
  const lines = [];
  if (plan.refusals.length) lines.push('Refused:', ...plan.refusals.map((r) => `  - ${r}`));
  for (const move of plan.moves) {
    lines.push(`${path.basename(move.repo)}: ${move.entries.join(', ')} -> ${move.to}`);
  }
  const tracked = plan.moves.filter((m) => m.tracked);
  if (tracked.length) {
    const files = tracked.reduce((sum, m) => sum + m.tracked, 0);
    lines.push(`${files} git-tracked file${files === 1 ? '' : 's'} in ${tracked.length} repo${tracked.length === 1 ? '' : 's'} will show as deleted; commit that removal in each repo.`);
  }
  if (!lines.length) lines.push('Nothing to move.');
  return lines;
}

/**
 * Moves a file or directory, creating the destination's parent. Falls back
 * to copy-then-delete when the two paths are on different filesystems.
 * @param {string} from
 * @param {string} to
 */
function defaultMove(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    fs.cpSync(from, to, { recursive: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
}

/**
 * Executes a plan. If any move fails, every move already made is moved
 * back and any repo.json written is removed before the error is rethrown.
 * @param {{moves: Object[]}} plan
 * @param {Object} [options]
 * @param {function(string, string): void} [options.move] - Mover (for tests).
 * @throws {Error} The first move failure, after undoing.
 */
function executeMigration(plan, { move = defaultMove } = {}) {
  const done = [];
  const recorded = [];
  try {
    for (const m of plan.moves) {
      const toCentralized = path.basename(m.to) !== '.xoch';
      for (const entry of m.entries) {
        const from = path.join(m.from, entry);
        const to = path.join(m.to, entry);
        move(from, to);
        done.push([from, to]);
      }
      if (toCentralized && !fs.existsSync(path.join(m.to, REPO_RECORD))) {
        // Plain write, not json-store's temp-file rename: renames are what a
        // cross-filesystem move can't do.
        fs.writeFileSync(path.join(m.to, REPO_RECORD), `${JSON.stringify({ path: m.repo }, null, 2)}\n`);
        recorded.push(path.join(m.to, REPO_RECORD));
      }
    }
  } catch (e) {
    for (const [from, to] of done.reverse()) defaultMove(to, from);
    for (const file of recorded) fs.rmSync(file, { force: true });
    throw e;
  }
  for (const m of plan.moves) {
    const toInRepo = path.basename(m.to) === '.xoch';
    repointCurrent(m.to, toInRepo ? '.xoch' : m.to);
    if (toInRepo) fs.rmSync(m.from, { recursive: true, force: true });
    else if (!listDir(m.from).length) fs.rmdirSync(m.from);
  }
}

/**
 * Points a moved root's current.json at its job's new directory, written
 * the way Xoch resolves that root (relative `.xoch` in-repo, absolute when
 * centralized). A pointer that can't be read or names no job is left alone.
 * @param {string} root - The root the data moved to.
 * @param {string} rootAsResolved - That root as Xoch's storage root resolves it.
 */
function repointCurrent(root, rootAsResolved) {
  const file = path.join(root, 'work', 'current.json');
  const pointer = readJson(file);
  if (!pointer.job || !pointer.job.id) return;
  pointer.job.directory = path.join(rootAsResolved, 'work', 'jobs', String(pointer.job.id));
  fs.writeFileSync(file, `${JSON.stringify(pointer, null, 2)}\n`);
}

export {
  findRepos, planMigration, executeMigration, describePlan,
};
