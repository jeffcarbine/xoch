'use strict';

// Shared base for the flat, open-ended state documents -- a job's
// state.json and an arc's state.json. Both are a JSON object of known,
// typed fields plus any extra fields prompts record along the way (e.g.
// spec_status, qa_decision), which are kept rather than rejected.

import fs from 'fs';
import path from 'path';
import { readJsonStrict, writeJson } from './json-store.js';
import {
  ShapeError, checkField, checkFields, requireObject, clone,
} from './shape.js';

/**
 * Base class for a flat state document. Subclasses set the static
 * FILENAME, LABEL, REQUIRED (field names), FIELDS (name -> kind), and
 * implement static blankDefaults() returning the defaults for every known
 * optional field.
 */
class StateDocument {
  /**
   * @param {Object} data - Already-validated document data (owned by this instance).
   */
  constructor(data) {
    this.data = data;
  }

  /**
   * Builds an instance from parsed JSON, filling defaults for missing known
   * fields and validating everything present.
   * @param {*} data - Parsed JSON.
   * @returns {StateDocument}
   * @throws {ShapeError} When the data doesn't match the shape.
   */
  static fromJSON(data) {
    requireObject(this.LABEL, data);
    const merged = { ...this.blankDefaults(), ...clone(data) };
    this.validate(merged);
    return new this(merged);
  }

  /**
   * Validates a complete document.
   * @param {Object} data - Document to check.
   * @throws {ShapeError} On a missing required field or a mistyped field.
   */
  static validate(data) {
    for (const field of this.REQUIRED) {
      if (data[field] === undefined) throw new ShapeError(`${this.LABEL}: ${field} is required`);
      checkField(this.LABEL, field, data[field], 'string');
    }
    checkFields(this.LABEL, data, this.FIELDS);
  }

  /**
   * @param {string} dir - Job or arc directory.
   * @returns {string} Path to this document inside `dir`.
   */
  static pathIn(dir) {
    return path.join(dir, this.FILENAME);
  }

  /**
   * @param {string} dir - Job or arc directory.
   * @returns {boolean} Whether the document exists in `dir`.
   */
  static exists(dir) {
    return fs.existsSync(this.pathIn(dir));
  }

  /**
   * Loads and validates the document from `dir`.
   * @param {string} dir - Job or arc directory.
   * @returns {StateDocument}
   * @throws {Error} When the file is missing, malformed, or mis-shaped.
   */
  static load(dir) {
    return this.fromJSON(readJsonStrict(this.pathIn(dir)));
  }

  /**
   * Atomically writes the document into `dir`.
   * @param {string} dir - Job or arc directory.
   */
  save(dir) {
    writeJson(this.constructor.pathIn(dir), this.data);
  }

  /**
   * @param {string} field - Field name.
   * @returns {*} A copy of the field's value, or undefined when absent.
   */
  get(field) {
    const value = this.data[field];
    return value === undefined ? undefined : clone(value);
  }

  /**
   * Sets one field after validating the result.
   * @param {string} field - Field name.
   * @param {*} value - New JSON value.
   * @throws {ShapeError} When the new value is invalid; nothing changes.
   */
  set(field, value) {
    this.update({ [field]: value });
  }

  /**
   * Applies several fields at once: all of them, or none if any is invalid.
   * @param {Object} fields - Field name -> new JSON value.
   * @throws {ShapeError} When `fields` isn't an object or the result is invalid.
   */
  update(fields) {
    requireObject(`${this.constructor.LABEL} update`, fields);
    const next = { ...this.data, ...clone(fields) };
    this.constructor.validate(next);
    this.data = next;
  }

  /**
   * @returns {Object} An independent copy of the document.
   */
  toJSON() {
    return clone(this.data);
  }
}

/**
 * Field check for documentation_targets: a list of {scope, path} strings.
 * @param {*} value
 * @returns {boolean}
 */
function isDocumentationTargets(value) {
  return Array.isArray(value)
    && value.every((t) => t !== null && typeof t === 'object' && typeof t.scope === 'string' && typeof t.path === 'string');
}

export { StateDocument, isDocumentationTargets };
