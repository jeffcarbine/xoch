'use strict';

const { spawnSync } = require('child_process');

// Runs `git -C <root> <args>` via spawnSync with an argv array (no shell,
// no string interpolation) -- unlike bash originals that build the command
// with backticks + shellescape. Returns trimmed stdout, or "" if git exits
// non-zero (matching the bash originals' `2>/dev/null` + empty-on-failure
// behavior).
function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.status !== 0) return '';
  return (result.stdout || '').trim();
}

module.exports = { git };
