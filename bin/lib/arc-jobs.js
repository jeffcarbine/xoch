'use strict';

// An arc's jobs.json: which jobs belong to the arc and where each stands
// (Active, Planned, Complete, Parked). Membership is by job ID only; job
// folders never live inside arc folders.

import fs from 'fs';
import path from 'path';
import { readJsonStrict, writeJson } from './json-store.js';
import {
  ShapeError, requireObject, isPlainObject, clone,
} from './shape.js';

const SECTIONS = ['active', 'planned', 'complete', 'parked'];

/** An arc's jobs.json document. */
class ArcJobs {
  static FILENAME = 'jobs.json';

  /**
   * @param {Object} data - Already-validated section -> entries.
   */
  constructor(data) {
    this.data = data;
  }

  /**
   * A new membership list, optionally starting with one active job.
   * @param {Object} [options]
   * @param {{id: string, title: string}} [options.active] - Initial active job.
   * @returns {ArcJobs}
   */
  static create({ active } = {}) {
    return ArcJobs.fromJSON({ active: active ? [active] : [] });
  }

  /**
   * Builds an instance from parsed JSON. Missing sections start empty.
   * Entries are {id, title} plus any extra details, which are kept.
   * @param {*} data - Parsed JSON.
   * @returns {ArcJobs}
   * @throws {ShapeError} When a section or entry is mis-shaped, or a job is listed twice.
   */
  static fromJSON(data) {
    requireObject('arc jobs', data);
    const normalized = {};
    const seen = new Set();
    for (const section of SECTIONS) {
      const entries = data[section] === undefined ? [] : data[section];
      if (!Array.isArray(entries)) throw new ShapeError(`arc jobs: ${section} must be a list`);
      normalized[section] = entries.map((entry) => {
        if (!isPlainObject(entry)) throw new ShapeError(`arc jobs: ${section} entries must be objects`);
        if (typeof entry.id !== 'string' || !entry.id) throw new ShapeError(`arc jobs: ${section} entry is missing an id`);
        const title = entry.title === undefined ? null : entry.title;
        if (title !== null && typeof title !== 'string') throw new ShapeError(`arc jobs: ${section} entry ${entry.id} title must be a string or null`);
        if (seen.has(entry.id)) throw new ShapeError(`arc jobs: ${entry.id} is listed more than once`);
        seen.add(entry.id);
        return { ...clone(entry), title };
      });
    }
    return new ArcJobs(normalized);
  }

  /**
   * @param {string} dir - Arc directory.
   * @returns {string} Path to jobs.json inside `dir`.
   */
  static pathIn(dir) {
    return path.join(dir, ArcJobs.FILENAME);
  }

  /**
   * @param {string} dir - Arc directory.
   * @returns {boolean} Whether jobs.json exists in `dir`.
   */
  static exists(dir) {
    return fs.existsSync(ArcJobs.pathIn(dir));
  }

  /**
   * Loads and validates jobs.json from `dir`.
   * @param {string} dir - Arc directory.
   * @returns {ArcJobs}
   */
  static load(dir) {
    return ArcJobs.fromJSON(readJsonStrict(ArcJobs.pathIn(dir)));
  }

  /**
   * Atomically writes jobs.json into `dir`.
   * @param {string} dir - Arc directory.
   */
  save(dir) {
    writeJson(ArcJobs.pathIn(dir), this.data);
  }

  /**
   * @param {string} id - Job ID.
   * @returns {string|null} The section listing the job, or null.
   */
  sectionOf(id) {
    return SECTIONS.find((section) => this.data[section].some((e) => e.id === id)) || null;
  }

  /**
   * Moves a job into `section`, removing every existing entry for it (and
   * for `from`, a differently-keyed placeholder it replaces). The entry
   * keeps its previous title and extra details unless a title is given.
   * @param {string} id - Job ID.
   * @param {string} section - One of active, planned, complete, parked.
   * @param {Object} [options]
   * @param {string} [options.title] - Title to set.
   * @param {string} [options.from] - Placeholder entry ID to replace.
   * @throws {ShapeError} When `section` is unknown.
   */
  move(id, section, { title, from } = {}) {
    if (!SECTIONS.includes(section)) throw new ShapeError(`arc jobs: section must be one of ${SECTIONS.join(', ')}`);
    const keys = [id, from].filter(Boolean);
    let carried = { title: null };
    let own = false;
    for (const name of SECTIONS) {
      const kept = [];
      for (const entry of this.data[name]) {
        if (!keys.includes(entry.id)) {
          kept.push(entry);
        } else if (entry.id === id || !own) {
          // The job's own entry wins over its placeholder's.
          carried = entry;
          own = own || entry.id === id;
        }
      }
      this.data[name] = kept;
    }
    this.data[section].push({ ...carried, id, title: title || carried.title });
  }

  /**
   * @returns {Object} An independent copy of the document.
   */
  toJSON() {
    return clone(this.data);
  }
}

export { ArcJobs, SECTIONS };
