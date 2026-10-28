'use strict';

// The work/current.json pointer: which job is active in this storage
// root, projected with its workflow, next command, and current step. The
// shape is unchanged from the pointer Xoch already writes.

import fs from 'fs';
import path from 'path';
import { readJsonStrict, writeJson } from './json-store.js';
import {
  ShapeError, requireObject, isPlainObject, clone,
} from './shape.js';

const REQUIRED_WORKFLOW_FIELDS = ['name', 'stage', 'pending_action', 'return_command'];

/** The work/current.json document. */
class CurrentPointer {
  static FILENAME = 'current.json';

  /**
   * @param {Object} data - Already-validated pointer data.
   */
  constructor(data) {
    this.data = data;
  }

  /**
   * Builds an instance from parsed JSON.
   * @param {*} data - Parsed JSON.
   * @returns {CurrentPointer}
   * @throws {ShapeError} On a wrong version, missing job id/directory, or incomplete workflow.
   */
  static fromJSON(data) {
    requireObject('current pointer', data);
    if (data.version !== 1) throw new ShapeError('current pointer: unsupported version');
    const { job, workflow } = data;
    if (!isPlainObject(job) || !job.id || !job.directory) {
      throw new ShapeError('current pointer: job must have an id and a directory');
    }
    if (workflow) {
      const missing = REQUIRED_WORKFLOW_FIELDS.filter((key) => !workflow[key]);
      if (missing.length) throw new ShapeError(`current pointer: workflow is missing ${missing.join(', ')}`);
    }
    return new CurrentPointer(clone(data));
  }

  /**
   * @param {string} workDir - The storage root's work/ directory.
   * @returns {string} Path to current.json inside `workDir`.
   */
  static pathIn(workDir) {
    return path.join(workDir, CurrentPointer.FILENAME);
  }

  /**
   * @param {string} workDir - The storage root's work/ directory.
   * @returns {boolean} Whether current.json exists.
   */
  static exists(workDir) {
    return fs.existsSync(CurrentPointer.pathIn(workDir));
  }

  /**
   * Loads and validates current.json from `workDir`.
   * @param {string} workDir - The storage root's work/ directory.
   * @returns {CurrentPointer}
   */
  static load(workDir) {
    return CurrentPointer.fromJSON(readJsonStrict(CurrentPointer.pathIn(workDir)));
  }

  /**
   * Atomically writes current.json into `workDir`.
   * @param {string} workDir - The storage root's work/ directory.
   */
  save(workDir) {
    writeJson(CurrentPointer.pathIn(workDir), this.data);
  }

  /**
   * @returns {string} The active job's ID.
   */
  jobId() {
    return this.data.job.id;
  }

  /**
   * Requires the job directory to be `<root>/work/jobs/<id>`, so a pointer
   * can't send commands to a job outside the storage root.
   * @param {string} root - Storage root (e.g. `.xoch`).
   * @throws {ShapeError} When the directory doesn't match.
   */
  assertRoot(root) {
    const expected = path.join(root, 'work', 'jobs', String(this.data.job.id));
    const actual = String(this.data.job.directory).replace(/\/$/, '');
    if (actual !== expected) throw new ShapeError(`current pointer: job directory ${actual} is not ${expected}`);
  }

  /**
   * @returns {Object} An independent copy of the pointer.
   */
  toJSON() {
    return clone(this.data);
  }
}

export { CurrentPointer };
