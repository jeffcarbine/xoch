#!/usr/bin/env node
'use strict';

// Xoch Job ID Generator
// Generates unique job IDs for Xoch work/job directories.
//
// Usage modes:
// 1. With user-provided ID: node generate-job-id.js --id "my-job-id"
// 2. Auto-generate: node generate-job-id.js

const crypto = require('crypto');
const path = require('path');

// Full clean: lowercase, replace non a-z0-9- with '-', collapse runs of
// '-', strip leading/trailing '-'. Used for engineer-provided IDs and
// anywhere else Xoch's own slugify() is used.
function cleanId(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '');
}

// Partial clean: lowercase + replace only, no collapse/strip. Matches
// generate-job-id.sh's PROJECT_NAME derivation exactly (it does not
// collapse or trim dashes, unlike the --id path).
function projectNameSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function randomSuffix(length = 4) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function generateJobId({ id, cwd = process.cwd() } = {}) {
  if (id) return cleanId(id);
  const projectName = projectNameSlug(path.basename(cwd));
  return `${projectName}-${timestamp()}-${randomSuffix()}`;
}

function usage() {
  console.log('Usage: generate-job-id.js [--id ID]');
}

// Extracted so bin/xoch.js's dispatcher can call this in-process (like
// every other helper script's exported main/run) instead of spawning a
// subprocess just for this one script.
function main(argv) {
  if (argv[0] === '--help') {
    usage();
    return;
  }
  const id = argv[0] === '--id' && argv[1] ? argv[1] : null;
  console.log(generateJobId({ id }));
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { generateJobId, cleanId, projectNameSlug, main };
