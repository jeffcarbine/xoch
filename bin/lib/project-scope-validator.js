'use strict';

const path = require('path');

// Common multi-project scope validation logic, shared by project-scope.js
// and context-sync.js. The two bash originals (project-scope.sh's
// scope_errors and context-sync.sh's validate_scope!) check overlapping
// conditions but use *different wording* for nearly every message, so
// what's actually shared here is the validation logic (what to check,
// in what order, including subtle bits like path-resolution and
// duplicate-detection) -- not a fixed set of strings. Each caller
// supplies its own `messages` table to reproduce its own bash original's
// exact text.
//
// `messages` keys and their arguments:
//   version()                    -- data.version !== 1
//   jobId()                      -- job_id missing
//   mode()                       -- mode !== "multi-project"
//   tooFewProjects()             -- fewer than 2 projects
//   notObject(index)             -- projects[index] isn't an object
//   nameRequired(index)          -- projects[index].name missing
//   duplicateName(name)          -- name collision
//   roleInvalid(index)           -- projects[index].role not primary/participant
//   pathNotAbsolute(index)       -- projects[index].path not absolute
//   duplicatePath(index, expandedPath, ownerName) -- path collision
//   jobPathMismatch(index, expected) -- projects[index].job_path wrong
//   primaryCount()                -- not exactly one primary
//   primaryMismatch()             -- data.primary doesn't match the primary project
function scopeErrors(data, messages) {
  const errors = [];
  if (data.version !== 1) errors.push(messages.version());
  if (!data.job_id) errors.push(messages.jobId());
  if (data.mode !== 'multi-project') errors.push(messages.mode());

  const projects = data.projects;
  if (!Array.isArray(projects) || projects.length < 2) {
    errors.push(messages.tooFewProjects());
    return errors;
  }

  const names = {};
  const paths = {};
  let primaryCount = 0;
  const expectedJobPath = path.join('.xoch', 'work', 'jobs', String(data.job_id || ''));

  projects.forEach((project, index) => {
    if (typeof project !== 'object' || project === null || Array.isArray(project)) {
      errors.push(messages.notObject(index));
      return;
    }
    const name = String(project.name || '');
    const role = project.role;
    const projectPath = String(project.path || '');
    const jobPath = String(project.job_path || '');

    if (!name) errors.push(messages.nameRequired(index));
    if (name && names[name]) errors.push(messages.duplicateName(name));
    if (name) names[name] = true;
    if (!['primary', 'participant'].includes(role)) errors.push(messages.roleInvalid(index));
    if (role === 'primary') primaryCount += 1;
    if (!projectPath.startsWith('/')) errors.push(messages.pathNotAbsolute(index));
    // path.resolve('') resolves to cwd, matching Ruby's File.expand_path("")
    // -- do not fall back to '/', which would resolve to filesystem root.
    const expandedPath = path.resolve(projectPath);
    if (paths[expandedPath]) errors.push(messages.duplicatePath(index, expandedPath, paths[expandedPath]));
    paths[expandedPath] = name || paths[expandedPath] || true;
    if (jobPath !== expectedJobPath) errors.push(messages.jobPathMismatch(index, expectedJobPath));
  });

  if (primaryCount !== 1) errors.push(messages.primaryCount());
  const primary = projects.find((project) => project && project.role === 'primary');
  if (primary && data.primary !== primary.name) errors.push(messages.primaryMismatch());

  return errors;
}

module.exports = { scopeErrors };
