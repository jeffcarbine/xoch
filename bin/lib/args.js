'use strict';

// Minimal custom flag parser -- no external dependencies. `booleanFlags`
// lists flag names that take no value (e.g. "json", "adopt-active");
// everything else consumes the following argv entry as its value.
function parseFlags(argv, booleanFlags = []) {
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      if (booleanFlags.includes(name)) {
        flags[name] = true;
        i += 1;
      } else {
        flags[name] = argv[i + 1];
        i += 2;
      }
    } else {
      i += 1;
    }
  }
  return flags;
}

module.exports = { parseFlags };
