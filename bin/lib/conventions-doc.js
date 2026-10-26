'use strict';

// Parser for a project's conventions document (<storage root>/docs/
// conventions.md). The file stays readable Markdown, but rules follow a
// fixed shape so the CLI can filter them deterministically:
//
//   ---                          optional frontmatter, `key: value` lines;
//   retired_ids: [CV-003]        `[a, b]` lists, booleans, and integers are typed
//   ---
//   ## Category                  groups the rules below it
//   ### CV-015: Statement        one rule per heading
//   - scope: test/**/*.test.js   comma-separated globs; omitted means `**`
//   - status: confirmed          confirmed | inferred
//   - confidence: high           high | medium | low
//   - evidence: 7 occurrences    free text, optional
//
// Anything else (prose, other headings) is ignored. Malformed rules throw
// a ConventionsParseError naming the 1-based line, so a hand-edited file
// fails loudly instead of silently dropping a rule.

const RULE_FIELDS = ['scope', 'status', 'confidence', 'evidence'];
const STATUSES = ['confirmed', 'inferred'];
const CONFIDENCES = ['high', 'medium', 'low'];

class ConventionsParseError extends Error {
  /**
   * @param {number} line - 1-based line number of the problem.
   * @param {string} message
   */
  constructor(line, message) {
    super(`line ${line}: ${message}`);
    this.name = 'ConventionsParseError';
    this.line = line;
  }
}

function frontmatterValue(raw) {
  const list = raw.match(/^\[(.*)\]$/);
  if (list) return list[1].split(',').map((item) => item.trim()).filter(Boolean);
  if (raw === 'true' || raw === 'false') return raw === 'true';
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

// Returns the parsed frontmatter and the index of the first body line.
function parseFrontmatter(lines) {
  if (lines[0] !== '---') return { frontmatter: {}, bodyStart: 0 };
  const end = lines.indexOf('---', 1);
  if (end === -1) throw new ConventionsParseError(1, 'frontmatter is not closed with ---');
  const frontmatter = {};
  for (let i = 1; i < end; i += 1) {
    if (lines[i].trim() === '') continue;
    const pair = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!pair) throw new ConventionsParseError(i + 1, `expected "key: value" in frontmatter, got "${lines[i]}"`);
    frontmatter[pair[1]] = frontmatterValue(pair[2].trim());
  }
  return { frontmatter, bodyStart: end + 1 };
}

function finishRule(rule) {
  if (!rule) return;
  for (const field of ['status', 'confidence']) {
    if (!rule[field]) throw new ConventionsParseError(rule.line, `${rule.id} is missing its ${field}`);
  }
}

function setRuleField(rule, key, value, lineNo) {
  if (!RULE_FIELDS.includes(key)) {
    throw new ConventionsParseError(lineNo, `unknown rule field "${key}" (expected ${RULE_FIELDS.join(', ')})`);
  }
  if (key === 'status' && !STATUSES.includes(value)) {
    throw new ConventionsParseError(lineNo, `invalid status "${value}" (expected ${STATUSES.join(' or ')})`);
  }
  if (key === 'confidence' && !CONFIDENCES.includes(value)) {
    throw new ConventionsParseError(lineNo, `invalid confidence "${value}" (expected ${CONFIDENCES.join(', ')})`);
  }
  rule[key] = key === 'scope' ? value.split(',').map((p) => p.trim()).filter(Boolean) : value;
}

/**
 * Parse a conventions document.
 * @param {string} text
 * @returns {{frontmatter: object, rules: Array<{id: string, statement: string, category: string|null,
 *   scope: string[], status: string, confidence: string, evidence: string|null}>}}
 * @throws {ConventionsParseError}
 */
function parseConventions(text) {
  const lines = text.split(/\r?\n/);
  const { frontmatter, bodyStart } = parseFrontmatter(lines);
  const retired = Array.isArray(frontmatter.retired_ids) ? frontmatter.retired_ids : [];
  const rules = [];
  const seen = new Set();
  let category = null;
  let rule = null;

  for (let i = bodyStart; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;
    if (line.startsWith('#')) {
      finishRule(rule);
      rule = null;
      if (line.startsWith('### ')) {
        const heading = line.match(/^### (CV-\d{3,}):\s*(.+)$/);
        if (!heading) throw new ConventionsParseError(lineNo, `rule heading must look like "### CV-001: Statement", got "${line}"`);
        const [, id, statement] = heading;
        if (seen.has(id)) throw new ConventionsParseError(lineNo, `duplicate rule ID ${id}`);
        if (retired.includes(id)) throw new ConventionsParseError(lineNo, `${id} is retired and cannot be reused`);
        seen.add(id);
        rule = {
          id, statement: statement.trim(), category, scope: ['**'], status: null, confidence: null, evidence: null, line: lineNo,
        };
        rules.push(rule);
      } else if (line.startsWith('## ')) {
        category = line.slice(3).trim();
      }
    } else if (rule && line.startsWith('- ')) {
      const field = line.match(/^- ([A-Za-z_]+):\s*(.*)$/);
      if (!field) throw new ConventionsParseError(lineNo, `expected "- field: value" under ${rule.id}, got "${line}"`);
      setRuleField(rule, field[1], field[2].trim(), lineNo);
    }
  }
  finishRule(rule);

  return {
    frontmatter,
    rules: rules.map(({ line, ...fields }) => fields),
  };
}

export { parseConventions, ConventionsParseError };
