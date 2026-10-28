'use strict';

// An arc's state.json: the arc's purpose, success outcome, documentation
// targets, and status, plus any extra fields recorded along the way.

import { StateDocument, isDocumentationTargets } from './state-document.js';
import { today } from './shape.js';

/** An arc's state.json document. */
class ArcState extends StateDocument {
  static FILENAME = 'state.json';

  static LABEL = 'arc state';

  static REQUIRED = ['arc_id', 'title'];

  static FIELDS = {
    purpose: 'string?',
    status: 'string?',
    documentation_targets: isDocumentationTargets,
    success_outcome: 'string?',
    risks: 'strings',
    unresolved_questions: 'strings',
    started: 'string?',
    last_updated: 'string?',
    next_command: 'string?',
  };

  /**
   * Defaults for every known optional field.
   * @returns {Object}
   */
  static blankDefaults() {
    return {
      purpose: null,
      status: 'active',
      documentation_targets: [],
      success_outcome: null,
      risks: [],
      unresolved_questions: [],
      started: null,
      last_updated: null,
      next_command: null,
    };
  }

  /**
   * A brand-new arc's state, matching what `arc open` has always written.
   * @param {Object} options
   * @param {string} options.id - Arc ID.
   * @param {string} options.title - Arc title.
   * @param {string} [options.purpose] - Defaults to the title.
   * @param {string} [options.success='TBD'] - Success outcome.
   * @param {string} [options.docScope='unknown'] - Documentation target scope.
   * @param {string} [options.docPath='unknown'] - Documentation target path.
   * @param {string} [options.started] - YYYY-MM-DD; defaults to today.
   * @returns {ArcState}
   */
  static create({
    id, title, purpose, success = 'TBD', docScope = 'unknown', docPath = 'unknown', started = today(),
  }) {
    return this.fromJSON({
      arc_id: id,
      title,
      purpose: purpose || title,
      status: 'active',
      documentation_targets: [{ scope: docScope, path: docPath }],
      success_outcome: success,
      risks: [],
      unresolved_questions: [],
      started,
      last_updated: started,
      next_command: 'xoch-open',
    });
  }
}

export { ArcState };
