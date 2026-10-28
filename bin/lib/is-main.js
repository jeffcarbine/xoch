// ESM equivalent of CommonJS's `require.main === module`, symlink-safe.
// npm's global bin (e.g. /opt/homebrew/bin/xoch) is a symlink to this
// package's real script path. import.meta.url always reflects the
// resolved real path, while process.argv[1] is whatever path was used to
// invoke it (the symlink itself, when run through it) -- so a raw
// `import.meta.url === pathToFileURL(process.argv[1]).href` comparison
// silently never matches for a symlinked invocation. realpathSync closes
// that gap the same way Node's own CommonJS entry-point resolution always
// did.
import { realpathSync } from 'fs';
import { pathToFileURL } from 'url';

// DOCUMENTED COVERAGE EXCEPTION (es6-imports, 2026-09-18): every branch
// here (the empty-argv[1] guard, the realpathSync catch, and the
// URL-mismatch case) is exercised directly against this real file by
// test/is-main.test.js. The copy at test/init.test.js's
// .init-test-scratch/bin/lib/is-main.js -- needed because bin/init.js
// imports it relative to itself -- only ever gets invoked as a genuine,
// valid, matching CLI entry point (test/init.test.js's runScript() always
// runs it via a real `node <path>` call), so these defensive branches are
// structurally unreachable on that specific copy. Node's coverage
// instrumentation tracks the scratch copy and this real file as separate
// entries by absolute path (see bin/init.js's own failRender()
// exception for the same mechanism in the opposite direction), so full
// coverage on the real file doesn't roll up to the scratch copy's entry.
function isMainModule(moduleUrl) {
  const invoked = process.argv[1];
  if (!invoked) return false;
  let real;
  try {
    real = realpathSync(invoked);
  } catch {
    return false;
  }
  return moduleUrl === pathToFileURL(real).href;
}

export { isMainModule };
