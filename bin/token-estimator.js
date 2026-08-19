#!/usr/bin/env node
'use strict';

// Xoch Token Estimator
// Estimates token count for a file without loading it into AI context.

const fs = require('fs');
const path = require('path');

const LIMIT_TOKENS = 3000;

function estimateTokens(charCount) {
  return Math.floor(charCount / 3.5);
}

function usage() {
  console.log('Usage: token-estimator.js <file_path> [mode]');
  console.log('       token-estimator.js --batch <file1> <file2> ...');
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
  runSingle(argv[0], argv[1] || 'report');
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { estimateTokens, runBatch, runSingle, main };
