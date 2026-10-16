'use strict';

// A job's state.json: the lightweight working index every Xoch command
// reads to orient (status, current step, current phase summary, workflow
// fields), plus any extra fields prompts record along the way.

import { StateDocument, isDocumentationTargets } from './state-document.js';
import { today } from './shape.js';

/**
 * Field check for phase_index entries: {phase, title, status, type}.
 * @param {*} value
 * @returns {boolean}
 */
function isPhaseIndex(value) {
  return Array.isArray(value) && value.every((e) => e !== null && typeof e === 'object'
    && Number.isInteger(e.phase) && typeof e.title === 'string'
    && typeof e.status === 'string' && typeof e.type === 'string');
}

/** A job's state.json document. */
class JobState extends StateDocument {
  static FILENAME = 'state.json';

  static LABEL = 'job state';

  static REQUIRED = ['job_id', 'title'];

  static FIELDS = {
    description: 'string?',
    status: 'string?',
    job_type: 'string',
    arc: 'string?',
    current_phase: 'int?',
    phase_count: 'int',
    current_phase_title: 'string?',
    current_phase_goal: 'string?',
    current_phase_type: 'string?',
    current_phase_files: 'strings',
    current_phase_acceptance_criteria: 'strings',
    current_phase_validation: 'strings',
    phase_index: isPhaseIndex,
    documentation_targets: isDocumentationTargets,
    decisions: 'strings',
    risks: 'strings',
    unresolved_questions: 'strings',
    active_workflow: 'string?',
    workflow_stage: 'string?',
    pending_action: 'string?',
    workflow_artifact: 'string?',
    return_command: 'string?',
    workflow_started_at: 'string?',
    review_status: 'string?',
    closure_status: 'string?',
    next_command: 'string?',
    current_step: 'string?',
    started: 'string?',
    last_updated: 'string?',
  };

  /**
   * Defaults for every known optional field, used to fill in fields an
   * older or hand-written document doesn't have yet.
   * @returns {Object}
   */
  static blankDefaults() {
    return {
      description: null,
      status: 'active',
      job_type: 'standard',
      arc: 'standalone',
      current_phase: null,
      phase_count: 0,
      current_phase_title: null,
      current_phase_goal: null,
      current_phase_files: [],
      current_phase_acceptance_criteria: [],
      current_phase_validation: [],
      phase_index: [],
      documentation_targets: [],
      decisions: [],
      risks: [],
      unresolved_questions: [],
      active_workflow: null,
      workflow_stage: null,
      pending_action: null,
      workflow_artifact: null,
      return_command: null,
      workflow_started_at: null,
      review_status: null,
      closure_status: null,
      next_command: null,
      current_step: null,
      started: null,
      last_updated: null,
    };
  }

  /**
   * A brand-new job's state, matching what `job open` has always written.
   * @param {Object} options
   * @param {string} options.id - Job ID.
   * @param {string} options.title - Job title.
   * @param {string} [options.description] - Defaults to the title.
   * @param {string} [options.jobType='standard'] - `standard` or `qa`.
   * @param {string} [options.arc='standalone'] - Arc ID or `standalone`.
   * @param {string} [options.docScope='unknown'] - Documentation target scope.
   * @param {string} [options.docPath='unknown'] - Documentation target path.
   * @param {string} [options.started] - YYYY-MM-DD; defaults to today.
   * @returns {JobState}
   */
  static create({
    id, title, description, jobType = 'standard', arc = 'standalone', docScope = 'unknown', docPath = 'unknown', started = today(),
  }) {
    return this.fromJSON({
      job_id: id,
      title,
      description: description || title,
      job_type: jobType,
      arc,
      documentation_targets: [{ scope: docScope, path: docPath }],
      next_command: jobType === 'qa' ? 'xoch-qa' : 'xoch-open',
      current_step: 'title',
      started,
      last_updated: started,
    });
  }
}

export { JobState };
