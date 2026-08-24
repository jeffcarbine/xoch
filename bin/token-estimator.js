#!/usr/bin/env node
'use strict';

// Xoch Token Estimator
// Estimates token count for a file without loading it into AI context.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseFlags } = require('./lib/args.js');
const { readJson, updateJson } = require('./lib/json-store.js');

const LIMIT_TOKENS = 3000;

// Recalibrated against observed estimate-vs-actual samples (7,900 est /
// 9,100 actual; 1,300 est / 2,000 actual -- averaging ~2.9 chars/token).
// A single constant can't be exact for both prose- and code-heavy content;
// this value is chosen to bias toward overestimating, the safe direction
// for a budget gate.
const CHARS_PER_TOKEN = 2.9;

const CONFIG_PATH = path.join(os.homedir(), '.xoch', 'config.json');

// Per-skill/phase read budgets, seeded from the values previously
// hardcoded in each core prompt's "Budget: N tokens" line. Overridable via
// a `tokenBudgets` object in ~/.xoch/config.json; unlisted skills fall
// back to FALLBACK_SKILL_BUDGET.
const DEFAULT_SKILL_BUDGETS = { spec: 5000, plan: 7000 };
const FALLBACK_SKILL_BUDGET = 5000;

function estimateTokens(charCount) {
  return Math.floor(charCount / CHARS_PER_TOKEN);
}

function skillBudget(skill) {
  const config = readJson(CONFIG_PATH);
  const overrides = config.tokenBudgets || {};
  if (Object.prototype.hasOwnProperty.call(overrides, skill)) return overrides[skill];
  if (Object.prototype.hasOwnProperty.call(DEFAULT_SKILL_BUDGETS, skill)) return DEFAULT_SKILL_BUDGETS[skill];
  return FALLBACK_SKILL_BUDGET;
}

function budgetStatus(tokens, budget) {
  const percentage = Math.floor((tokens * 100) / budget);
  if (tokens < Math.floor((budget * 9) / 10)) return { status: 'pass', statusCode: 0, percentage };
  if (tokens <= budget) return { status: 'warn', statusCode: 1, percentage };
  return { status: 'fail', statusCode: 2, percentage };
}

function usage() {
  console.log('Usage: token-estimator.js <file_path> [mode]');
  console.log('       token-estimator.js --batch <file1> <file2> ...');
  console.log('       token-estimator.js budget check --skill NAME [--json] --files <file1> <file2> ...');
  console.log('       token-estimator.js budget record --skill NAME --job ID [--arc ID] [--root ROOT] [--waiver TEXT] [--json] --files <file1> <file2> ...');
  console.log('Modes: report (default), check, json');
}

function runBatch(files) {
  let totalTokens = 0;
  let totalChars = 0;
  let fileCount = 0;

  console.log('📊 Batch Token Estimate');
  console.log('=======================');
  console.log('');

  for (const file of files) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      console.log(`⚠️  Skipping (not found): ${file}`);
      continue;
    }
    fileCount += 1;
    const chars = fs.readFileSync(file, 'utf8').length;
    const tokens = estimateTokens(chars);
    totalChars += chars;
    totalTokens += tokens;
    const filename = path.basename(file);
    console.log(`  ${filename.padEnd(40)} ${String(tokens).padStart(6)} tokens`);
  }

  console.log('');
  console.log('---');
  console.log(`Files: ${fileCount}`);
  console.log(`Total Characters: ${totalChars}`);
  console.log(`Total Estimated Tokens: ~${totalTokens}`);
  console.log('');
}

function runSingle(filePath, mode) {
  if (!filePath) {
    usage();
    process.exit(1);
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    console.log(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const charCount = fs.readFileSync(filePath, 'utf8').length;
  const estimatedTokens = estimateTokens(charCount);
  const filename = path.basename(filePath);

  let type = 'File';
  if (filename === 'README.md') {
    const parentDir = path.dirname(filePath);
    const hasBuildFile = ['package.json', 'pom.xml', 'build.gradle'].some((name) => fs.existsSync(path.join(parentDir, name)));
    type = hasBuildFile ? 'Application' : 'Feature';
  }

  const limitTokens = LIMIT_TOKENS;
  const percentage = Math.floor((estimatedTokens * 100) / limitTokens);

  let status;
  let statusCode;
  if (estimatedTokens < Math.floor((limitTokens * 9) / 10)) {
    status = '✅ PASS';
    statusCode = 0;
  } else if (estimatedTokens <= limitTokens) {
    status = '⚠️ WARN';
    statusCode = 1;
  } else {
    status = '🚫 FAIL';
    statusCode = 2;
  }

  if (mode === 'json') {
    // Matches the bash original's hand-built JSON string exactly: a space
    // after each colon, not JSON.stringify's compact no-space output.
    console.log(`{"chars": ${charCount}, "tokens": ${estimatedTokens}, "limit": ${limitTokens}, "percentage": ${percentage}, "status": ${statusCode}}`);
  } else if (mode === 'check') {
    console.log(`${status} - ${estimatedTokens} / ${limitTokens} tokens (${percentage}%)`);
  } else {
    console.log('📄 Token Estimate');
    console.log('====================');
    console.log('');
    console.log(`File: ${filename}`);
    console.log(`Type: ${type} README`);
    console.log('');
    console.log(`Characters: ${charCount}`);
    console.log(`Estimated Tokens: ~${estimatedTokens}`);
    console.log(`Limit: ${limitTokens} tokens`);
    console.log(`Usage: ${percentage}%`);
    console.log('');
    console.log(`Status: ${status}`);

    if (statusCode === 2) {
      const over = estimatedTokens - limitTokens;
      console.log('');
      console.log(`⚠️  Over limit by ~${over} tokens`);
      console.log('Consider breaking this into smaller sections or features');
    } else if (statusCode === 1) {
      const remaining = limitTokens - estimatedTokens;
      console.log('');
      console.log(`⚠️  Approaching limit (~${remaining} tokens remaining)`);
    }
  }

  process.exitCode = statusCode;
}

// Splits `budget check`/`budget record` argv into named flags and a file
// list, without extending lib/args.js's single-value parseFlags: everything
// from `--files` onward is the file list, same convention `--batch` uses.
function splitFilesArg(argv) {
  const idx = argv.indexOf('--files');
  if (idx === -1) return { flagArgv: argv, files: [] };
  return { flagArgv: argv.slice(0, idx), files: argv.slice(idx + 1) };
}

function estimateFileList(files) {
  let totalTokens = 0;
  let totalChars = 0;
  const missing = [];
  for (const file of files) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      missing.push(file);
      continue;
    }
    const chars = fs.readFileSync(file, 'utf8').length;
    totalChars += chars;
    totalTokens += estimateTokens(chars);
  }
  return { totalTokens, totalChars, missing };
}

function runBudgetCheck(argv) {
  const { flagArgv, files } = splitFilesArg(argv);
  const flags = parseFlags(flagArgv, ['json']);
  const skill = flags.skill;
  if (!skill) {
    console.error('--skill is required');
    process.exit(2);
  }

  const budget = skillBudget(skill);
  const { totalTokens, totalChars, missing } = estimateFileList(files);
  const { status, statusCode, percentage } = budgetStatus(totalTokens, budget);

  if (flags.json) {
    console.log(JSON.stringify({
      skill, files, missing, chars: totalChars, tokens: totalTokens, budget, percentage, status,
    }));
  } else {
    console.log(`Skill: ${skill}`);
    if (missing.length) console.log(`Missing files: ${missing.join(', ')}`);
    console.log(`Tokens: ${totalTokens} / ${budget} (${percentage}%)`);
    console.log(`Status: ${status.toUpperCase()}`);
  }

  process.exitCode = statusCode;
}

function usageReportPath(root, job) {
  return path.join(root, '.xoch', 'work', 'jobs', job, 'token-usage.json');
}

function arcUsageReportPath(root, arc) {
  return path.join(root, '.xoch', 'work', 'arcs', arc, 'token-usage.json');
}

function appendUsageEntry(reportPath, entry) {
  updateJson(reportPath, (data) => {
    const next = Array.isArray(data.entries) ? data : { version: 1, entries: [], totalTokens: 0 };
    next.entries.push(entry);
    next.totalTokens = (next.totalTokens || 0) + entry.tokens;
    return next;
  });
}

function runBudgetRecord(argv) {
  const { flagArgv, files } = splitFilesArg(argv);
  const flags = parseFlags(flagArgv, ['json']);
  const skill = flags.skill;
  const job = flags.job;
  if (!skill) {
    console.error('--skill is required');
    process.exit(2);
  }
  if (!job) {
    console.error('--job is required');
    process.exit(2);
  }

  const root = path.resolve(flags.root || '.');
  const budget = skillBudget(skill);
  const { totalTokens, totalChars, missing } = estimateFileList(files);
  const { status, statusCode, percentage } = budgetStatus(totalTokens, budget);

  if (status === 'fail' && !flags.waiver) {
    const message = `Over budget: ${totalTokens} / ${budget} tokens (${percentage}%) for skill "${skill}". `
      + 'Refusing to record without --waiver "<engineer-approved reason>".';
    if (flags.json) {
      console.log(JSON.stringify({
        skill, files, missing, chars: totalChars, tokens: totalTokens, budget, percentage, status, recorded: false, error: message,
      }));
    } else {
      console.log(message);
    }
    process.exitCode = statusCode;
    return;
  }

  const jobDir = path.join(root, '.xoch', 'work', 'jobs', job);
  if (!fs.existsSync(jobDir) || !fs.statSync(jobDir).isDirectory()) {
    console.error(`Job folder not found: ${jobDir}`);
    process.exit(1);
  }

  const entry = {
    skill,
    files,
    tokens: totalTokens,
    budget,
    status,
    waiver: flags.waiver || null,
    timestamp: new Date().toISOString(),
  };
  const reportPath = usageReportPath(root, job);
  appendUsageEntry(reportPath, entry);
  if (flags.arc) appendUsageEntry(arcUsageReportPath(root, flags.arc), entry);

  if (flags.json) {
    console.log(JSON.stringify({ ...entry, chars: totalChars, missing, recorded: true }));
  } else {
    console.log(`Recorded ${totalTokens} tokens for skill "${skill}" (${status.toUpperCase()}, ${percentage}%) to ${reportPath}`);
    if (flags.arc) console.log(`Also recorded to ${arcUsageReportPath(root, flags.arc)}`);
  }

  process.exitCode = statusCode;
}

function runBudget(argv) {
  const subcommand = argv[0];
  const rest = argv.slice(1);
  if (subcommand === 'check') {
    runBudgetCheck(rest);
  } else if (subcommand === 'record') {
    runBudgetRecord(rest);
  } else {
    usage();
    process.exit(2);
  }
}

function main(argv) {
  if (argv[0] === '--help') {
    usage();
    return;
  }
  if (argv[0] === '--batch') {
    runBatch(argv.slice(1));
    process.exitCode = 0;
    return;
  }
  if (argv[0] === 'budget') {
    runBudget(argv.slice(1));
    return;
  }
  runSingle(argv[0], argv[1] || 'report');
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { estimateTokens, skillBudget, budgetStatus, runBatch, runSingle, main };
