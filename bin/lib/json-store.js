'use strict';

const fs = require('fs');
const path = require('path');

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

module.exports = { readJson, writeJson, updateJson };
