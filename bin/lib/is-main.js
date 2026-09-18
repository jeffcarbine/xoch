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
