#!/usr/bin/env node
'use strict';

// Acceptance-criteria coverage checks for Xoch jobs.

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./lib/args.js');
const { prettyGenerate } = require('./lib/ruby-json.js');

function usage() {
  console.log('Usage:');
  console.log('  coverage-actions.js compare --job ID [--root ROOT] [--require plan|snapshots|review|all] [--json]');
  console.log('  coverage-actions.js create-review --job ID [--root ROOT] [--force]');
}

function criteria(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const matches = text.match(/\bAC(?:-NF)?-\d+\b/gi) || [];
  return [...new Set(matches.map((m) => m.toUpperCase()))].sort();
}

function diff(a, b) {
  return a.filter((item) => !b.includes(item));
}

function run(argv) {
  const command = argv[0];
  if (command === '--help') {
    usage();
    return;
  }
  if (!command) {
    usage();
    process.exit(2);
  }
  const flags = parseFlags(argv.slice(1), ['json', 'force']);
  const job = flags.job;
  const root = path.resolve(flags.root || '.');
  const jsonMode = Boolean(flags.json);
  const force = Boolean(flags.force);
  const requireStage = flags.require || 'all';

  if (!job) {
    console.error('--job is required');
    process.exit(2);
  }

  const jobDir = path.join(root, '.xoch', 'work', 'jobs', job);
  if (!fs.existsSync(jobDir) || !fs.statSync(jobDir).isDirectory()) {
    console.error(`Job folder not found: ${jobDir}`);
    process.exit(1);
  }

  const spec = path.join(jobDir, 'spec.md');
  const plan = path.join(jobDir, 'plan.md');
  const review = path.join(jobDir, 'review.md');
  const snapshotsDir = path.join(jobDir, 'snapshots');
  const snapshots = fs.existsSync(snapshotsDir)
    ? fs.readdirSync(snapshotsDir).filter((name) => name.endsWith('.md')).sort().map((name) => path.join(snapshotsDir, name))
    : [];

  const specIds = criteria(spec);
  const planIds = criteria(plan);
  const reviewIds = criteria(review);
  const snapshotIds = [...new Set(snapshots.flatMap((p) => criteria(p)))].sort();

  const result = {
    job,
    spec: specIds,
    plan: planIds,
    snapshots: snapshotIds,
    review: reviewIds,
    missing_from_plan: diff(specIds, planIds),
    missing_from_snapshots: diff(specIds, snapshotIds),
    missing_from_review: diff(specIds, reviewIds),
    orphaned_in_plan: diff(planIds, specIds),
    orphaned_in_snapshots: diff(snapshotIds, specIds),
    orphaned_in_review: diff(reviewIds, specIds),
  };

  if (command === 'compare') {
    if (specIds.length === 0) {
      console.error(`No acceptance criteria found in ${spec}`);
      process.exit(1);
    }
    if (!['plan', 'snapshots', 'review', 'all'].includes(requireStage)) {
      console.error('--require must be plan, snapshots, review, or all');
      process.exit(1);
    }

    if (jsonMode) {
      console.log(prettyGenerate(result));
    } else {
      for (const [key, value] of Object.entries(result)) {
        if (key === 'job') continue;
        console.log(`${key}: ${value.length ? value.join(', ') : 'none'}`);
      }
    }

    const requiredKeys = {
      plan: ['missing_from_plan'],
      snapshots: ['missing_from_plan', 'missing_from_snapshots'],
      review: ['missing_from_plan', 'missing_from_snapshots', 'missing_from_review'],
      all: ['missing_from_plan', 'missing_from_snapshots', 'missing_from_review'],
    }[requireStage];
    const missing = requiredKeys.flatMap((key) => result[key]);
    process.exitCode = missing.length === 0 ? 0 : 1;
  } else if (command === 'create-review') {
    if (specIds.length === 0) {
      console.error(`No acceptance criteria found in ${spec}`);
      process.exit(1);
    }
    if (fs.existsSync(review) && !force) {
      console.error(`Review already exists: ${review}`);
      process.exit(1);
    }
    const rows = specIds.map((id) => `| ${id} | Not Verified | | |`);
    const body = [
      `# Review - ${job}`, '', '**Status**: In Progress', '',
      '## Acceptance Coverage', '',
      '| AC | Status | Evidence | Notes |',
      '|---|---|---|---|', ...rows, '',
      '## Quality And Risk', '', 'TBD', '',
      '## Documentation', '', 'TBD', '',
    ].join('\n');
    fs.writeFileSync(review, body);
    console.log(`Review scaffolded: ${review}`);
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

if (require.main === module) {
  run(process.argv.slice(2));
}

module.exports = { run, criteria };
