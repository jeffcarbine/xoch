'use strict';

import fs from 'fs';
import path from 'path';

// Tolerant read: a missing or unparsable file is treated as an empty
// object rather than an error, so callers can always merge into it.
function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Strict read for files whose absence or corruption must not be mistaken
 * for "empty": job/arc state, phases, and the current pointer.
 * @param {string} filePath - JSON file to read.
 * @returns {*} The parsed JSON value.
 * @throws {Error} When the file is missing or is not valid JSON.
 */
function readJsonStrict(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`JSON file not found: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid JSON in ${filePath}: ${e.message}`);
  }
}

// Atomic write: temp file in the same directory + rename, so a reader
// never observes a partially-written file.
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
}

// Read-modify-write: `updater` receives the existing (possibly empty)
// data and mutates/returns it. Callers that only touch their own keys
// (e.g. `data.storage = { mode: value }`) leave unrelated keys intact.
function updateJson(filePath, updater) {
  const data = readJson(filePath);
  const updated = updater(data) || data;
  writeJson(filePath, updated);
  return updated;
}

export { readJson, readJsonStrict, writeJson, updateJson };
