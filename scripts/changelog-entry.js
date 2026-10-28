#!/usr/bin/env node
'use strict';

// Changelog Entry Extractor
// Prints one version's notes from CHANGELOG.md in the current directory,
// for use as GitHub Release notes, and fails when the version has none so
// the release workflow can refuse to publish an undocumented version.
//
// Usage: node scripts/changelog-entry.js VERSION
//
// Release tooling only: lives outside package.json's `files` allowlist, so
// it is never shipped and is not a `xoch` CLI namespace.

import fs from 'fs';

const CHANGELOG = 'CHANGELOG.md';

// A level-2 version heading: `## [1.0.0] - 2026-10-28` or `## 1.0.0`.
const HEADING = /^## \[?([^\]\s]+)\]?(?:\s|$)/;
// A Keep a Changelog link definition: `[1.0.0]: https://...`.
const LINK_DEFINITION = /^\[[^\]]+\]:\s/;

/**
 * Return the trimmed notes under VERSION's heading, up to the next level-2
 * heading or the trailing link definitions. The Unreleased section is never
 * treated as a version.
 *
 * @param {string} text - CHANGELOG.md contents.
 * @param {string} version - Version to look up, without a leading `v`.
 * @returns {string} The notes, or '' when the version has none.
 */
function extractEntry(text, version) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => {
    const match = line.match(HEADING);
    return match !== null && match[1] === version && version !== 'Unreleased';
  });
  if (start === -1) return '';
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ') || LINK_DEFINITION.test(line)) break;
    body.push(line);
  }
  return body.join('\n').trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main(argv) {
  const version = argv[0];
  if (!version) fail('Usage: changelog-entry.js VERSION');
  if (!fs.existsSync(CHANGELOG)) fail(`${CHANGELOG} not found in ${process.cwd()}`);
  const entry = extractEntry(fs.readFileSync(CHANGELOG, 'utf8'), version);
  if (!entry) fail(`No changelog entry for ${version} in ${CHANGELOG}`);
  console.log(entry);
}

main(process.argv.slice(2));
