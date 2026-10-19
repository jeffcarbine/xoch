'use strict';

// Xoch Install Targets
// The AI tools `xoch init` installs prompts into, and everything that
// differs between them: where their files live, what an installed prompt
// looks like, how it's written, and what to tell the engineer afterwards.
// init.js, remove.js, prompt-check.js, and the help text all loop over
// INSTALL_TARGETS rather than naming tools themselves, so adding, dropping,
// or reordering a tool is a change to this file alone.

import fs from 'fs';
import path from 'path';
import os from 'os';

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

/**
 * One AI tool Xoch installs prompts into.
 * @typedef {object} InstallTarget
 * @property {string} id stable identifier
 * @property {string} label short name used in progress and removal lines
 * @property {string} installHeading name used in "Installing for ..." lines
 * @property {string} dirDescription what the folder is, for "... directory not found"
 * @property {string[]} homeDir folder path segments under the home directory
 * @property {string} suffix appended to `xoch-<prompt>` to name an installed entry
 * @property {(p: string) => boolean} isEntry whether `p` has the shape of an installed entry
 * @property {(p: string) => void} removeEntry deletes one installed entry
 * @property {(promptFile: string, filename: string, dir: string) => void} install
 *   writes one rendered prompt into the tool's folder
 * @property {string[]} usage lines printed after init, telling the engineer how to invoke a prompt
 * @property {(dir: string, promptName: string) => (string|null)} [verify]
 *   extra check of an installed prompt; returns a failure message or null
 */

const unlinkEntry = (p) => fs.unlinkSync(p);
const rmEntry = (p) => fs.rmSync(p, { recursive: true, force: true });

/** @type {InstallTarget} */
export const COPILOT = {
  id: 'copilot',
  label: 'Copilot',
  installHeading: 'GitHub Copilot',
  dirDescription: 'VS Code prompts',
  homeDir: ['Library', 'Application Support', 'Code', 'User', 'prompts'],
  suffix: '.prompt.md',
  isEntry: isFileOrSymlink,
  removeEntry: unlinkEntry,
  install(promptFile, filename, dir) {
    const target = path.join(dir, `xoch-${filename}.prompt.md`);
    if (isFileOrSymlink(target)) fs.unlinkSync(target);
    fs.symlinkSync(promptFile, target);
  },
  usage: [
    'GitHub Copilot: Type #xoch-meow in chat',
    'Cursor: Type #xoch-meow in chat (uses VS Code prompts)',
  ],
};

/** @type {InstallTarget} */
export const CODEX = {
  id: 'codex',
  label: 'Codex',
  installHeading: 'Codex',
  dirDescription: 'Codex skills',
  homeDir: ['.codex', 'skills'],
  suffix: '',
  isEntry: isDirNoFollow,
  removeEntry: rmEntry,
  install(promptFile, filename, dir) {
    const skillDir = path.join(dir, `xoch-${filename}`);

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
  },
  usage: ['Codex: Type $xoch-meow in chat'],
};

/** @type {InstallTarget} */
export const CLAUDE = {
  id: 'claude',
  label: 'Claude Code',
  installHeading: 'Claude Code',
  dirDescription: 'Claude Code skills',
  homeDir: ['.claude', 'skills'],
  suffix: '',
  isEntry: isDirNoFollow,
  removeEntry: rmEntry,
  install(promptFile, filename, dir) {
    const skillDir = path.join(dir, `xoch-${filename}`);

    fs.mkdirSync(skillDir, { recursive: true });

    // Xoch lifecycle commands should only run when the engineer invokes them.
    const rendered = injectFrontmatterLine(fs.readFileSync(promptFile, 'utf8'), 'disable-model-invocation: true');
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), rendered);
  },
  usage: ['Claude Code: Type /xoch-meow in chat'],
  verify(dir, promptName) {
    const claudeSkill = path.join(dir, `xoch-${promptName}`, 'SKILL.md');
    if (!fs.existsSync(claudeSkill)) return `missing Claude skill xoch-${promptName}`;
    const content = fs.readFileSync(claudeSkill, 'utf8');
    if (!/^disable-model-invocation: true$/m.test(content)) {
      return `Claude skill xoch-${promptName} permits model invocation`;
    }
    return null;
  },
};

/** @type {InstallTarget} */
export const KIRO = {
  id: 'kiro',
  label: 'Kiro',
  installHeading: 'Kiro',
  dirDescription: 'Kiro steering',
  homeDir: ['.kiro', 'steering'],
  suffix: '.md',
  isEntry: (p) => fs.statSync(p).isFile(),
  removeEntry: unlinkEntry,
  install(promptFile, filename, dir) {
    const target = path.join(dir, `xoch-${filename}.md`);

    // Kiro only surfaces a steering file as an on-demand slash command with inclusion: manual.
    const rendered = injectFrontmatterLine(fs.readFileSync(promptFile, 'utf8'), 'inclusion: manual');
    fs.writeFileSync(target, rendered);
  },
  usage: ['Kiro: Type #xoch-meow in chat'],
};

// Kept on one line so a downstream rebrand can swap the whole list with a
// single literal find/replace.
export const INSTALL_TARGETS = [COPILOT, CODEX, CLAUDE, KIRO];

/**
 * The folder a target installs into, under `home`.
 * @param {InstallTarget} target
 * @param {string} [home]
 * @returns {string}
 */
export function targetDir(target, home = os.homedir()) {
  return path.join(home, ...target.homeDir);
}

/**
 * The installed entry name for a prompt, e.g. `xoch-open.prompt.md`.
 * @param {InstallTarget} target
 * @param {string} promptName prompt file name without `.md`
 * @returns {string}
 */
export function installedName(target, promptName) {
  return `xoch-${promptName}${target.suffix}`;
}

/**
 * Join target labels into prose: "Copilot, Codex, Claude Code, and Kiro".
 * @param {InstallTarget[]} targets
 * @param {'and'|'or'} joiner
 * @returns {string}
 */
export function formatTargetLabels(targets, joiner) {
  const type = joiner === 'or' ? 'disjunction' : 'conjunction';
  return new Intl.ListFormat('en', { style: 'long', type }).format(targets.map((t) => t.label));
}

export { isFileOrSymlink, isDirNoFollow, injectFrontmatterLine };
