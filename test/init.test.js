'use strict';

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { test, run } from './lib/runner.js';
import { runScript } from './lib/cli.js';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REAL_SCRIPT = path.join(__dirname, '..', 'bin', 'init.js');
const REAL_DISPATCHER = path.join(__dirname, '..', 'bin', 'xoch.js');
const REAL_IS_MAIN_JS = path.join(__dirname, '..', 'bin', 'lib', 'is-main.js');

// init.js's *source* paths (prompts/) are derived from __dirname (one
// level up, since init.js lives in bin/), not cwd or $HOME, so isolating
// $HOME alone (as every other bin/*.js test does) can't control them.
// Copying init.js itself into a scratch bin/ directory, one level below a
// scratch root, makes its `path.join(__dirname, '..')` resolve to that
// scratch root instead, giving each test a fully controlled source corpus
// at the same relative depth install.js's tests used at repo root.
//
// That scratch directory has to live *inside* the repo, not under
// os.tmpdir() like test/lib/cli.js's scratch() -- node's coverage
// reporter reads the source file from disk when it builds the final
// report, so a copy that gets deleted (as every other test's
// cleanup() does, immediately after each test) ends up silently
// excluded, reporting 0% for a file that plainly executed. The fix
// is a single persistent copy of init.js, created once and left
// on disk for the whole test-file run (gitignored); only the
// sibling prompts/ fixture next to it gets reset per test.
//
// Destination paths (~/.xoch/..., the 4 tool directories) are all
// $HOME-based, so isolating just $HOME (independent of where the script
// copy lives) still covers them the usual way.
const SCRATCH_ROOT = path.join(__dirname, '..', '.init-test-scratch');
const SCRATCH_BIN_DIR = path.join(SCRATCH_ROOT, 'bin');
const SCRATCH_SCRIPT = path.join(SCRATCH_BIN_DIR, 'init.js');
fs.rmSync(SCRATCH_ROOT, { recursive: true, force: true });
fs.mkdirSync(path.join(SCRATCH_BIN_DIR, 'lib'), { recursive: true });
fs.copyFileSync(REAL_SCRIPT, SCRATCH_SCRIPT);
// init.js imports ./lib/is-main.js (its require.main-equivalent CLI-entry
// guard) relative to its own location, so the scratch copy needs a real
// copy alongside it too.
fs.copyFileSync(REAL_IS_MAIN_JS, path.join(SCRATCH_BIN_DIR, 'lib', 'is-main.js'));

function scratch() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xoch-test-home-'));
  return { cwd: SCRATCH_ROOT, home };
}

function cleanup(ctx) {
  fs.rmSync(path.join(SCRATCH_ROOT, 'prompts'), { recursive: true, force: true });
  fs.rmSync(ctx.home, { recursive: true, force: true });
}

function buildFixture(ctx, { withPrompts = true, withCore = true } = {}) {
  const root = ctx.cwd;
  const scriptCopy = SCRATCH_SCRIPT;

  const promptsDir = path.join(root, 'prompts');
  const partialsDir = path.join(promptsDir, 'partials');
  const coreDir = path.join(promptsDir, 'core');

  if (withPrompts) {
    fs.mkdirSync(partialsDir, { recursive: true });
    fs.writeFileSync(path.join(promptsDir, 'meow.md'), '---\nname: meow\ndescription: A test prompt\n---\n\nHello, meow.\n');
    fs.writeFileSync(path.join(promptsDir, 'README.md'), '# ignored\n');
    if (withCore) {
      fs.mkdirSync(coreDir, { recursive: true });
      fs.writeFileSync(path.join(coreDir, 'core-thing.md'), '---\nname: core-thing\n---\n\nCore body.\n');
    }
  }

  return { root, scriptCopy, promptsDir, partialsDir, coreDir };
}

function runInit(fixture, ctx) {
  return runScript(fixture.scriptCopy, [], ctx);
}

function xochDir(ctx) {
  return path.join(ctx.home, '.xoch');
}

function copilotDir(ctx) {
  return path.join(ctx.home, 'Library', 'Application Support', 'Code', 'User', 'prompts');
}

function codexDir(ctx) {
  return path.join(ctx.home, '.codex', 'skills');
}

function claudeDir(ctx) {
  return path.join(ctx.home, '.claude', 'skills');
}

function kiroDir(ctx) {
  return path.join(ctx.home, '.kiro', 'steering');
}

test('a missing prompts/ directory is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withPrompts: false });
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /prompts\/ directory not found/);
  } finally {
    cleanup(ctx);
  }
});

test('a full init renders prompts and installs to all four targets', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Found 1 prompt\(s\) to install/);
    assert.match(result.stdout, /Initialization complete!/);

    // Rendered prompts, top-level and core.
    assert.ok(fs.existsSync(path.join(xochDir(ctx), 'prompts', 'meow.md')));
    assert.ok(!fs.existsSync(path.join(xochDir(ctx), 'prompts', 'README.md')));
    assert.ok(fs.existsSync(path.join(xochDir(ctx), 'prompts', 'core', 'core-thing.md')));

    // Copilot: symlink.
    const copilotTarget = path.join(copilotDir(ctx), 'xoch-meow.prompt.md');
    assert.ok(fs.lstatSync(copilotTarget).isSymbolicLink());

    // Codex: copied SKILL.md + generated agents/openai.yaml.
    const codexSkillDir = path.join(codexDir(ctx), 'xoch-meow');
    assert.ok(fs.existsSync(path.join(codexSkillDir, 'SKILL.md')));
    const openaiYaml = fs.readFileSync(path.join(codexSkillDir, 'agents', 'openai.yaml'), 'utf8');
    assert.match(openaiYaml, /display_name: "Xoch meow"/);
    assert.match(openaiYaml, /short_description: "A test prompt"/);
    assert.match(openaiYaml, /\$meow/);

    // Claude: SKILL.md with an injected disable-model-invocation line.
    const claudeSkill = fs.readFileSync(path.join(claudeDir(ctx), 'xoch-meow', 'SKILL.md'), 'utf8');
    assert.match(claudeSkill, /disable-model-invocation: true/);

    // Kiro: .md with an injected inclusion line.
    const kiroFile = fs.readFileSync(path.join(kiroDir(ctx), 'xoch-meow.md'), 'utf8');
    assert.match(kiroFile, /inclusion: manual/);
  } finally {
    cleanup(ctx);
  }
});

test('init does not create or populate ~/.xoch/bin', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(!fs.existsSync(path.join(xochDir(ctx), 'bin')));
  } finally {
    cleanup(ctx);
  }
});

test('helper commands work correctly after init with no ~/.xoch/bin present', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const initResult = runInit(fixture, ctx);
    assert.strictEqual(initResult.status, 0);
    assert.ok(!fs.existsSync(path.join(xochDir(ctx), 'bin')));

    // The real dispatcher (not the scratch copy) requires its sibling
    // helper modules directly rather than reaching into ~/.xoch/bin, so
    // it should work unchanged against a home directory init just set up.
    const dispatched = runScript(REAL_DISPATCHER, ['job', 'current', '--json'], ctx);
    assert.strictEqual(dispatched.status, 0);
    assert.ok(!/Cannot find module/.test(dispatched.stderr));
  } finally {
    cleanup(ctx);
  }
});

test('a prompt without frontmatter passes through Claude/Kiro installation unchanged', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), 'No frontmatter here.\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const claudeSkill = fs.readFileSync(path.join(claudeDir(ctx), 'xoch-meow', 'SKILL.md'), 'utf8');
    assert.strictEqual(claudeSkill, 'No frontmatter here.\n');
    const kiroFile = fs.readFileSync(path.join(kiroDir(ctx), 'xoch-meow.md'), 'utf8');
    assert.strictEqual(kiroFile, 'No frontmatter here.\n');
  } finally {
    cleanup(ctx);
  }
});

test('a prompt with unclosed frontmatter passes through unchanged', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '---\nname: meow\nBody with no closing fence.\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const claudeSkill = fs.readFileSync(path.join(claudeDir(ctx), 'xoch-meow', 'SKILL.md'), 'utf8');
    assert.ok(!claudeSkill.includes('disable-model-invocation'));
  } finally {
    cleanup(ctx);
  }
});

test('a prompt missing name:/description: lines yields empty Codex frontmatter fields', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), 'Just a body, no frontmatter fields.\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const openaiYaml = fs.readFileSync(path.join(codexDir(ctx), 'xoch-meow', 'agents', 'openai.yaml'), 'utf8');
    assert.match(openaiYaml, /display_name: "Xoch meow"/);
    assert.match(openaiYaml, /short_description: ""/);
  } finally {
    cleanup(ctx);
  }
});

test('no prompts/core/ directory skips core rendering', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /\(1 files, 0 core\)/);
    assert.ok(!fs.existsSync(path.join(xochDir(ctx), 'prompts', 'core')));
  } finally {
    cleanup(ctx);
  }
});

test('a directory named like a markdown file is not treated as a prompt', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.mkdirSync(path.join(fixture.promptsDir, 'trap.md'));
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Found 1 prompt\(s\) to install/);
  } finally {
    cleanup(ctx);
  }
});

test('a single-line partial reference substitutes its variables', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), 'Hello, {{who}}!');
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), 'Body:\n{{xoch-partial:greet.md who="world"}}\nEnd.\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.match(rendered, /Hello, world!/);
  } finally {
    cleanup(ctx);
  }
});

test('a multi-line partial reference with assignments across lines substitutes correctly', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), '{{who}} says {{what}}');
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      'Body:\n{{xoch-partial:greet.md\nwho="world"\nwhat="hi"}}\nEnd.\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.match(rendered, /world says hi/);
  } finally {
    cleanup(ctx);
  }
});

test('escaped quotes and backslashes in a partial variable value are unescaped', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), 'Value: {{v}}');
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      'Body:\n{{xoch-partial:greet.md v="say \\"hi\\" then \\\\bye"}}\nEnd.\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.match(rendered, /Value: say "hi" then \\bye/);
  } finally {
    cleanup(ctx);
  }
});

test('an unused partial variable prints a warning but still renders', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), 'Hello, {{who}}!');
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:greet.md who="world" extra="unused"}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stderr, /Warning: unused variable\(s\) for partial 'greet\.md'.*extra/);
  } finally {
    cleanup(ctx);
  }
});

test('a partial with no missing variables and no unused ones prints no warning', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), 'Hello, {{who}}!');
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:greet.md who="world"}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stderr, '');
  } finally {
    cleanup(ctx);
  }
});

test('an empty partial reference body is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:   }}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /malformed prompt partial/);
  } finally {
    cleanup(ctx);
  }
});

test('a partial reference that resolves to an empty path after stripping "./" is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:./}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /missing prompt partial path/);
  } finally {
    cleanup(ctx);
  }
});

test('a partial path escaping the partials directory is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:../escape.md}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid prompt partial path/);
  } finally {
    cleanup(ctx);
  }
});

test('an absolute partial path is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:/etc/passwd}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid prompt partial path/);
  } finally {
    cleanup(ctx);
  }
});

test('a reference to a missing partial file is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:missing.md}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /prompt partial not found/);
  } finally {
    cleanup(ctx);
  }
});

test('a partial variable used by the template but not supplied is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), 'Hello, {{who}}!');
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:greet.md}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /missing variable 'who'/);
  } finally {
    cleanup(ctx);
  }
});

test('a malformed variable assignment is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), 'Hi');
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:greet.md 123bad="x"}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /malformed variable assignment/);
  } finally {
    cleanup(ctx);
  }
});

test('a variable assignment missing "=" is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), 'Hi');
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:greet.md who "x"}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /expected '=' after variable 'who'/);
  } finally {
    cleanup(ctx);
  }
});

test('a variable assignment with an unquoted value is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.partialsDir, 'greet.md'), 'Hi');
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:greet.md who=world}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /expected quoted value for variable 'who'/);
  } finally {
    cleanup(ctx);
  }
});

test('an unreadable prompt source file is reported', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    const promptPath = path.join(fixture.promptsDir, 'meow.md');
    fs.chmodSync(promptPath, 0o000);
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Error rendering/);
  } finally {
    fs.chmodSync(path.join(ctx.cwd, 'prompts', 'meow.md'), 0o644);
    cleanup(ctx);
  }
});

test('a write failure while rendering a prompt is reported (renderPromptFile called directly)', () => {
  const ctx = scratch();
  try {
    // Not reachable through the full init() pipeline: PROMPTS_DIR is
    // always rm-rf'd and recreated empty immediately before this runs, so
    // there's no way to pre-place a conflicting entry at the output path.
    // renderPromptFile is exported specifically so this write-failure
    // branch (as opposed to the read-failure one above) can be exercised
    // directly: an outputFile path that is itself a pre-existing
    // directory makes fs.writeFileSync throw EISDIR.
    const fixture = buildFixture(ctx, { withCore: false });
    const outputAsDir = path.join(ctx.cwd, 'output-is-a-dir.md');
    fs.mkdirSync(outputAsDir);
    const specifier = JSON.stringify(pathToFileURL(fixture.scriptCopy).href);
    const script = `import(${specifier}).then((m) => m.renderPromptFile(${JSON.stringify(fixture.promptsDir)}, ${JSON.stringify(path.join(fixture.promptsDir, 'meow.md'))}, ${JSON.stringify(outputAsDir)}));`;
    const result = spawnSync(process.execPath, ['-e', script], { cwd: ctx.cwd, encoding: 'utf8' });
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Error rendering/);
  } finally {
    cleanup(ctx);
  }
});

test('a partial that itself contains an unresolved partial reference is caught after rendering', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    // Partials are not recursively rendered -- a literal xoch-partial
    // marker inside a partial's own body survives substitution verbatim,
    // which is exactly what hasUnresolvedPartial() scans the output for.
    fs.writeFileSync(path.join(fixture.partialsDir, 'outer.md'), 'Nested: {{xoch-partial:inner.md}}');
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-partial:outer.md}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /unresolved prompt partial found in rendered prompts/);
  } finally {
    cleanup(ctx);
  }
});

test('a second run replaces existing Copilot symlinks and reports no orphans', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    const first = runInit(fixture, ctx);
    assert.strictEqual(first.status, 0);
    const second = runInit(fixture, ctx);
    assert.strictEqual(second.status, 0);
    assert.ok(!second.stdout.includes('Removed orphaned'));
    const copilotTarget = path.join(copilotDir(ctx), 'xoch-meow.prompt.md');
    assert.ok(fs.lstatSync(copilotTarget).isSymbolicLink());
  } finally {
    cleanup(ctx);
  }
});

test('removing a prompt and reinitializing cleans up its orphaned entries in all four targets', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'other.md'), '---\nname: other\ndescription: Other\n---\n\nOther body.\n');
    runInit(fixture, ctx);

    assert.ok(fs.existsSync(path.join(copilotDir(ctx), 'xoch-other.prompt.md')));
    assert.ok(fs.existsSync(path.join(codexDir(ctx), 'xoch-other')));
    assert.ok(fs.existsSync(path.join(claudeDir(ctx), 'xoch-other')));
    assert.ok(fs.existsSync(path.join(kiroDir(ctx), 'xoch-other.md')));

    fs.rmSync(path.join(fixture.promptsDir, 'other.md'));
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Removed orphaned: xoch-other/);

    assert.ok(!fs.existsSync(path.join(copilotDir(ctx), 'xoch-other.prompt.md')));
    assert.ok(!fs.existsSync(path.join(codexDir(ctx), 'xoch-other')));
    assert.ok(!fs.existsSync(path.join(claudeDir(ctx), 'xoch-other')));
    assert.ok(!fs.existsSync(path.join(kiroDir(ctx), 'xoch-other.md')));
  } finally {
    cleanup(ctx);
  }
});

test('a stray "README" entry in an installed target is cleaned up regardless of source', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.mkdirSync(copilotDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(copilotDir(ctx), 'xoch-README.prompt.md'), 'stray');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Removed orphaned: xoch-README/);
    assert.ok(!fs.existsSync(path.join(copilotDir(ctx), 'xoch-README.prompt.md')));
  } finally {
    cleanup(ctx);
  }
});

test('cleanup skips entries in each target that do not match the expected xoch- shape', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });

    // Copilot expects xoch-*.prompt.md *files* (or symlinks); a same-named
    // directory is left alone rather than removed.
    fs.mkdirSync(copilotDir(ctx), { recursive: true });
    fs.mkdirSync(path.join(copilotDir(ctx), 'xoch-adir.prompt.md'));

    // Codex/Claude expect xoch-* *directories*; a non-"xoch-" entry and a
    // same-named plain file are both left alone.
    fs.mkdirSync(codexDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(codexDir(ctx), 'not-ours'), 'ignore');
    fs.writeFileSync(path.join(codexDir(ctx), 'xoch-afile'), 'ignore');
    fs.mkdirSync(claudeDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(claudeDir(ctx), 'not-ours'), 'ignore');
    fs.writeFileSync(path.join(claudeDir(ctx), 'xoch-afile'), 'ignore');

    // Kiro expects xoch-*.md *files*; a non-"xoch-" entry and a same-named
    // directory are both left alone.
    fs.mkdirSync(kiroDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(kiroDir(ctx), 'not-ours.md'), 'ignore');
    fs.mkdirSync(path.join(kiroDir(ctx), 'xoch-adir.md'));

    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);

    assert.ok(fs.statSync(path.join(copilotDir(ctx), 'xoch-adir.prompt.md')).isDirectory());
    assert.ok(fs.existsSync(path.join(codexDir(ctx), 'not-ours')));
    assert.ok(fs.existsSync(path.join(codexDir(ctx), 'xoch-afile')));
    assert.ok(fs.existsSync(path.join(claudeDir(ctx), 'not-ours')));
    assert.ok(fs.existsSync(path.join(claudeDir(ctx), 'xoch-afile')));
    assert.ok(fs.existsSync(path.join(kiroDir(ctx), 'not-ours.md')));
    assert.ok(fs.statSync(path.join(kiroDir(ctx), 'xoch-adir.md')).isDirectory());
  } finally {
    cleanup(ctx);
  }
});

test('a non-prompt-related file in the Copilot directory is left alone', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.mkdirSync(copilotDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(copilotDir(ctx), 'unrelated.prompt.md'), 'not ours');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(fs.existsSync(path.join(copilotDir(ctx), 'unrelated.prompt.md')));
  } finally {
    cleanup(ctx);
  }
});

test('a fresh init seeds ~/.xoch/config.json with default token budgets', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Seeded 2 default token budget\(s\)/);
    const config = JSON.parse(fs.readFileSync(path.join(xochDir(ctx), 'config.json'), 'utf8'));
    assert.strictEqual(config.tokenBudgets.spec, 5000);
    assert.strictEqual(config.tokenBudgets.plan, 7000);
  } finally {
    cleanup(ctx);
  }
});

test('reiniting preserves an engineer-set token budget override', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    fs.mkdirSync(xochDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(xochDir(ctx), 'config.json'), JSON.stringify({ version: 1, tokenBudgets: { spec: 9999 } }));
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Seeded 1 default token budget\(s\)/);
    const config = JSON.parse(fs.readFileSync(path.join(xochDir(ctx), 'config.json'), 'utf8'));
    assert.strictEqual(config.tokenBudgets.spec, 9999);
    assert.strictEqual(config.tokenBudgets.plan, 7000);
  } finally {
    cleanup(ctx);
  }
});

test('reiniting with all default budgets already present reports nothing new was seeded', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    fs.mkdirSync(xochDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(xochDir(ctx), 'config.json'), JSON.stringify({ version: 1, tokenBudgets: { spec: 5000, plan: 7000 } }));
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Token budgets already present/);
  } finally {
    cleanup(ctx);
  }
});

test('seeding config.json tolerates a corrupt existing file by starting fresh', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx);
    fs.mkdirSync(xochDir(ctx), { recursive: true });
    fs.writeFileSync(path.join(xochDir(ctx), 'config.json'), 'not valid json{{{');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const config = JSON.parse(fs.readFileSync(path.join(xochDir(ctx), 'config.json'), 'utf8'));
    assert.strictEqual(config.tokenBudgets.spec, 5000);
    assert.strictEqual(config.tokenBudgets.plan, 7000);
  } finally {
    cleanup(ctx);
  }
});

// ---------------------------------------------------------------------
// {{xoch-config:...}} -- render-time conditional text keyed by a dotted
// ~/.xoch/config.json value, parallel to {{xoch-partial:...}}.
// ---------------------------------------------------------------------

function writeConfig(ctx, data) {
  fs.mkdirSync(xochDir(ctx), { recursive: true });
  fs.writeFileSync(path.join(xochDir(ctx), 'config.json'), JSON.stringify(data));
}

test('a config reference with a hyphenated variant key resolves correctly', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    writeConfig(ctx, { documentation: { commentMode: 'follow-convention' } });
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:documentation.commentMode always="Always text." follow-convention="Follow text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.strictEqual(rendered.trim(), 'Follow text.');
  } finally {
    cleanup(ctx);
  }
});

test('a config reference substitutes the text matching the resolved config value', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    writeConfig(ctx, { coverage: { strictness: 'required' } });
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:coverage.strictness required="Required text." recommended="Recommended text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.strictEqual(rendered.trim(), 'Required text.');
  } finally {
    cleanup(ctx);
  }
});

test('a multi-line config reference with the key on its own line substitutes correctly', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    writeConfig(ctx, { coverage: { strictness: 'required' } });
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:coverage.strictness\nrequired="Required text."\nrecommended="Recommended text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.strictEqual(rendered.trim(), 'Required text.');
  } finally {
    cleanup(ctx);
  }
});

test('a config reference substitutes different text for a different resolved config value', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    writeConfig(ctx, { coverage: { strictness: 'recommended' } });
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:coverage.strictness required="Required text." recommended="Recommended text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.strictEqual(rendered.trim(), 'Recommended text.');
  } finally {
    cleanup(ctx);
  }
});

test('a config reference with an unset config key falls back to its default text', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    // No config.json written at all -- the key is entirely unset.
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:coverage.strictness required="Required text." recommended="Recommended text." default="Fallback text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.strictEqual(rendered.trim(), 'Fallback text.');
  } finally {
    cleanup(ctx);
  }
});

test('a config reference whose resolved value has no matching variant and no default is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    writeConfig(ctx, { coverage: { strictness: 'bogus' } });
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:coverage.strictness required="Required text." recommended="Recommended text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /no text for config key 'coverage\.strictness' resolved to 'bogus'/);
  } finally {
    cleanup(ctx);
  }
});

test('a config reference with an unset key and no default is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:coverage.strictness required="Required text." recommended="Recommended text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /no text for config key 'coverage\.strictness' resolved to '\(unset\)'/);
  } finally {
    cleanup(ctx);
  }
});

test('an empty config reference body is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-config:   }}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /malformed prompt config reference/);
  } finally {
    cleanup(ctx);
  }
});

test('a config reference with an invalid key format is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-config:coverage/strictness required="x"}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /invalid prompt config key 'coverage\/strictness'/);
  } finally {
    cleanup(ctx);
  }
});

test('a config reference with no assignments at all has no text for its resolved value', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-config:coverage.strictness}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /no text for config key 'coverage\.strictness' resolved to '\(unset\)'/);
  } finally {
    cleanup(ctx);
  }
});

test('a dotted key with an absent segment in an existing config file resolves as unset', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    // config.json exists, but has no "coverage" key at all.
    writeConfig(ctx, { version: 1 });
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:coverage.strictness required="Required text." default="Fallback text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.strictEqual(rendered.trim(), 'Fallback text.');
  } finally {
    cleanup(ctx);
  }
});

test('a dotted key that walks past a non-object segment resolves as unset', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    // "coverage.strictness" resolves to the string "required" -- there is
    // no further object to walk "deep" into, so the whole key resolves
    // as unset rather than throwing.
    writeConfig(ctx, { coverage: { strictness: 'required' } });
    fs.writeFileSync(
      path.join(fixture.promptsDir, 'meow.md'),
      '{{xoch-config:coverage.strictness.deep required="Required text." default="Fallback text."}}\n'
    );
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 0);
    const rendered = fs.readFileSync(path.join(xochDir(ctx), 'prompts', 'meow.md'), 'utf8');
    assert.strictEqual(rendered.trim(), 'Fallback text.');
  } finally {
    cleanup(ctx);
  }
});

test('a config reference with a malformed variable assignment is rejected', () => {
  const ctx = scratch();
  try {
    const fixture = buildFixture(ctx, { withCore: false });
    fs.writeFileSync(path.join(fixture.promptsDir, 'meow.md'), '{{xoch-config:coverage.strictness 123bad="x"}}\n');
    const result = runInit(fixture, ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /malformed variable assignment/);
  } finally {
    cleanup(ctx);
  }
});

run();
