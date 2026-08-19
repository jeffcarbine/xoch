'use strict';

// Ruby's JSON.pretty_generate has two quirks JSON.stringify(value, null, 2)
// does not reproduce: an empty array renders as "[\n\n<indent>]" (with a
// blank line before the closing bracket) and an empty object renders as
// "{\n<indent>}" (no blank line, closing brace on its own indented line).
// Everything else matches JSON.stringify's 2-space-indent style exactly.
// Ported scripts that replace a Ruby heredoc's JSON.pretty_generate use
// this so their --json output stays byte-identical to the bash original.
function prettyGenerate(value, indent = 0) {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return `[\n\n${pad}]`;
    const items = value.map((item) => `${padInner}${prettyGenerate(item, indent + 1)}`);
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return `{\n${pad}}`;
    const items = keys.map((key) => `${padInner}${JSON.stringify(key)}: ${prettyGenerate(value[key], indent + 1)}`);
    return `{\n${items.join(',\n')}\n${pad}}`;
  }

  return JSON.stringify(value);
}

module.exports = { prettyGenerate };
