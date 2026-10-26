'use strict';

// Pure signal helpers for `xoch conventions scan`. The CLI gathers git and
// gh output; these functions decide what counts as a review follow-up, a
// one-token swap, a bot, or a linter config, so each rule is unit-testable
// without a repository.

import fs from 'fs';
import path from 'path';

const BOT_PATTERN = /\[bot\]|dependabot|renovate|github-actions|\bbot@/i;
const REVIEW_FIX_PATTERN = /\b(nits?|lint|linting|style|renamed?|renames|typos?|cleanup|clean up|fixup|address(?:ed|es)? (?:review|feedback|comments?))\b/i;
const TOKEN_PATTERN = /[A-Za-z_$][\w$]*|\d+|\S/g;

// Root-level config files, by tool. Settings embedded in package.json and
// pyproject.toml are checked separately.
const LINTER_FILES = [
  ['eslint', /^(\.eslintrc(\..+)?|eslint\.config\.(js|cjs|mjs|ts))$/],
  ['prettier', /^(\.prettierrc(\..+)?|prettier\.config\.(js|cjs|mjs))$/],
  ['biome', /^biome\.jsonc?$/],
  ['editorconfig', /^\.editorconfig$/],
  ['stylelint', /^(\.stylelintrc(\..+)?|stylelint\.config\.(js|cjs|mjs))$/],
  ['ruff', /^\.?ruff\.toml$/],
  ['rubocop', /^\.rubocop\.yml$/],
  ['golangci-lint', /^\.golangci\.ya?ml$/],
  ['rustfmt', /^\.?rustfmt\.toml$/],
  ['clang-format', /^\.clang-format$/],
];
const PACKAGE_JSON_KEYS = [['eslintConfig', 'eslint'], ['prettier', 'prettier']];
const PYPROJECT_TABLES = [[/^\[tool\.ruff/m, 'ruff'], [/^\[tool\.black\]/m, 'black']];

/**
 * Whether a commit or comment author looks like a bot.
 * @param {string} name
 * @param {string} email
 * @returns {boolean}
 */
function isBotAuthor(name, email) {
  return BOT_PATTERN.test(`${name} ${email}`);
}

/**
 * Whether a commit subject reads like a review follow-up (nits, lint,
 * renames, typos, addressing feedback).
 * @param {string} subject
 * @returns {boolean}
 */
function isReviewFixSubject(subject) {
  return REVIEW_FIX_PATTERN.test(subject);
}

/**
 * The PR number from a squash-merge subject ending in `(#123)`, else null.
 * @param {string} subject
 * @returns {number|null}
 */
function prFromSubject(subject) {
  const match = subject.match(/\(#(\d+)\)\s*$/);
  return match ? Number(match[1]) : null;
}

function tokenize(line) {
  return Array.from(line.matchAll(TOKEN_PATTERN), (m) => m[0]);
}

/**
 * The single token that changed between a removed and an added line, or
 * null when the lines differ in token count or in more or fewer than one
 * token.
 * @param {string} removed
 * @param {string} added
 * @returns {{from: string, to: string}|null}
 */
function tokenSwap(removed, added) {
  const before = tokenize(removed);
  const after = tokenize(added);
  if (before.length !== after.length) return null;
  const changed = before.map((token, i) => i).filter((i) => before[i] !== after[i]);
  if (changed.length !== 1) return null;
  return { from: before[changed[0]], to: after[changed[0]] };
}

/**
 * One-token swaps in a `--unified=0` diff. Removed and added lines are
 * paired by position within each hunk, and only when the hunk removes and
 * adds the same number of lines; deleted files are skipped.
 * @param {string} diff
 * @returns {Array<{from: string, to: string, file: string}>}
 */
function substitutionsFromDiff(diff) {
  const swaps = [];
  let file = null;
  let inHunk = false;
  let removed = [];
  let added = [];
  const flush = () => {
    if (file && removed.length === added.length) {
      removed.forEach((line, i) => {
        const swap = tokenSwap(line, added[i]);
        if (swap) swaps.push({ ...swap, file });
      });
    }
    removed = [];
    added = [];
  };
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git')) {
      flush();
      inHunk = false;
    } else if (line.startsWith('@@')) {
      flush();
      inHunk = true;
    } else if (!inHunk) {
      if (line.startsWith('+++ ')) file = line === '+++ /dev/null' ? null : line.slice(6);
    } else if (line.startsWith('-')) {
      removed.push(line.slice(1));
    } else if (line.startsWith('+')) {
      added.push(line.slice(1));
    }
  }
  flush();
  return swaps;
}

/**
 * Group swaps by `from -> to`, keeping groups seen at least
 * `minOccurrences` times across at least `minPrs` distinct units (PRs, or
 * single commits when no PR is known). Most frequent first.
 * @param {Array<{from: string, to: string, file: string, unit: string}>} entries
 * @param {{minOccurrences: number, minPrs: number}} thresholds
 * @returns {Array<{from: string, to: string, occurrences: number, prs: string[], files: string[]}>}
 */
function aggregateSubstitutions(entries, { minOccurrences, minPrs }) {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.from}\u0000${entry.to}`;
    if (!groups.has(key)) groups.set(key, { from: entry.from, to: entry.to, count: 0, prs: new Set(), files: new Set() });
    const group = groups.get(key);
    group.count += 1;
    group.prs.add(entry.unit);
    group.files.add(entry.file);
  }
  return Array.from(groups.values())
    .filter((group) => group.count >= minOccurrences && group.prs.size >= minPrs)
    .sort((a, b) => b.count - a.count)
    .map((group) => ({
      from: group.from, to: group.to, occurrences: group.count, prs: [...group.prs].sort(), files: [...group.files].sort(),
    }));
}

/**
 * Linter and formatter configs at a repo root, sorted by file then tool,
 * so the generate step can leave out rules a tool already enforces.
 * @param {string} root
 * @returns {Array<{tool: string, file: string}>}
 */
function detectLinters(root) {
  const names = fs.readdirSync(root);
  const found = [];
  for (const name of names) {
    for (const [tool, pattern] of LINTER_FILES) {
      if (pattern.test(name)) found.push({ tool, file: name });
    }
  }
  if (names.includes('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      PACKAGE_JSON_KEYS
        .filter(([key]) => Object.prototype.hasOwnProperty.call(pkg, key))
        .forEach(([, tool]) => found.push({ tool, file: 'package.json' }));
    } catch (e) {
      // An unreadable package.json declares no linter settings.
    }
  }
  if (names.includes('pyproject.toml')) {
    const text = fs.readFileSync(path.join(root, 'pyproject.toml'), 'utf8');
    PYPROJECT_TABLES
      .filter(([pattern]) => pattern.test(text))
      .forEach(([, tool]) => found.push({ tool, file: 'pyproject.toml' }));
  }
  // Plain code-unit order, so dotfiles sort first regardless of locale.
  const key = (entry) => `${entry.file}\u0000${entry.tool}`;
  return found.sort((a, b) => (key(a) < key(b) ? -1 : 1));
}

export {
  isBotAuthor, isReviewFixSubject, prFromSubject, tokenSwap, substitutionsFromDiff, aggregateSubstitutions, detectLinters,
};
