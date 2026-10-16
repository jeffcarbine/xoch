'use strict';

// Shared scratch-environment + subprocess-spawn helpers for
// test/*.test.js. Each script is spawned as a real subprocess (not
// require()'d in-process) so its own process.exit() calls never affect
// the test runner itself.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

function scratch() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xoch-test-home-'));
  const cwd = path.join(home, 'proj');
  fs.mkdirSync(cwd, { recursive: true });
  return { home, cwd };
}

// A scratch environment pinned to in-repo storage, for tests whose
// fixtures live under <cwd>/.xoch (storage otherwise defaults to
// centralized, under <home>/.xoch/projects/).
function scratchInRepo() {
  const ctx = scratch();
  fs.mkdirSync(path.join(ctx.home, '.xoch'), { recursive: true });
  fs.writeFileSync(path.join(ctx.home, '.xoch', 'config.json'), JSON.stringify({ storage: { mode: 'in-repo' } }));
  return ctx;
}

function cleanup(ctx) {
  fs.rmSync(ctx.home, { recursive: true, force: true });
}

function runScript(scriptPath, args, ctx, input) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ctx.cwd,
    env: { ...process.env, HOME: ctx.home },
    encoding: 'utf8',
    input,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

export {
  scratch, scratchInRepo, cleanup, runScript,
};
