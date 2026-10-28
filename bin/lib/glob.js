'use strict';

// Minimal glob matching for conventions rule scopes -- no external
// dependencies, and `path.matchesGlob` needs Node 22+. Supports `*` (any
// characters within one path segment), `**` (any number of segments,
// including none), `?` (one character other than `/`), and a leading `!`
// to exclude. Paths are repo-relative with forward slashes; dotfiles are
// matched like any other name.

/**
 * Compile a glob pattern (without any leading `!`) to an anchored RegExp.
 * @param {string} pattern
 * @returns {RegExp}
 */
function globToRegExp(pattern) {
  let source = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        source += '(?:.*/)?';
        i += 3;
      } else {
        source += '.*';
        i += 2;
      }
    } else if (ch === '*') {
      source += '[^/]*';
      i += 1;
    } else if (ch === '?') {
      source += '[^/]';
      i += 1;
    } else {
      source += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${source}$`);
}

/**
 * Whether a repo-relative path matches a single glob pattern.
 * @param {string} file
 * @param {string} pattern
 * @returns {boolean}
 */
function matchesGlob(file, pattern) {
  return globToRegExp(pattern).test(file);
}

/**
 * Whether a file is in a rule's scope: it matches at least one positive
 * pattern (or there are none) and no `!` exclusion. A missing or empty
 * scope covers every file.
 * @param {string} file
 * @param {string[]|undefined} scope
 * @returns {boolean}
 */
function inScope(file, scope) {
  if (!scope || scope.length === 0) return true;
  const positives = scope.filter((p) => !p.startsWith('!'));
  const exclusions = scope.filter((p) => p.startsWith('!')).map((p) => p.slice(1));
  const included = positives.length === 0 || positives.some((p) => matchesGlob(file, p));
  return included && !exclusions.some((p) => matchesGlob(file, p));
}

export { globToRegExp, matchesGlob, inScope };
