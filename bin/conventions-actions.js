#!/usr/bin/env node
'use strict';

// Deterministic helpers for a project's conventions document. Prompts
// judge which conventions matter; this script only resolves where the
// document lives (<storage root>/docs/conventions.md, following
// storage.mode), which of its rules apply to a given set of files, and
// what raw signals git history and gh PR review offer for new rules.

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { isMainModule } from './lib/is-main.js';
import { parseFlags } from './lib/args.js';
import { prettyGenerate } from './lib/ruby-json.js';
import { storageRoot } from './lib/storage-root.js';
import { parseConventions } from './lib/conventions-doc.js';
import { inScope } from './lib/glob.js';
import { git } from './lib/git.js';
import {
  isBotAuthor, isReviewFixSubject, prFromSubject, substitutionsFromDiff, aggregateSubstitutions, detectLinters,
} from './lib/conventions-scan.js';

// A review follow-up commit touches at most this many lines; larger
// commits are real work, not reviewer-requested touch-ups.
const SMALL_DIFF_LINES = 10;
// Review comment bodies are cut to this many characters.
const COMMENT_BODY_LIMIT = 300;

function usage() {
  console.log('Usage:');
  console.log('  conventions-actions.js rules [--json] --files <path> [<path> ...]');
  console.log('  conventions-actions.js scan [--json] [--base BRANCH] [--limit N] [--min-occurrences N] [--min-prs N]');
  console.log('                              [--max-prs N] [--include-bots]');
  console.log('');
  console.log('Document: <storage root>/docs/conventions.md (see xoch config root)');
  console.log('');
  console.log('rules prints the conventions whose scope matches at least one given file, each with');
  console.log('the files it matched. Paths are taken relative to the current directory; paths outside');
  console.log('it are reported as unmatched. A missing document is not an error (exit 0); a malformed');
  console.log('one exits 1 with the offending line.');
  console.log('');
  console.log('scan gathers convention signals: small review follow-up commits on the base branch, one-token');
  console.log('swaps repeated across PRs, merged-PR review comments when gh is available and authenticated,');
  console.log('and linter/formatter configs at the repo root. Author and reviewer names are never included.');
  console.log('Defaults: base from origin/HEAD, then main, then master, then HEAD; --limit 500 commits;');
  console.log('--min-occurrences 3; --min-prs 2; --max-prs 50; bots excluded.');
}

/**
 * Where the current project's conventions document lives.
 * @returns {string}
 */
function conventionsPath() {
  return path.join(storageRoot(), 'docs', 'conventions.md');
}

// Everything from `--files` onward is the file list, the same convention
// token-estimator.js uses, since parseFlags takes one value per flag.
function splitFilesArg(argv) {
  const idx = argv.indexOf('--files');
  if (idx === -1) return { flagArgv: argv, files: [] };
  return { flagArgv: argv.slice(0, idx), files: argv.slice(idx + 1) };
}

// The path with its nearest existing ancestor resolved through symlinks,
// so an absolute path reached through an alias of the repo (macOS's /var
// -> /private/var, a symlinked checkout) still lands inside it.
function realPrefix(abs) {
  let dir = abs;
  const rest = [];
  while (!fs.existsSync(dir)) {
    rest.unshift(path.basename(dir));
    dir = path.dirname(dir);
  }
  return path.join(fs.realpathSync(dir), ...rest);
}

/**
 * Normalize paths to repo-relative, forward-slash form. Paths that resolve
 * outside `root` (or to `root` itself), even after resolving symlinks in
 * their existing ancestors, are returned as given in `unmatched`. Paths
 * inside `root` keep the form given, so symlinked files are not resolved.
 * @param {string[]} files
 * @param {string} root
 * @returns {{files: string[], unmatched: string[]}}
 */
function normalizeFiles(files, root) {
  const result = { files: [], unmatched: [] };
  const relative = (abs) => path.relative(root, abs).split(path.sep).join('/');
  for (const file of files) {
    const abs = path.resolve(root, file);
    let rel = relative(abs);
    if (!rel || rel.startsWith('..')) rel = relative(realPrefix(abs));
    if (!rel || rel.startsWith('..')) {
      result.unmatched.push(file);
    } else {
      result.files.push(rel);
    }
  }
  return result;
}

function printReadable(result) {
  if (!result.exists) {
    console.log(`No conventions file at ${result.path}.`);
  }
  for (const rule of result.rules) {
    console.log(`${rule.id} [${rule.status}] ${rule.statement}`);
    console.log(`  matched: ${rule.matched.join(', ')}`);
  }
  if (result.unmatched.length) {
    console.log(`Outside the repo, not checked: ${result.unmatched.join(', ')}`);
  }
}

function rules(argv) {
  const { flagArgv, files } = splitFilesArg(argv);
  const flags = parseFlags(flagArgv, ['json']);
  if (files.length === 0) {
    console.error('Error: rules requires --files <path> [<path> ...]');
    process.exit(2);
  }

  const docPath = conventionsPath();
  const normalized = normalizeFiles(files, process.cwd());
  const result = {
    path: docPath, exists: fs.existsSync(docPath), files: normalized.files, unmatched: normalized.unmatched, rules: [],
  };

  if (result.exists) {
    let doc;
    try {
      doc = parseConventions(fs.readFileSync(docPath, 'utf8'));
    } catch (e) {
      if (flags.json) {
        console.log(prettyGenerate({ path: docPath, error: e.message, line: e.line }));
      } else {
        console.error(`Error: ${docPath}: ${e.message}`);
      }
      process.exit(1);
    }
    for (const rule of doc.rules) {
      const matched = result.files.filter((file) => inScope(file, rule.scope));
      if (matched.length) result.rules.push({ ...rule, matched });
    }
  }

  if (flags.json) {
    console.log(prettyGenerate(result));
  } else {
    printReadable(result);
  }
}

// A flag's value as a positive whole number, or `fallback` when absent.
function positiveInt(flags, name, fallback) {
  if (flags[name] === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(flags[name])) {
    console.error(`Error: --${name} must be a positive whole number`);
    process.exit(2);
  }
  return Number(flags[name]);
}

function detectBase(root, explicit) {
  if (explicit) return explicit;
  const remote = git(root, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']);
  if (remote) return remote;
  const local = ['main', 'master'].find((branch) => git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]));
  return local || 'HEAD';
}

// Commit SHA -> `pr:N` for commits brought in by `Merge pull request #N`
// merge commits on the base branch's first-parent history.
function mergedPrUnits(root, base, limit) {
  const units = new Map();
  const merges = git(root, ['log', base, '--merges', '--first-parent', '-E', '--grep=^Merge pull request #[0-9]+', `-n${limit}`, '--format=%H%x1f%s']);
  for (const line of merges.split('\n').filter(Boolean)) {
    const [sha, subject] = line.split('\x1f');
    const pr = subject.match(/#(\d+)/)[1];
    for (const commit of git(root, ['rev-list', `${sha}^1..${sha}^2`]).split('\n').filter(Boolean)) {
      units.set(commit, `pr:${pr}`);
    }
  }
  return units;
}

// Lines changed and files touched by a commit; binary changes make it
// never count as small.
function commitSize(root, sha) {
  const size = { lines: 0, binary: false, files: [] };
  for (const row of git(root, ['show', '--numstat', '--format=', sha]).split('\n').filter(Boolean)) {
    const [added, deleted, file] = row.split('\t');
    size.files.push(file);
    if (added === '-') {
      size.binary = true;
    } else {
      size.lines += Number(added) + Number(deleted);
    }
  }
  return size;
}

function gitSignals(root, base, { limit, includeBots, thresholds }) {
  const merged = mergedPrUnits(root, base, limit);
  const log = git(root, ['log', base, '--no-merges', `-n${limit}`, '--format=%H%x1f%an%x1f%ae%x1f%s']);
  const commits = log.split('\n').filter(Boolean).map((line) => {
    const [sha, name, email, subject] = line.split('\x1f');
    return {
      sha, name, email, subject,
    };
  });
  const fixups = [];
  const swaps = [];
  for (const commit of commits) {
    if (!includeBots && isBotAuthor(commit.name, commit.email)) continue;
    if (!isReviewFixSubject(commit.subject)) continue;
    const size = commitSize(root, commit.sha);
    if (size.binary || size.lines > SMALL_DIFF_LINES) continue;
    const squashPr = prFromSubject(commit.subject);
    const unit = squashPr ? `pr:${squashPr}` : (merged.get(commit.sha) || `commit:${commit.sha.slice(0, 7)}`);
    fixups.push({
      sha: commit.sha.slice(0, 7), subject: commit.subject, unit, files: size.files, lines: size.lines,
    });
    for (const swap of substitutionsFromDiff(git(root, ['show', '--unified=0', '--format=', commit.sha]))) {
      swaps.push({ ...swap, unit });
    }
  }
  return { commitsScanned: commits.length, fixups, substitutions: aggregateSubstitutions(swaps, thresholds) };
}

// Runs gh and returns stdout, throwing with gh's own stderr on failure.
function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

// Inline review comments from recent merged, human-authored PRs into the
// base branch, with reviewer identity dropped. Never fails the scan: when
// gh is missing, unauthenticated, or errors, the reason is reported.
function ghSignals(base, maxPrs) {
  const unavailable = (reason) => ({
    available: false, reason, prCount: 0, comments: [],
  });
  const auth = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
  if (auth.error) return unavailable('gh is not installed');
  if (auth.status !== 0) return unavailable('gh is not authenticated');
  try {
    const listed = JSON.parse(gh(['pr', 'list', '--state', 'merged', '--base', base.replace(/^origin\//, ''), '--limit', String(maxPrs), '--json', 'number,author']));
    const prs = listed.filter((pr) => !pr.author.is_bot);
    const comments = [];
    for (const pr of prs) {
      const out = gh(['api', `repos/{owner}/{repo}/pulls/${pr.number}/comments`, '--paginate', '--jq', '.[] | {path, body, user: {login: .user.login, type: .user.type}}']);
      for (const comment of out.split('\n').filter(Boolean).map((line) => JSON.parse(line))) {
        if (comment.user.type === 'Bot' || isBotAuthor(comment.user.login, '')) continue;
        const body = comment.body.length > COMMENT_BODY_LIMIT ? `${comment.body.slice(0, COMMENT_BODY_LIMIT)}...` : comment.body;
        comments.push({ pr: pr.number, path: comment.path, body });
      }
    }
    return {
      available: true, reason: null, prCount: prs.length, comments,
    };
  } catch (e) {
    return unavailable(e.message);
  }
}

function printScanSummary(result) {
  console.log(`Base: ${result.base} (${result.commits_scanned} commits scanned)`);
  console.log(`Review follow-up commits: ${result.fixup_commits.length}`);
  console.log(`Token substitutions: ${result.token_substitutions.length}`);
  console.log(result.gh_available
    ? `Review comments: ${result.review_comments.length} from ${result.pr_count} PRs`
    : `Review comments: 0 (${result.gh_reason})`);
  console.log(`Linters: ${result.linters.length ? result.linters.map((l) => l.tool).join(', ') : 'none'}`);
}

function scan(argv) {
  const flags = parseFlags(argv, ['json', 'include-bots']);
  const root = process.cwd();
  const limit = positiveInt(flags, 'limit', 500);
  const thresholds = { minOccurrences: positiveInt(flags, 'min-occurrences', 3), minPrs: positiveInt(flags, 'min-prs', 2) };
  const maxPrs = positiveInt(flags, 'max-prs', 50);

  if (git(root, ['rev-parse', '--is-inside-work-tree']) !== 'true') {
    console.log(prettyGenerate({ error: `not a git repository: ${root}` }));
    process.exit(1);
  }

  const base = detectBase(root, flags.base);
  const signals = gitSignals(root, base, { limit, includeBots: Boolean(flags['include-bots']), thresholds });
  const review = ghSignals(base, maxPrs);
  const result = {
    base,
    commits_scanned: signals.commitsScanned,
    thresholds: { min_occurrences: thresholds.minOccurrences, min_prs: thresholds.minPrs },
    gh_available: review.available,
    gh_reason: review.reason,
    pr_count: review.prCount,
    fixup_commits: signals.fixups,
    token_substitutions: signals.substitutions,
    review_comments: review.comments,
    linters: detectLinters(root),
  };

  if (flags.json) {
    console.log(prettyGenerate(result));
  } else {
    printScanSummary(result);
  }
}

function main(argv) {
  const command = argv[0];
  if (command === 'rules') {
    rules(argv.slice(1));
  } else if (command === 'scan') {
    scan(argv.slice(1));
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

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}

export {
  conventionsPath, normalizeFiles, rules, scan, main,
};
