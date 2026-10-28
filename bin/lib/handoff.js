'use strict';

// A handoff: information a side workflow (discovery, trace, QA) leaves for
// a later `xoch-open` to use as source requirements. Each is one JSON file
// under [xoch-root]/handoffs/, pending until a job claims it, so the same
// findings are never picked up twice.

import fs from 'fs';
import path from 'path';
import { readJsonStrict, writeJson } from './json-store.js';
import {
  ShapeError, checkFields, requireObject, clone,
} from './shape.js';

const HANDOFF_SOURCES = ['discovery', 'trace', 'qa'];
const HANDOFF_STATUSES = ['pending', 'claimed'];

const FIELDS = {
  id: 'string',
  source: (v) => HANDOFF_SOURCES.includes(v),
  topic: 'string',
  created: 'string',
  status: (v) => HANDOFF_STATUSES.includes(v),
  claimed_by: 'string?',
  claimed_at: 'string?',
  body: 'string',
};

/** One handoff document. */
class Handoff {
  /**
   * @param {Object} data - Already-validated handoff data.
   */
  constructor(data) {
    this.data = data;
  }

  /**
   * A new, pending handoff.
   * @param {Object} options
   * @param {string} options.id
   * @param {string} options.source - discovery, trace, or qa.
   * @param {string} options.topic
   * @param {string} options.body
   * @param {string} options.created - ISO timestamp.
   * @returns {Handoff}
   */
  static create({
    id, source, topic, body, created,
  }) {
    return Handoff.fromJSON({
      id, source, topic, created, status: 'pending', claimed_by: null, claimed_at: null, body,
    });
  }

  /**
   * Builds a handoff from parsed JSON. Every field is required, and the
   * claim fields must agree with the status.
   * @param {*} data
   * @returns {Handoff}
   * @throws {ShapeError}
   */
  static fromJSON(data) {
    requireObject('handoff', data);
    for (const field of Object.keys(FIELDS)) {
      if (data[field] === undefined) throw new ShapeError(`handoff: ${field} is required`);
    }
    checkFields('handoff', data, FIELDS);
    const claimed = data.status === 'claimed';
    if (claimed !== (data.claimed_by !== null) || claimed !== (data.claimed_at !== null)) {
      throw new ShapeError('handoff: claimed_by and claimed_at must be set exactly when status is claimed');
    }
    return new Handoff(clone(data));
  }

  /**
   * @param {string} dir - Handoffs directory.
   * @param {string} id
   * @returns {string} Path to that handoff's file.
   */
  static pathIn(dir, id) {
    return path.join(dir, `${id}.json`);
  }

  /**
   * @param {string} dir - Handoffs directory.
   * @param {string} id
   * @returns {boolean}
   */
  static exists(dir, id) {
    return fs.existsSync(Handoff.pathIn(dir, id));
  }

  /**
   * @param {string} dir - Handoffs directory.
   * @param {string} id
   * @returns {Handoff}
   */
  static load(dir, id) {
    return Handoff.fromJSON(readJsonStrict(Handoff.pathIn(dir, id)));
  }

  /**
   * Every handoff in `dir`, oldest first. Files that aren't .json are
   * ignored; an absent directory holds none.
   * @param {string} dir - Handoffs directory.
   * @returns {Handoff[]}
   */
  static all(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => Handoff.load(dir, name.slice(0, -'.json'.length)))
      .sort((a, b) => a.data.created.localeCompare(b.data.created));
  }

  /**
   * Atomically writes the handoff into `dir`.
   * @param {string} dir - Handoffs directory.
   */
  save(dir) {
    writeJson(Handoff.pathIn(dir, this.data.id), this.data);
  }

  /**
   * @returns {boolean} Whether no job has claimed it yet.
   */
  isPending() {
    return this.data.status === 'pending';
  }

  /**
   * Marks the handoff claimed by a job.
   * @param {string} jobId
   * @param {string} at - ISO timestamp.
   * @throws {ShapeError} When it is already claimed.
   */
  claim(jobId, at) {
    if (!this.isPending()) throw new ShapeError(`handoff ${this.data.id} is already claimed by ${this.data.claimed_by}`);
    this.data = { ...this.data, status: 'claimed', claimed_by: jobId, claimed_at: at };
  }

  /**
   * @returns {Object} An independent copy of the handoff.
   */
  toJSON() {
    return clone(this.data);
  }
}

export { Handoff, HANDOFF_SOURCES };
