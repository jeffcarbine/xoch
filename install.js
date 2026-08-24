#!/usr/bin/env node
'use strict';

// XochDev Installer
// Installs rendered Xoch prompts for Copilot, Codex, Claude Code, and Kiro.

const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_DIR = __dirname;
const PROMPTS_SOURCE_DIR = path.join(SCRIPT_DIR, 'prompts');
const CORE_PROMPTS_SOURCE_DIR = path.join(PROMPTS_SOURCE_DIR, 'core');
const BIN_SOURCE_DIR = path.join(SCRIPT_DIR, 'bin');
const XOCH_RUNTIME_DIR = path.join(os.homedir(), '.xoch');
const PROMPTS_DIR = path.join(XOCH_RUNTIME_DIR, 'prompts');
const CORE_PROMPTS_DIR = path.join(PROMPTS_DIR, 'core');
const BIN_DIR = path.join(XOCH_RUNTIME_DIR, 'bin');
const CONFIG_PATH = path.join(XOCH_RUNTIME_DIR, 'config.json');

// Kept in sync by hand with bin/token-estimator.js's DEFAULT_SKILL_BUDGETS --
// the installed runtime can't require this root-level file, so the table is
// duplicated rather than shared across the install boundary.
const DEFAULT_SKILL_BUDGETS = { spec: 5000, plan: 7000 };

const COPILOT_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'prompts');
const CODEX_DIR = path.join(os.homedir(), '.codex', 'skills');
const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'skills');
const KIRO_DIR = path.join(os.homedir(), '.kiro', 'steering');

const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const RED = '\x1b[0;31m';
const NC = '\x1b[0m';

function failRender(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

// Parses the body of a {{xoch-partial:...}} reference: a partial path
// (first line, or first whitespace-delimited token if single-line),
// followed by zero or more `key="value"` assignments (multi-line if the
// body spans multiple lines). Matches render_prompt_file's ruby
// StringScanner-based parser exactly, including escaped-quote handling.
function parsePartial(rawBody, sourceFile) {
  const body = rawBody.trim();
  if (!body) failRender(`Error: malformed prompt partial in ${sourceFile}`);

  let partialPath;
  let assignments;
  if (body.includes('\n')) {
    const lines = body.split('\n').map((line) => line.replace(/\r$/, ''));
    const [firstLine, ...rest] = lines;
    partialPath = firstLine.trim();
    assignments = rest.join('\n');
  } else {
    // body is non-empty, trimmed, and single-line, so \S+ always matches.
    const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(body);
    partialPath = match[1];
    assignments = match[2] || '';
  }

  partialPath = partialPath.trim().replace(/^\.\//, '');
  if (!partialPath) failRender(`Error: missing prompt partial path in ${sourceFile}`);
  if (partialPath.startsWith('/') || partialPath.split('/').includes('..')) {
    failRender(`Error: invalid prompt partial path '${partialPath}' in ${sourceFile}`);
  }

  const vars = {};
  let i = 0;
  const len = assignments.length;
  const skipWs = () => {
    while (i < len && /\s/.test(assignments[i])) i += 1;
  };
  for (;;) {
    skipWs();
    if (i >= len) break;
    const keyMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(assignments.slice(i));
    if (!keyMatch) failRender(`Error: malformed variable assignment near '${assignments.slice(i)}' in ${sourceFile}`);
    const key = keyMatch[0];
    i += key.length;
    skipWs();
    if (assignments[i] !== '=') failRender(`Error: expected '=' after variable '${key}' in ${sourceFile}`);
    i += 1;
    skipWs();
    const valueMatch = /^"([^"\\]|\\.)*"/.exec(assignments.slice(i));
    if (!valueMatch) failRender(`Error: expected quoted value for variable '${key}' in ${sourceFile}`);
    const rawValue = valueMatch[0];
    i += rawValue.length;
    vars[key] = rawValue.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  return [partialPath, vars];
}

function renderPromptFile(promptsSourceDir, sourceFile, outputFile) {
  const partialsDir = path.join(promptsSourceDir, 'partials');
  let source;
  try {
    source = fs.readFileSync(sourceFile, 'utf8');
  } catch (e) {
    failRender(`Error rendering ${sourceFile}: ${e.message}`);
    return;
  }

  try {
    const rendered = source.replace(/\{\{xoch-partial:(.*?)\}\}/gs, (match, rawBody) => {
      const [partialPath, vars] = parsePartial(rawBody, sourceFile);
      const partialFile = path.join(partialsDir, partialPath);
      if (!fs.existsSync(partialFile) || !fs.statSync(partialFile).isFile()) {
        failRender(`Error: prompt partial not found: ${partialFile}`);
      }
      let partialText = fs.readFileSync(partialFile, 'utf8');
      const used = new Set();
      partialText = partialText.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (m, key) => {
        if (!(key in vars)) failRender(`Error: missing variable '${key}' for partial '${partialPath}' in ${sourceFile}`);
        used.add(key);
        return vars[key];
      });
      const unused = Object.keys(vars).filter((key) => !used.has(key));
      if (unused.length) {
        process.stderr.write(`Warning: unused variable(s) for partial '${partialPath}' in ${sourceFile}: ${unused.join(', ')}\n`);
      }
      return partialText;
    });
    fs.writeFileSync(outputFile, rendered);
  } catch (e) {
    failRender(`Error rendering ${sourceFile}: ${e.message}`);
  }
}

// Every caller (renderPrompts' two listings, each install* function's own
// listing of the already-rendered PROMPTS_DIR) only calls this once its
// own existence has already been established.
function listMdFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(dir, name))
    .filter((full) => fs.statSync(full).isFile());
}

function hasUnresolvedPartial(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasUnresolvedPartial(full)) return true;
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (fs.readFileSync(full, 'utf8').includes('{{xoch-partial:')) return true;
    }
  }
  return false;
}

function renderPrompts() {
  console.log('Rendering prompts...');

  fs.rmSync(PROMPTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(PROMPTS_DIR, { recursive: true });

  // README is excluded here, and only here -- every install* function's
  // own listMdFiles(PROMPTS_DIR) scan already reads this filtered output,
  // so none of them need their own redundant README check.
  for (const promptFile of listMdFiles(PROMPTS_SOURCE_DIR)) {
    const filename = path.basename(promptFile, '.md');
    if (filename === 'README') continue;
    renderPromptFile(PROMPTS_SOURCE_DIR, promptFile, path.join(PROMPTS_DIR, `${filename}.md`));
  }

  if (fs.existsSync(CORE_PROMPTS_SOURCE_DIR) && fs.statSync(CORE_PROMPTS_SOURCE_DIR).isDirectory()) {
    fs.mkdirSync(CORE_PROMPTS_DIR, { recursive: true });
    for (const coreFile of listMdFiles(CORE_PROMPTS_SOURCE_DIR)) {
      const filename = path.basename(coreFile, '.md');
      renderPromptFile(PROMPTS_SOURCE_DIR, coreFile, path.join(CORE_PROMPTS_DIR, `${filename}.md`));
    }
  }

  if (hasUnresolvedPartial(PROMPTS_DIR)) {
    console.error(`${RED}Error: unresolved prompt partial found in rendered prompts${NC}`);
    process.exit(1);
  }

  const renderedCount = listMdFiles(PROMPTS_DIR).length;
  const coreRenderedCount = fs.existsSync(CORE_PROMPTS_DIR) ? listMdFiles(CORE_PROMPTS_DIR).length : 0;
  console.log(`  ${GREEN}✓${NC} Rendered prompts -> ${PROMPTS_DIR} (${renderedCount} files, ${coreRenderedCount} core)`);
  console.log('');
}

// Ash additionally copies bin/lib/*.js -- a concept the bash original
// never had, since its "shared" logic was inline ruby heredocs rather
// than separate required modules. Without copying lib/, the installed
// top-level scripts would fail to require() their dependencies.
function installHelpers() {
  console.log('Installing helper scripts...');

  fs.rmSync(BIN_DIR, { recursive: true, force: true });
  fs.mkdirSync(BIN_DIR, { recursive: true });

  if (!fs.existsSync(BIN_SOURCE_DIR)) {
    console.log(`  ${YELLOW}No bin/ directory found; skipping helpers${NC}`);
    console.log('');
    return;
  }

  let helperCount = 0;
  for (const name of fs.readdirSync(BIN_SOURCE_DIR)) {
    const full = path.join(BIN_SOURCE_DIR, name);
    if (!fs.statSync(full).isFile() || !name.endsWith('.js')) continue;
    const dest = path.join(BIN_DIR, name);
    fs.copyFileSync(full, dest);
    fs.chmodSync(dest, 0o755);
    helperCount += 1;
    console.log(`  ${GREEN}✓${NC} ${name} → ${BIN_DIR}`);
  }

  const libSourceDir = path.join(BIN_SOURCE_DIR, 'lib');
  if (fs.existsSync(libSourceDir)) {
    const libDir = path.join(BIN_DIR, 'lib');
    fs.mkdirSync(libDir, { recursive: true });
    for (const name of fs.readdirSync(libSourceDir)) {
      const full = path.join(libSourceDir, name);
      if (!fs.statSync(full).isFile() || !name.endsWith('.js')) continue;
      fs.copyFileSync(full, path.join(libDir, name));
      helperCount += 1;
      console.log(`  ${GREEN}✓${NC} lib/${name} → ${path.join(BIN_DIR, 'lib')}`);
    }
  }

  if (helperCount === 0) {
    console.log(`  ${YELLOW}No helper scripts found${NC}`);
  }
  console.log('');
}

// Ensures ~/.xoch/config.json exists and its tokenBudgets object has an
// entry for every skill in DEFAULT_SKILL_BUDGETS, without ever overwriting
// a value the engineer already set (by hand or via `node config.js`).
function seedConfig() {
  let data = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
      data = {};
    }
  }
  data.version = data.version || 1;
  data.tokenBudgets = data.tokenBudgets || {};

  let added = 0;
  for (const [skill, value] of Object.entries(DEFAULT_SKILL_BUDGETS)) {
    if (!(skill in data.tokenBudgets)) {
      data.tokenBudgets[skill] = value;
      added += 1;
    }
  }

  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(data, null, 2)}\n`);

  if (added > 0) {
    console.log(`${GREEN}✓${NC} Seeded ${added} default token budget(s) in ${CONFIG_PATH}`);
  } else {
    console.log(`${GREEN}✓${NC} Token budgets already present in ${CONFIG_PATH}`);
  }
  console.log('');
}

// True if `p` is a regular file OR any symlink (valid or broken),
// matching bash's `[ -f "$p" ] || [ -L "$p" ]`.
function isFileOrSymlink(p) {
  try {
    const lst = fs.lstatSync(p);
    return lst.isSymbolicLink() || lst.isFile();
  } catch {
    return false;
  }
}

function isDirNoFollow(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// Inserts `line` immediately above the frontmatter-closing "---" (only
// when line 1 opens frontmatter and a later line closes it) -- matches
// the bash originals' awk scans exactly, including files with no
// frontmatter or unclosed frontmatter passing through unchanged.
function injectFrontmatterLine(text, line) {
  const lines = text.split('\n');
  let inFrontmatter = false;
  const out = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    const current = lines[idx];
    if (idx === 0 && current === '---') {
      inFrontmatter = true;
      out.push(current);
      continue;
    }
    if (inFrontmatter && current === '---') {
      out.push(line);
      inFrontmatter = false;
      out.push(current);
      continue;
    }
    out.push(current);
  }
  return out.join('\n');
}

function cleanupCopilot() {
  if (!isDirNoFollow(COPILOT_DIR)) return;

  let removed = 0;
  for (const name of fs.readdirSync(COPILOT_DIR)) {
    if (!name.startsWith('xoch-') || !name.endsWith('.prompt.md')) continue;
    const installedPath = path.join(COPILOT_DIR, name);
    if (!isFileOrSymlink(installedPath)) continue;

    const installedName = name.slice('xoch-'.length, -'.prompt.md'.length);
    const sourceExists = fs.existsSync(path.join(PROMPTS_DIR, `${installedName}.md`));
    if (installedName === 'README' || !sourceExists) {
      fs.unlinkSync(installedPath);
      console.log(`  ${YELLOW}✗${NC} Removed orphaned: xoch-${installedName}`);
      removed += 1;
    }
  }

  if (removed > 0) console.log('');
}

function cleanupCodex() {
  if (!isDirNoFollow(CODEX_DIR)) return;

  let removed = 0;
  for (const name of fs.readdirSync(CODEX_DIR)) {
    if (!name.startsWith('xoch-')) continue;
    const installedPath = path.join(CODEX_DIR, name);
    if (!isDirNoFollow(installedPath)) continue;

    const installedName = name.slice('xoch-'.length);
    const sourceExists = fs.existsSync(path.join(PROMPTS_DIR, `${installedName}.md`));
    if (installedName === 'README' || !sourceExists) {
      fs.rmSync(installedPath, { recursive: true, force: true });
      console.log(`  ${YELLOW}✗${NC} Removed orphaned: xoch-${installedName}`);
      removed += 1;
    }
  }

  if (removed > 0) console.log('');
}

function cleanupClaude() {
  if (!isDirNoFollow(CLAUDE_DIR)) return;

  let removed = 0;
  for (const name of fs.readdirSync(CLAUDE_DIR)) {
    if (!name.startsWith('xoch-')) continue;
    const installedPath = path.join(CLAUDE_DIR, name);
    if (!isDirNoFollow(installedPath)) continue;

    const installedName = name.slice('xoch-'.length);
    const sourceExists = fs.existsSync(path.join(PROMPTS_DIR, `${installedName}.md`));
    if (installedName === 'README' || !sourceExists) {
      fs.rmSync(installedPath, { recursive: true, force: true });
      console.log(`  ${YELLOW}✗${NC} Removed orphaned: xoch-${installedName}`);
      removed += 1;
    }
  }

  if (removed > 0) console.log('');
}

function cleanupKiro() {
  if (!isDirNoFollow(KIRO_DIR)) return;

  let removed = 0;
  for (const name of fs.readdirSync(KIRO_DIR)) {
    if (!name.startsWith('xoch-') || !name.endsWith('.md')) continue;
    const installedPath = path.join(KIRO_DIR, name);
    if (!fs.statSync(installedPath).isFile()) continue;

    const installedName = name.slice('xoch-'.length, -'.md'.length);
    const sourceExists = fs.existsSync(path.join(PROMPTS_DIR, `${installedName}.md`));
    if (installedName === 'README' || !sourceExists) {
      fs.unlinkSync(installedPath);
      console.log(`  ${YELLOW}✗${NC} Removed orphaned: xoch-${installedName}`);
      removed += 1;
    }
  }

  if (removed > 0) console.log('');
}

function installCopilot() {
  if (!isDirNoFollow(COPILOT_DIR)) {
    console.log(`${YELLOW}VS Code prompts directory not found. Creating...${NC}`);
    fs.mkdirSync(COPILOT_DIR, { recursive: true });
  }

  console.log('Installing for GitHub Copilot...');

  for (const promptFile of listMdFiles(PROMPTS_DIR)) {
    const filename = path.basename(promptFile, '.md');
    const target = path.join(COPILOT_DIR, `xoch-${filename}.prompt.md`);

    if (isFileOrSymlink(target)) fs.unlinkSync(target);
    fs.symlinkSync(promptFile, target);
    console.log(`  ${GREEN}✓${NC} xoch-${filename} → Copilot`);
  }
}

function installCodex() {
  if (!isDirNoFollow(CODEX_DIR)) {
    console.log(`${YELLOW}Codex skills directory not found. Creating...${NC}`);
    fs.mkdirSync(CODEX_DIR, { recursive: true });
  }

  console.log('Installing for Codex...');

  for (const promptFile of listMdFiles(PROMPTS_DIR)) {
    const filename = path.basename(promptFile, '.md');
    const skillDir = path.join(CODEX_DIR, `xoch-${filename}`);

    fs.mkdirSync(path.join(skillDir, 'agents'), { recursive: true });

    // Copy (not symlink) the prompt as SKILL.md for Codex -- Codex
    // appears to not discover symlinked files.
    fs.copyFileSync(promptFile, path.join(skillDir, 'SKILL.md'));

    const promptText = fs.readFileSync(promptFile, 'utf8');
    const nameLine = promptText.split('\n').find((line) => line.startsWith('name:')) || '';
    const descLine = promptText.split('\n').find((line) => line.startsWith('description:')) || '';
    const skillName = nameLine.replace('name: ', '');
    const skillDesc = descLine.replace('description: ', '');

    const openaiYaml = `interface:\n  display_name: "Xoch ${filename}"\n  short_description: "${skillDesc}"\n  default_prompt: "Use $${skillName} to invoke this Xoch workflow step."\n`;
    fs.writeFileSync(path.join(skillDir, 'agents', 'openai.yaml'), openaiYaml);

    console.log(`  ${GREEN}✓${NC} xoch-${filename} → Codex`);
  }
}

function installClaude() {
  if (!isDirNoFollow(CLAUDE_DIR)) {
    console.log(`${YELLOW}Claude Code skills directory not found. Creating...${NC}`);
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  console.log('Installing for Claude Code...');

  for (const promptFile of listMdFiles(PROMPTS_DIR)) {
    const filename = path.basename(promptFile, '.md');
    const skillDir = path.join(CLAUDE_DIR, `xoch-${filename}`);

    fs.mkdirSync(skillDir, { recursive: true });

    // Xoch lifecycle commands should only run when the engineer invokes them.
    const rendered = injectFrontmatterLine(fs.readFileSync(promptFile, 'utf8'), 'disable-model-invocation: true');
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), rendered);

    console.log(`  ${GREEN}✓${NC} xoch-${filename} → Claude Code`);
  }
}

function installKiro() {
  if (!isDirNoFollow(KIRO_DIR)) {
    console.log(`${YELLOW}Kiro steering directory not found. Creating...${NC}`);
    fs.mkdirSync(KIRO_DIR, { recursive: true });
  }

  console.log('Installing for Kiro...');

  for (const promptFile of listMdFiles(PROMPTS_DIR)) {
    const filename = path.basename(promptFile, '.md');
    const target = path.join(KIRO_DIR, `xoch-${filename}.md`);

    // Kiro only surfaces a steering file as an on-demand slash command with inclusion: manual.
    const rendered = injectFrontmatterLine(fs.readFileSync(promptFile, 'utf8'), 'inclusion: manual');
    fs.writeFileSync(target, rendered);

    console.log(`  ${GREEN}✓${NC} xoch-${filename} → Kiro`);
  }
}

function main() {
  console.log('XochDev Installer');
  console.log('====================');
  console.log('');

  if (!fs.existsSync(PROMPTS_SOURCE_DIR)) {
    console.error(`${RED}Error: prompts/ directory not found${NC}`);
    process.exit(1);
  }

  const promptCount = listMdFiles(PROMPTS_SOURCE_DIR).filter((f) => path.basename(f) !== 'README.md').length;
  console.log(`Found ${promptCount} prompt(s) to install`);
  console.log('');

  console.log('');
  installHelpers();
  seedConfig();
  renderPrompts();
  cleanupCopilot();
  cleanupCodex();
  cleanupClaude();
  cleanupKiro();
  installCopilot();
  console.log('');
  installCodex();
  console.log('');
  installClaude();
  console.log('');
  installKiro();

  console.log('');
  console.log(`${GREEN}Installation complete!${NC}`);
  console.log('');
  console.log('Usage:');
  console.log('  GitHub Copilot: Type #xoch-meow in chat');
  console.log('  Codex: Type $xoch-meow in chat');
  console.log('  Claude Code: Type /xoch-meow in chat');
  console.log('  Cursor: Type #xoch-meow in chat (uses VS Code prompts)');
  console.log('  Kiro: Type #xoch-meow in chat');
  console.log('');
  console.log("Note: You may need to restart your AI tool if its skills directory was just created.");
}

if (require.main === module) {
  main();
}

module.exports = {
  SCRIPT_DIR,
  PROMPTS_SOURCE_DIR,
  CORE_PROMPTS_SOURCE_DIR,
  BIN_SOURCE_DIR,
  XOCH_RUNTIME_DIR,
  PROMPTS_DIR,
  CORE_PROMPTS_DIR,
  BIN_DIR,
  COPILOT_DIR,
  CODEX_DIR,
  CLAUDE_DIR,
  KIRO_DIR,
  renderPromptFile,
  renderPrompts,
  installHelpers,
  seedConfig,
  listMdFiles,
  hasUnresolvedPartial,
  injectFrontmatterLine,
  cleanupCopilot,
  cleanupCodex,
  cleanupClaude,
  cleanupKiro,
  installCopilot,
  installCodex,
  installClaude,
  installKiro,
  main,
};
