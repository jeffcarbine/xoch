'use strict';

// Where a project's Xoch data lives. Centralized storage (the default, and
// the fallback for a missing or invalid config) keeps it outside the repo
// under ~/.xoch/projects/<slug>/; in-repo storage keeps it in <project>/.xoch/.
// Every helper resolves paths through here rather than assuming
// <project>/.xoch, so both modes work everywhere.

import os from 'os';
import path from 'path';
import { readJson } from './json-store.js';
import { cleanId } from '../generate-job-id.js';

/**
 * The configured storage mode.
 * @returns {'centralized'|'in-repo'}
 */
function storageMode() {
  const config = readJson(path.join(os.homedir(), '.xoch', 'config.json'));
  const mode = config.storage && config.storage.mode;
  return mode === 'in-repo' ? 'in-repo' : 'centralized';
}

/**
 * The absolute storage root for a project directory.
 * @param {string} [projectDir] - Defaults to the current directory.
 * @returns {string}
 */
function storageRoot(projectDir = process.cwd()) {
  const dir = path.resolve(projectDir);
  return storageMode() === 'in-repo'
    ? path.join(dir, '.xoch')
    : path.join(os.homedir(), '.xoch', 'projects', cleanId(path.basename(dir)));
}

/**
 * The current project's storage root in the form job pointers record:
 * the relative `.xoch` in-repo, the absolute path when centralized.
 * @returns {string}
 */
function xochRoot() {
  return storageMode() === 'in-repo' ? '.xoch' : storageRoot();
}

/**
 * Where a project's copy of a job lives, as a multi-project scope records
 * it: `.xoch/work/jobs/<id>` relative to the project in-repo, the absolute
 * centralized path otherwise.
 * @param {string} projectDir
 * @param {string} jobId
 * @returns {string}
 */
function jobPathFor(projectDir, jobId) {
  return storageMode() === 'in-repo'
    ? path.join('.xoch', 'work', 'jobs', jobId)
    : path.join(storageRoot(projectDir), 'work', 'jobs', jobId);
}

export {
  storageMode, storageRoot, xochRoot, jobPathFor,
};
