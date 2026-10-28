'use strict';

// Shared field validation for the JSON shape classes (job state, phases,
// arc state, arc jobs, current pointer). Each class declares its known
// fields as name -> kind and runs them through checkField, so every shape
// reports problems the same way: "<label>: <field> must be <kind>".

/** Error raised when a JSON document doesn't match its expected shape. */
class ShapeError extends Error {
  /**
   * @param {string} message - What is wrong, naming the document and field.
   */
  constructor(message) {
    super(message);
    this.name = 'ShapeError';
  }
}

const isString = (v) => typeof v === 'string';
const isInt = (v) => Number.isInteger(v);
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Built-in field kinds. A trailing "?" also allows null.
const KINDS = {
  string: { test: isString, label: 'a string' },
  'string?': { test: (v) => v === null || isString(v), label: 'a string or null' },
  int: { test: isInt, label: 'an integer' },
  'int?': { test: (v) => v === null || isInt(v), label: 'an integer or null' },
  strings: { test: (v) => Array.isArray(v) && v.every(isString), label: 'a list of strings' },
  'object?': { test: (v) => v === null || isPlainObject(v), label: 'an object or null' },
};

/**
 * Checks one field's value against a kind name from KINDS, or against a
 * custom predicate for shapes the built-in kinds don't cover.
 * @param {string} label - Document name used in the error message.
 * @param {string} field - Field name used in the error message.
 * @param {*} value - Value to check.
 * @param {string|function(*): boolean} kind - Kind name or predicate.
 * @throws {ShapeError} When the value doesn't match.
 * @throws {Error} When `kind` names no known kind (a programming error).
 */
function checkField(label, field, value, kind) {
  if (typeof kind === 'function') {
    if (!kind(value)) throw new ShapeError(`${label}: ${field} is invalid`);
    return;
  }
  const spec = KINDS[kind];
  if (!spec) throw new Error(`unknown field kind: ${kind}`);
  if (!spec.test(value)) throw new ShapeError(`${label}: ${field} must be ${spec.label}`);
}

/**
 * Checks every declared field present in `data`; undeclared fields pass.
 * @param {string} label - Document name used in error messages.
 * @param {Object} data - Document to check.
 * @param {Object<string, string|function>} fields - Field name -> kind.
 * @throws {ShapeError} On the first mismatching field.
 */
function checkFields(label, data, fields) {
  for (const [field, kind] of Object.entries(fields)) {
    if (Object.prototype.hasOwnProperty.call(data, field)) checkField(label, field, data[field], kind);
  }
}

/**
 * Requires `data` to be a plain object.
 * @param {string} label - Document name used in the error message.
 * @param {*} data - Value to check.
 * @throws {ShapeError} When it isn't a plain object.
 */
function requireObject(label, data) {
  if (!isPlainObject(data)) throw new ShapeError(`${label} must be a JSON object`);
}

/**
 * Deep-copies plain JSON data so callers never share mutable state with a
 * shape instance.
 * @param {*} value - JSON-compatible value.
 * @returns {*} An independent copy.
 */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Today's date as YYYY-MM-DD in local time, matching the dates Xoch has
 * always written into state.
 * @returns {string}
 */
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export {
  ShapeError, checkField, checkFields, requireObject, isPlainObject, isString, clone, today,
};
