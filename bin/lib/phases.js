'use strict';

// A job's phases.json: the ordered phase breakdown written at plan time,
// plus document-level notes that belong to no single phase.
// A phase's number is always its position in the list (1-based) -- it is
// never stored -- so phase numbering, `phase advance`, and the derived
// phase_index can't disagree with each other or with a title's wording.

import fs from 'fs';
import path from 'path';
import { readJsonStrict, writeJson } from './json-store.js';
import {
  ShapeError, checkField, requireObject, isPlainObject, clone,
} from './shape.js';

const PHASE_TYPES = ['implementation', 'checkpoint'];
const PHASE_STATUSES = ['not_started', 'in_progress', 'complete', 'deferred'];

/**
 * Field check for a phase's files: a list of {path, note?, project?}.
 * @param {*} value
 * @returns {boolean}
 */
function isFileList(value) {
  return Array.isArray(value) && value.every((f) => isPlainObject(f) && typeof f.path === 'string'
    && ['note', 'project'].every((k) => f[k] === undefined || f[k] === null || typeof f[k] === 'string'));
}

/**
 * Field check for a QA phase's cases: a list of objects with a string id
 * and only string values (target, action, input, expected, rationale...).
 * @param {*} value
 * @returns {boolean}
 */
function isCaseList(value) {
  return Array.isArray(value) && value.every((c) => isPlainObject(c) && typeof c.id === 'string' && c.id
    && Object.values(c).every((v) => typeof v === 'string'));
}

const PHASE_FIELDS = {
  title: 'string',
  goal: 'string?',
  description: 'string',
  type: (v) => PHASE_TYPES.includes(v),
  status: (v) => PHASE_STATUSES.includes(v),
  start_ref: 'string?',
  projects: 'strings',
  files: isFileList,
  acceptance_criteria: 'strings',
  behavior_tests: 'strings',
  coverage_backfill: 'strings',
  testing_requirements: 'strings',
  completion_evidence: 'strings',
  verification_focus: 'strings',
  notes: 'strings',
  required_capability: 'string?',
  allowed_owners: 'string?',
  cases: isCaseList,
  engineer_instructions: 'strings',
};

/**
 * Defaults for every optional phase field.
 * @returns {Object}
 */
function phaseDefaults() {
  return {
    goal: null,
    description: '',
    type: 'implementation',
    status: 'not_started',
    start_ref: null,
    projects: [],
    files: [],
    acceptance_criteria: [],
    behavior_tests: [],
    coverage_backfill: [],
    testing_requirements: [],
    completion_evidence: [],
    verification_focus: [],
    notes: [],
    required_capability: null,
    allowed_owners: null,
    cases: [],
    engineer_instructions: [],
  };
}

/**
 * Validates one phase, naming it by position in errors.
 * @param {Object} phase - Phase with defaults applied.
 * @param {number} number - 1-based position.
 * @throws {ShapeError}
 */
function validatePhase(phase, number) {
  const label = `phases: phase ${number}`;
  requireObject(label, phase);
  if (phase.title === undefined) throw new ShapeError(`${label}: title is required`);
  for (const [field, kind] of Object.entries(PHASE_FIELDS)) {
    checkField(label, field, phase[field], kind);
  }
}

/** A job's phases.json document. */
class Phases {
  static FILENAME = 'phases.json';

  /**
   * @param {Object} data - Already-validated {current_phase, phases}.
   */
  constructor(data) {
    this.data = data;
  }

  /**
   * Builds an instance from parsed JSON, filling per-phase defaults.
   * @param {*} data - Parsed JSON.
   * @returns {Phases}
   * @throws {ShapeError} When the document or any phase is mis-shaped.
   */
  static fromJSON(data) {
    requireObject('phases', data);
    const phases = data.phases === undefined ? [] : data.phases;
    if (!Array.isArray(phases)) throw new ShapeError('phases: phases must be a list');
    const normalized = phases.map((phase, i) => {
      requireObject(`phases: phase ${i + 1}`, phase);
      const merged = { ...phaseDefaults(), ...clone(phase) };
      validatePhase(merged, i + 1);
      return merged;
    });
    const current = data.current_phase === undefined ? null : data.current_phase;
    checkField('phases', 'current_phase', current, 'int?');
    if (current !== null && (current < 1 || current > normalized.length)) {
      throw new ShapeError(`phases: current_phase ${current} is not a listed phase`);
    }
    const notes = data.notes === undefined ? [] : clone(data.notes);
    checkField('phases', 'notes', notes, 'strings');
    return new Phases({ current_phase: current, phases: normalized, notes });
  }

  /**
   * @param {string} dir - Job directory.
   * @returns {string} Path to phases.json inside `dir`.
   */
  static pathIn(dir) {
    return path.join(dir, Phases.FILENAME);
  }

  /**
   * @param {string} dir - Job directory.
   * @returns {boolean} Whether phases.json exists in `dir`.
   */
  static exists(dir) {
    return fs.existsSync(Phases.pathIn(dir));
  }

  /**
   * Loads and validates phases.json from `dir`.
   * @param {string} dir - Job directory.
   * @returns {Phases}
   * @throws {Error} When the file is missing, malformed, or mis-shaped.
   */
  static load(dir) {
    return Phases.fromJSON(readJsonStrict(Phases.pathIn(dir)));
  }

  /**
   * Atomically writes phases.json into `dir`.
   * @param {string} dir - Job directory.
   */
  save(dir) {
    writeJson(Phases.pathIn(dir), this.data);
  }

  /**
   * @returns {number} How many phases there are.
   */
  count() {
    return this.data.phases.length;
  }

  /**
   * Index into the phase list for a 1-based phase number.
   * @param {*} number - Phase number.
   * @returns {number} 0-based index.
   * @throws {ShapeError} When `number` isn't a listed phase.
   */
  indexOf(number) {
    if (!Number.isInteger(number) || number < 1 || number > this.count()) {
      throw new ShapeError(`phases: phase ${number} is not a listed phase (1-${this.count()})`);
    }
    return number - 1;
  }

  /**
   * @param {number} number - 1-based phase number.
   * @returns {Object} A copy of that phase.
   */
  at(number) {
    return clone(this.data.phases[this.indexOf(number)]);
  }

  /**
   * Sets one phase's status.
   * @param {number} number - 1-based phase number.
   * @param {string} status - One of PHASE_STATUSES.
   * @throws {ShapeError} When the phase or status is invalid.
   */
  setStatus(number, status) {
    const index = this.indexOf(number);
    checkField(`phases: phase ${number}`, 'status', status, PHASE_FIELDS.status);
    this.data.phases[index].status = status;
  }

  /**
   * Sets which phase is current, or clears it.
   * @param {number|null} number - 1-based phase number, or null.
   * @throws {ShapeError} When `number` isn't a listed phase.
   */
  setCurrent(number) {
    if (number !== null) this.indexOf(number);
    this.data.current_phase = number;
  }

  /**
   * The compact phase summary kept in job state, derived from the list.
   * @returns {Array<{phase: number, title: string, status: string, type: string}>}
   */
  phaseIndex() {
    return this.data.phases.map((p, i) => ({
      phase: i + 1, title: p.title, status: p.status, type: p.type,
    }));
  }

  /**
   * @returns {Object} An independent copy of the document.
   */
  toJSON() {
    return clone(this.data);
  }
}

export { Phases, PHASE_TYPES, PHASE_STATUSES };
