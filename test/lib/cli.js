'use strict';

// Shared scratch-environment + subprocess-spawn helpers for
// test/*.test.js. Each script is spawned as a real subprocess (not
// require()'d in-process) so its own process.exit() calls never affect
// the test runner itself.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function scratch() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xoch-test-home-'));
  const cwd = path.join(home, 'proj');
  fs.mkdirSync(cwd, { recursive: true });
  return { home, cwd };
}

function cleanup(ctx) {
  fs.rmSync(ctx.home, { recursive: true, force: true });
}

function runScript(scriptPath, args, ctx) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ctx.cwd,
    env: { ...process.env, HOME: ctx.home },
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

module.exports = { scratch, cleanup, runScript };
