#!/usr/bin/env node
'use strict';

// Xoch CLI dispatcher.
//
// Every helper script under bin/ already exports a reusable main(argv) or
// run(argv) alongside its own `if (require.main === module)` CLI entry, so
// this dispatcher requires the right module in-process and forwards argv
// to it -- no subprocess spawning, and each script's own process.exit()
// calls terminate the shared process exactly as they would standalone.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isMainModule } from './lib/is-main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

// xoch-actions.js already speaks `<group> <action> ...rest` (job:current,
// state:set, file:write, ...) -- those groups become top-level `xoch
// <group> <action> ...` namespaces by forwarding argv untouched, group name
// included, since that's exactly the grammar xoch-actions.js's own main()
// expects.
const XOCH_ACTIONS_GROUPS = ['job', 'state', 'arc', 'pointer', 'workflow', 'snapshot', 'phase', 'file', 'discovery'];

// Namespace -> [module path relative to this file, exported function name].
// Each standalone script's own CLI grammar starts with its first real verb
// or flag, not a repeat of the script's name (e.g. archive-actions.js's own
// usage is `archive-actions.js restore ...`, not `archive restore ...`), so
// the namespace token itself is stripped before forwarding.
const STANDALONE_MODULES = {
  init: ['./init.js', 'main'],
  remove: ['./remove.js', 'remove'],
  verify: ['./remove.js', 'verify'],
  archive: ['./archive-actions.js', 'run'],
  'generate-id': ['./generate-job-id.js', 'main'],
  'docs-drift': ['./docs-drift.js', 'main'],
  'docs-target': ['./docs-target.js', 'main'],
  'git-state': ['./git-state.js', 'main'],
  gitignore: ['./gitignore-actions.js', 'main'],
  coverage: ['./coverage-actions.js', 'run'],
  'context-sync': ['./context-sync.js', 'main'],
  dependency: ['./dependency-actions.js', 'main'],
  readme: ['./readme-actions.js', 'main'],
  'project-scope': ['./project-scope.js', 'main'],
  'project-commands': ['./project-commands.js', 'main'],
  'token-estimator': ['./token-estimator.js', 'main'],
  help: ['./help-actions.js', 'main'],
  workspace: ['./workspace-actions.js', 'main'],
};

function usage() {
  console.log(`Usage:
  xoch <job|state|arc|pointer|workflow|snapshot|phase|file|discovery> ...   Deterministic job/workflow actions (see xoch-actions.js)
  xoch config ...                                                 Engineer-facing config: storage mode, documentation comment mode, token budgets, and config root lookup
  xoch init                                                       Render prompts and install skill files for Copilot, Codex, Claude Code, and Kiro
  xoch remove                                                     Reverse xoch init: remove installed skill files and ~/.xoch
  xoch verify                                                     Confirm the CLI and rendered prompts are correctly in place
  xoch archive ...
  xoch generate-id [--id ID]
  xoch docs-drift ...
  xoch docs-target ...
  xoch git-state ...
  xoch gitignore ...
  xoch coverage ...
  xoch context-sync ...
  xoch dependency ...
  xoch readme ...
  xoch project-scope ...
  xoch project-commands ...
  xoch token-estimator ...
  xoch help ...
  xoch workspace ...
  xoch --version                                                  Print the installed package version
  xoch -h, --help                                                 Print this usage`);
}

// `config` is the one namespace that isn't a pure forward: xoch-actions.js
// already owns `config:root` (the storage-root lookup), while every other
// config concern (storage mode, documentation comment mode, token budgets,
// interactive setup) lives in the root-level config.js. Merging both under
// one `xoch config` namespace reads as "everything about my Xoch config"
// instead of splitting the root lookup into an oddly-named separate command.
async function runConfig(rest) {
  if (rest[0] === 'root') {
    (await import('./xoch-actions.js')).main(['config', 'root']);
    return;
  }
  (await import('../config.js')).main(rest);
}

async function main(argv) {
  const [first, ...rest] = argv;

  if (!first || first === '-h' || first === '--help') {
    usage();
    if (!first) process.exit(1);
    return;
  }

  if (first === '--version') {
    console.log(pkg.version);
    return;
  }

  if (XOCH_ACTIONS_GROUPS.includes(first)) {
    (await import('./xoch-actions.js')).main(argv);
    return;
  }

  if (first === 'config') {
    await runConfig(rest);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(STANDALONE_MODULES, first)) {
    const [modulePath, fnName] = STANDALONE_MODULES[first];
    (await import(modulePath))[fnName](rest);
    return;
  }

  process.stderr.write(`Error: unknown command: ${first}\n`);
  process.exit(1);
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}

export { main, usage, runConfig, XOCH_ACTIONS_GROUPS, STANDALONE_MODULES };
