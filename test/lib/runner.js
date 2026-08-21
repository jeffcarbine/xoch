'use strict';

// Shared tiny assert+runner harness for every test/*.test.js file --
// avoids re-deriving the same PASS/FAIL loop and exit-code logic in
// every test file.

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`PASS: ${name}`);
      passed += 1;
    } catch (err) {
      console.log(`FAIL: ${name}`);
      console.log(`  ${err.message}`);
      failed += 1;
    }
  }
  console.log(`\n${passed} passed, ${failed} failed, ${tests.length} total`);
  process.exit(failed === 0 ? 0 : 1);
}

module.exports = { test, run };
