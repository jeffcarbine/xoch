'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { test, run } from './lib/runner.js';
import { scratch, cleanup, runScript } from './lib/cli.js';
import { INSTALL_TARGETS, targetDir } from '../bin/lib/install-targets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, '..', 'config.js');
const CONFIG_MODULE_URL = pathToFileURL(path.join(__dirname, '..', 'config.js')).href;

function configPath(ctx) {
  return path.join(ctx.home, '.xoch', 'config.json');
}

// A config write reinstalls prompts: every INSTALL_TARGETS tool's folder
// should now hold installed xoch- entries, whichever tools are listed.
function assertReinstalled(ctx) {
  for (const target of INSTALL_TARGETS) {
    const dir = targetDir(target, ctx.home);
    assert.ok(fs.existsSync(dir), `${target.label} folder exists`);
    assert.ok(fs.readdirSync(dir).some((name) => name.startsWith('xoch-')), `${target.label} has xoch- entries`);
  }
}

function runWithStdin(args, ctx, input) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ctx.cwd,
    env: { ...process.env, HOME: ctx.home },
    input: input === null ? Buffer.alloc(0) : input,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('-h prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['-h'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown command prints usage and exits 1', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('show prints the resolved config with defaults applied when no file exists', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['show'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.version, 1);
    assert.strictEqual(data.storage.mode, 'centralized');
    assert.strictEqual(data.documentation.commentMode, 'follow-convention');
    assert.strictEqual(data.coverage.strictness, 'recommended');
    assert.strictEqual(data.git.behavior, 'ask');
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('get documentation.commentMode prints the default when unset', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'documentation.commentMode'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'follow-convention');
  } finally {
    cleanup(ctx);
  }
});

test('set rejects an invalid documentation.commentMode value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'documentation.commentMode', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid documentation\.commentMode value 'bogus'/);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('set documentation.commentMode writes the config and round-trips on read', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'documentation.commentMode', 'follow-convention'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /documentation\.commentMode set to follow-convention/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.documentation.commentMode, 'follow-convention');

    const getResult = runScript(SCRIPT, ['get', 'documentation.commentMode'], ctx);
    assert.strictEqual(getResult.stdout.trim(), 'follow-convention');
  } finally {
    cleanup(ctx);
  }
});

test('get coverage.strictness prints the default when unset', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'coverage.strictness'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'recommended');
  } finally {
    cleanup(ctx);
  }
});

test('set rejects an invalid coverage.strictness value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'coverage.strictness', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid coverage\.strictness value 'bogus'/);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('set coverage.strictness writes the config and round-trips on read', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'coverage.strictness', 'recommended'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /coverage\.strictness set to recommended/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.coverage.strictness, 'recommended');

    const getResult = runScript(SCRIPT, ['get', 'coverage.strictness'], ctx);
    assert.strictEqual(getResult.stdout.trim(), 'recommended');
  } finally {
    cleanup(ctx);
  }
});

test('show includes the resolved coverage.strictness', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['show'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.coverage.strictness, 'recommended');
  } finally {
    cleanup(ctx);
  }
});

test('set documentation.commentMode also re-renders and reinstalls the prompts', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'documentation.commentMode', 'follow-convention'], ctx);
    assert.strictEqual(result.status, 0);
    const renderedDir = path.join(ctx.home, '.xoch', 'prompts');
    assert.ok(fs.existsSync(renderedDir));
    assert.ok(fs.readdirSync(renderedDir).some((name) => name.endsWith('.md')));
    assertReinstalled(ctx);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode also re-renders and reinstalls the prompts once it finishes', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '1\n2\n2\n\n');
    assert.strictEqual(result.status, 0);
    assertReinstalled(ctx);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: updating a skill also re-renders and reinstalls the prompts', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\n6000\n\n');
    assert.strictEqual(result.status, 0);
    assertReinstalled(ctx);
  } finally {
    cleanup(ctx);
  }
});

test('get requires a key argument', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('get storage.mode prints the default when unset', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'storage.mode'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), 'centralized');
  } finally {
    cleanup(ctx);
  }
});

test('get rejects an unknown key', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'bogus.key'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown config key: bogus\.key/);
  } finally {
    cleanup(ctx);
  }
});

test('set requires both a key and a value', () => {
  const ctx = scratch();
  try {
    const missingValue = runScript(SCRIPT, ['set', 'storage.mode'], ctx);
    assert.strictEqual(missingValue.status, 1);
    assert.match(missingValue.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('set rejects an unknown key', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'bogus.key', 'value'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown config key: bogus\.key/);
  } finally {
    cleanup(ctx);
  }
});

test('set rejects an invalid storage.mode value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'storage.mode', 'bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid storage\.mode value 'bogus'/);
  } finally {
    cleanup(ctx);
  }
});

function repoWithXoch(ctx, name) {
  const repo = path.join(ctx.home, 'dev', name);
  fs.mkdirSync(path.join(repo, '.xoch', 'work', 'jobs', 'j1'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.xoch', 'work', 'jobs', 'j1', 'state.json'), '{}');
  return repo;
}

function pinMode(ctx, mode) {
  fs.mkdirSync(path.join(ctx.home, '.xoch'), { recursive: true });
  fs.writeFileSync(configPath(ctx), JSON.stringify({ storage: { mode } }));
}

test('set storage.mode with nothing to move just sets the mode, without asking', () => {
  const ctx = scratch();
  try {
    pinMode(ctx, 'in-repo');
    const result = runScript(SCRIPT, ['set', 'storage.mode', 'centralized'], ctx);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /Nothing to move\./);
    assert.match(result.stdout, /storage\.mode set to centralized/);
    assert.doesNotMatch(result.stdout, /Move files manually|Proceed\?/);
    assert.strictEqual(runScript(SCRIPT, ['get', 'storage.mode'], ctx).stdout.trim(), 'centralized');
  } finally {
    cleanup(ctx);
  }
});

test('set storage.mode previews the move, and moves every scanned repo only after confirmation', () => {
  const ctx = scratch();
  try {
    pinMode(ctx, 'in-repo');
    const repo = repoWithXoch(ctx, 'alpha');
    const result = runWithStdin(['set', 'storage.mode', 'centralized', '--scan', path.join(ctx.home, 'dev')], ctx, 'y\n');
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /alpha: work -> .*projects\/alpha/);
    assert.match(result.stdout, /Proceed\? \[Y\]es \/ \[N\]o/);
    assert.match(result.stdout, /Moved 1 repo/);
    assert.ok(fs.existsSync(path.join(ctx.home, '.xoch', 'projects', 'alpha', 'work', 'jobs', 'j1', 'state.json')));
    assert.ok(!fs.existsSync(path.join(repo, '.xoch')));
    assert.strictEqual(JSON.parse(fs.readFileSync(configPath(ctx), 'utf8')).storage.mode, 'centralized');
  } finally {
    cleanup(ctx);
  }
});

test('declining the storage move, or a dry run, moves nothing and leaves the mode unchanged', () => {
  const ctx = scratch();
  try {
    pinMode(ctx, 'in-repo');
    const repo = repoWithXoch(ctx, 'alpha');
    const scan = ['--scan', path.join(ctx.home, 'dev')];
    const declined = runWithStdin(['set', 'storage.mode', 'centralized', ...scan], ctx, 'n\n');
    assert.strictEqual(declined.status, 0);
    assert.match(declined.stdout, /Cancelled; nothing moved\./);
    const noAnswer = runWithStdin(['set', 'storage.mode', 'centralized', ...scan], ctx, null);
    assert.strictEqual(noAnswer.status, 1);
    const dry = runScript(SCRIPT, ['set', 'storage.mode', 'centralized', ...scan, '--dry-run'], ctx);
    assert.strictEqual(dry.status, 0);
    assert.match(dry.stdout, /alpha: work ->/);
    assert.match(dry.stdout, /Dry run: nothing moved\./);
    assert.ok(fs.existsSync(path.join(repo, '.xoch', 'work')));
    assert.strictEqual(JSON.parse(fs.readFileSync(configPath(ctx), 'utf8')).storage.mode, 'in-repo');
  } finally {
    cleanup(ctx);
  }
});

test('--yes moves without asking, and a refused plan moves nothing and keeps the mode', () => {
  const ctx = scratch();
  try {
    pinMode(ctx, 'in-repo');
    repoWithXoch(ctx, 'alpha');
    const scan = ['--scan', path.join(ctx.home, 'dev')];
    fs.mkdirSync(path.join(ctx.home, '.xoch', 'projects', 'alpha', 'work'), { recursive: true });
    fs.writeFileSync(path.join(ctx.home, '.xoch', 'projects', 'alpha', 'work', 'other'), '');
    const refused = runScript(SCRIPT, ['set', 'storage.mode', 'centralized', ...scan, '--yes'], ctx);
    assert.strictEqual(refused.status, 1);
    assert.match(refused.stdout, /Refused/);
    assert.match(refused.stderr, /storage\.mode not changed/);
    assert.strictEqual(JSON.parse(fs.readFileSync(configPath(ctx), 'utf8')).storage.mode, 'in-repo');
    fs.rmSync(path.join(ctx.home, '.xoch', 'projects', 'alpha'), { recursive: true });
    repoWithXoch(ctx, 'beta');
    const yes = runScript(SCRIPT, ['set', 'storage.mode', 'centralized', ...scan, '--yes'], ctx);
    assert.strictEqual(yes.status, 0, yes.stderr);
    assert.doesNotMatch(yes.stdout, /Proceed\?/);
    assert.match(yes.stdout, /Moved 2 repos\./);
    assert.match(yes.stdout, /storage\.mode set to centralized/);
  } finally {
    cleanup(ctx);
  }
});

test('a storage move that fails partway is undone and leaves the mode unchanged', () => {
  const ctx = scratch();
  try {
    pinMode(ctx, 'in-repo');
    const repo = repoWithXoch(ctx, 'alpha');
    const projects = path.join(ctx.home, '.xoch', 'projects');
    fs.mkdirSync(projects, { recursive: true });
    fs.chmodSync(projects, 0o555);
    try {
      const result = runScript(SCRIPT, ['set', 'storage.mode', 'centralized', '--scan', path.join(ctx.home, 'dev'), '--yes'], ctx);
      assert.strictEqual(result.status, 1);
      assert.match(result.stderr, /Storage move failed and was undone: .*storage\.mode not changed/);
    } finally {
      fs.chmodSync(projects, 0o755);
    }
    assert.ok(fs.existsSync(path.join(repo, '.xoch', 'work', 'jobs', 'j1', 'state.json')));
    assert.strictEqual(JSON.parse(fs.readFileSync(configPath(ctx), 'utf8')).storage.mode, 'in-repo');
  } finally {
    cleanup(ctx);
  }
});

test('set storage.mode refuses an unknown option', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'storage.mode', 'centralized', '--bogus'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unknown option: --bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('get tokenBudgets.spec prints the built-in default when unset', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'tokenBudgets.spec'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), '5000');
  } finally {
    cleanup(ctx);
  }
});

test('get tokenBudgets.<unrecognized skill> falls back to the generic default', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['get', 'tokenBudgets.some-unknown-skill'], ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), '5000');
  } finally {
    cleanup(ctx);
  }
});

test('set tokenBudgets.spec writes the override and get reflects it', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'tokenBudgets.spec', '6000'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /tokenBudgets\.spec set to 6000/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.tokenBudgets.spec, 6000);

    const getResult = runScript(SCRIPT, ['get', 'tokenBudgets.spec'], ctx);
    assert.strictEqual(getResult.stdout.trim(), '6000');
  } finally {
    cleanup(ctx);
  }
});

test('set tokenBudgets.<skill> rejects a non-numeric value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'tokenBudgets.spec', 'abc'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid budget value 'abc'/);
  } finally {
    cleanup(ctx);
  }
});

test('set tokenBudgets.<skill> rejects zero', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'tokenBudgets.spec', '0'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid budget value '0'/);
  } finally {
    cleanup(ctx);
  }
});

test('set tokenBudgets.<skill> rejects a negative value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'tokenBudgets.spec', '-5'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid budget value '-5'/);
  } finally {
    cleanup(ctx);
  }
});

test('show includes the resolved token budgets', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['set', 'tokenBudgets.spec', '6000'], ctx);
    const result = runScript(SCRIPT, ['show'], ctx);
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.strictEqual(data.tokenBudgets.spec, 6000);
    assert.strictEqual(data.tokenBudgets.plan, 7000);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: setting one skill then a blank line finishes', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\n6000\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /spec: 5000/);
    assert.match(result.stdout, /tokenBudgets\.spec set to 6000/);
    assert.match(result.stdout, /Done\./);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.tokenBudgets.spec, 6000);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: an immediate blank line finishes without changes', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, '\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Done\./);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('budgets: no stdin input at all exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, null);
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: EOF after a skill name but before a value exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\n');
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('budgets: an invalid value for a skill exits 1 without writing', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\nabc\n');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid budget value 'abc'/);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('budgets: updating a skill twice in one session applies both edits', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin(['budgets'], ctx, 'spec\n6000\nplan\n8000\n\n');
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.tokenBudgets.spec, 6000);
    assert.strictEqual(data.tokenBudgets.plan, 8000);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode with no stdin input exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, null);
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 1 sets storage.mode to in-repo', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['set', 'storage.mode', 'centralized'], ctx);
    const result = runWithStdin([], ctx, '1\n3\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /storage\.mode set to in-repo/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.storage.mode, 'in-repo');
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 2 sets storage.mode to centralized', () => {
  const ctx = scratch();
  try {
    pinMode(ctx, 'in-repo');
    const result = runWithStdin([], ctx, '2\n3\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /storage\.mode set to centralized/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 3 leaves the mode unchanged', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Left unchanged\./);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('interactive empty selection leaves the mode unchanged', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '\n\n\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Left unchanged\./);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection choosing the already-current mode reports no change', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '2\n3\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Already centralized; nothing changed\./);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('an invalid interactive selection exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '9\n');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid selection: 9/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode prints the current mode and prompt lines', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n3\n\n');
    assert.match(result.stdout, /Current storage\.mode: centralized/);
    assert.match(result.stdout, /Choose storage mode:/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode exits 1 if stdin runs out before the documentation.commentMode question', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n');
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 1 sets documentation.commentMode to always', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['set', 'documentation.commentMode', 'follow-convention'], ctx);
    const result = runWithStdin([], ctx, '3\n1\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /documentation\.commentMode set to always/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.documentation.commentMode, 'always');
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 2 sets documentation.commentMode to follow-convention', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['set', 'documentation.commentMode', 'always'], ctx);
    const result = runWithStdin([], ctx, '3\n2\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /documentation\.commentMode set to follow-convention/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 3 leaves documentation.commentMode unchanged', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Choose documentation comment mode:/);
    assert.strictEqual((result.stdout.match(/Left unchanged\./g) || []).length, 4);
  } finally {
    cleanup(ctx);
  }
});

test('interactive empty selection leaves documentation.commentMode unchanged', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Choose documentation comment mode:/);
    assert.strictEqual((result.stdout.match(/Left unchanged\./g) || []).length, 4);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection choosing the already-current documentation.commentMode reports no change', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n2\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Already follow-convention; nothing changed\./);
  } finally {
    cleanup(ctx);
  }
});

test('an invalid documentation.commentMode interactive selection exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n9\n');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid selection: 9/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode prints the current documentation.commentMode and prompt lines', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n3\n\n');
    assert.match(result.stdout, /Current documentation\.commentMode: follow-convention/);
    assert.match(result.stdout, /Choose documentation comment mode:/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode exits 1 if stdin runs out before the coverage.strictness question', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n');
    assert.strictEqual(result.status, 1);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 1 sets coverage.strictness to required', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['set', 'coverage.strictness', 'recommended'], ctx);
    const result = runWithStdin([], ctx, '3\n3\n1\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /coverage\.strictness set to required/);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.coverage.strictness, 'required');
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 2 sets coverage.strictness to recommended', () => {
  const ctx = scratch();
  try {
    runScript(SCRIPT, ['set', 'coverage.strictness', 'required'], ctx);
    const result = runWithStdin([], ctx, '3\n3\n2\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /coverage\.strictness set to recommended/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection 3 leaves coverage.strictness unchanged', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n3\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Choose coverage strictness:/);
    assert.strictEqual((result.stdout.match(/Left unchanged\./g) || []).length, 4);
  } finally {
    cleanup(ctx);
  }
});

test('interactive empty selection leaves coverage.strictness unchanged', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Choose coverage strictness:/);
    assert.strictEqual((result.stdout.match(/Left unchanged\./g) || []).length, 4);
  } finally {
    cleanup(ctx);
  }
});

test('interactive selection choosing the already-current coverage.strictness reports no change', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n2\n\n');
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Already recommended; nothing changed\./);
  } finally {
    cleanup(ctx);
  }
});

test('an invalid coverage.strictness interactive selection exits 1', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n9\n\n');
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid selection: 9/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode prints the current coverage.strictness and prompt lines', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '3\n3\n3\n\n');
    assert.match(result.stdout, /Current coverage\.strictness: recommended/);
    assert.match(result.stdout, /Choose coverage strictness:/);
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode walks through storage.mode, documentation.commentMode, coverage.strictness, and git.behavior in one invocation', () => {
  const ctx = scratch();
  try {
    const result = runWithStdin([], ctx, '1\n1\n1\n4\n');
    assert.strictEqual(result.status, 0);
    const data = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    assert.strictEqual(data.storage.mode, 'in-repo');
    assert.strictEqual(data.documentation.commentMode, 'always');
    assert.strictEqual(data.coverage.strictness, 'required');
    assert.strictEqual(data.git.behavior, 'push');
  } finally {
    cleanup(ctx);
  }
});

// process.stdin.isTTY is always false under a piped subprocess, so the
// "print the prompt" branch (only reached on a real TTY) is exercised
// in-process instead, with fs.readSync and process.stdin.isTTY patched
// for the duration of a single, non-exiting runInteractive() call.
test('a real TTY gets the inline selection prompt', async () => {
  const ctx = scratch();
  const originalIsTTY = process.stdin.isTTY;
  const originalReadSync = fs.readSync;
  const originalHome = process.env.HOME;
  let wrote = '';
  const originalWrite = process.stdout.write;
  try {
    process.env.HOME = ctx.home;
    // config.js reads os.homedir() once, at import time, into a
    // module-level CONFIG_PATH constant -- HOME must already point at the
    // scratch home before this first (and only, per test process) import.
    const config = await import(CONFIG_MODULE_URL);
    process.stdin.isTTY = true;
    const answer = Buffer.from('3\n3\n3\n6\n', 'utf8');
    let offset = 0;
    fs.readSync = (fd, buf) => {
      if (fd !== 0) return originalReadSync.apply(fs, arguments);
      if (offset >= answer.length) return 0;
      buf[0] = answer[offset];
      offset += 1;
      return 1;
    };
    process.stdout.write = (chunk, ...rest) => {
      wrote += chunk;
      return true;
    };
    config.runInteractive();
  } finally {
    process.stdout.write = originalWrite;
    fs.readSync = originalReadSync;
    process.stdin.isTTY = originalIsTTY;
    process.env.HOME = originalHome;
    cleanup(ctx);
  }
  assert.match(wrote, /Selection \[1\/2\/3\]: /);
  assert.match(wrote, /Choose documentation comment mode:/);
  assert.match(wrote, /Choose coverage strictness:/);
  assert.match(wrote, /Selection \[1-6\]: /);
});

// Isolated in its own subprocess (matching callExported()-style helpers
// elsewhere in this test suite) rather than a second in-process import of
// config.js: ESM has no require.cache-style invalidation, and a
// cache-busting query-string import (an earlier version of this test used
// `${CONFIG_MODULE_URL}?t=...`) creates a second, distinct module URL that
// node's coverage reporter cannot merge back into config.js's normal
// (subprocess-aggregated) coverage entry -- it silently discards the
// well-covered subprocess data instead. A real subprocess gets a
// naturally fresh module evaluation with no query string needed, and its
// coverage merges normally, like every other subprocess invocation of
// config.js in this file.
test('budgets on a real TTY prints the inline skill/value prompts', () => {
  const ctx = scratch();
  try {
    const specifier = JSON.stringify(CONFIG_MODULE_URL);
    // The fs.readSync monkeypatch is installed only inside the .then(),
    // after config.js has already loaded -- installing it beforehand also
    // intercepts Node's own internal synchronous file read of config.js's
    // source (a real fd, not stdin), which doesn't have a `[fd, buf]`-only
    // signature to fall back on cleanly.
    const script = [
      "const fs = require('fs');",
      `import(${specifier}).then((config) => {`,
      '  const originalReadSync = fs.readSync;',
      "  const answer = Buffer.from('spec\\n6000\\n\\n', 'utf8');",
      '  let offset = 0;',
      '  fs.readSync = (fd, buf, ...rest) => {',
      '    if (fd !== 0) return originalReadSync.call(fs, fd, buf, ...rest);',
      '    if (offset >= answer.length) return 0;',
      '    buf[0] = answer[offset];',
      '    offset += 1;',
      '    return 1;',
      '  };',
      '  process.stdin.isTTY = true;',
      '  config.runBudgetsInteractive();',
      '});',
    ].join('\n');
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: ctx.cwd,
      env: { ...process.env, HOME: ctx.home },
      encoding: 'utf8',
    });
    assert.match(result.stdout, /Enter a skill name to update/);
    assert.match(result.stdout, /New budget for "spec" \(currently 5000\): /);
  } finally {
    cleanup(ctx);
  }
});

test('readLine retries after a transient EAGAIN from the stdin read', async () => {
  const originalReadSync = fs.readSync;
  const config = await import(CONFIG_MODULE_URL);
  const answer = Buffer.from('x\n', 'utf8');
  let offset = 0;
  let threwOnce = false;
  try {
    fs.readSync = (fd, buf) => {
      if (fd !== 0) return originalReadSync.apply(fs, arguments);
      if (!threwOnce) {
        threwOnce = true;
        const err = new Error('resource temporarily unavailable');
        err.code = 'EAGAIN';
        throw err;
      }
      if (offset >= answer.length) return 0;
      buf[0] = answer[offset];
      offset += 1;
      return 1;
    };
    assert.strictEqual(config.readLine(), 'x');
    assert.strictEqual(threwOnce, true);
  } finally {
    fs.readSync = originalReadSync;
  }
});

test('readLine propagates a non-EAGAIN error from the stdin read', async () => {
  const originalReadSync = fs.readSync;
  const config = await import(CONFIG_MODULE_URL);
  try {
    fs.readSync = (fd) => {
      if (fd !== 0) return originalReadSync.apply(fs, arguments);
      const err = new Error('I/O error');
      err.code = 'EIO';
      throw err;
    };
    assert.throws(() => config.readLine(), /I\/O error/);
  } finally {
    fs.readSync = originalReadSync;
  }
});

test('get git.behavior prints ask when unset, and set accepts each behavior and reinstalls', () => {
  const ctx = scratch();
  try {
    assert.strictEqual(runScript(SCRIPT, ['get', 'git.behavior'], ctx).stdout.trim(), 'ask');
    for (const value of ['ask', 'generate', 'commit', 'push', 'none']) {
      const result = runScript(SCRIPT, ['set', 'git.behavior', value], ctx);
      assert.strictEqual(result.status, 0, result.stderr);
      assert.match(result.stdout, new RegExp(`git\\.behavior set to ${value}`));
      assert.strictEqual(runScript(SCRIPT, ['get', 'git.behavior'], ctx).stdout.trim(), value);
    }
    assert.strictEqual(JSON.parse(fs.readFileSync(configPath(ctx), 'utf8')).git.behavior, 'none');
    assert.ok(fs.existsSync(path.join(ctx.home, '.xoch', 'prompts')));
  } finally {
    cleanup(ctx);
  }
});

test('set rejects an invalid git.behavior value', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['set', 'git.behavior', 'amend'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid git\.behavior value 'amend'. Expected one of: ask generate commit push none/);
    assert.ok(!fs.existsSync(configPath(ctx)));
  } finally {
    cleanup(ctx);
  }
});

test('interactive mode asks about git.behavior last, and each selection sets that behavior', () => {
  const values = ['ask', 'generate', 'commit', 'push', 'none'];
  values.forEach((value, i) => {
    const ctx = scratch();
    try {
      if (value === 'ask') runScript(SCRIPT, ['set', 'git.behavior', 'none'], ctx);
      const result = runWithStdin([], ctx, `3\n3\n3\n${i + 1}\n`);
      assert.strictEqual(result.status, 0, result.stderr);
      assert.match(result.stdout, /Current git\.behavior: /);
      assert.match(result.stdout, new RegExp(`git\\.behavior set to ${value}`));
    } finally {
      cleanup(ctx);
    }
  });
});

test('interactive git.behavior: leave-unchanged, empty, already-current, invalid, and running out of input', () => {
  const ctx = scratch();
  try {
    assert.match(runWithStdin([], ctx, '3\n3\n3\n6\n').stdout, /Left unchanged\.\n*$/);
    assert.match(runWithStdin([], ctx, '3\n3\n3\n\n').stdout, /Left unchanged\.\n*$/);
    assert.match(runWithStdin([], ctx, '3\n3\n3\n1\n').stdout, /Already ask; nothing changed\./);
    const invalid = runWithStdin([], ctx, '3\n3\n3\n9\n');
    assert.strictEqual(invalid.status, 1);
    assert.match(invalid.stderr, /invalid selection: 9/);
    assert.strictEqual(runWithStdin([], ctx, '3\n3\n3\n').status, 1);
    assert.ok(!fs.existsSync(configPath(ctx)) || !JSON.parse(fs.readFileSync(configPath(ctx), 'utf8')).git);
  } finally {
    cleanup(ctx);
  }
});

run();
