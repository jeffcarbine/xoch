'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, run } = require('./lib/runner.js');
const { scratch, cleanup, runScript } = require('./lib/cli.js');

const SCRIPT = path.join(__dirname, '..', 'bin', 'readme-actions.js');

test('--help prints usage', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['--help'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /Manifest shape:/);
  } finally {
    cleanup(ctx);
  }
});

test('no command prints usage and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, [], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stdout, /Usage:/);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown command prints usage, reports it, and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /Unknown command: bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('an unknown option inside assemble args is rejected and exits 2', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--bogus'], ctx);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /Unknown option: --bogus/);
  } finally {
    cleanup(ctx);
  }
});

test('a nonexistent --root is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['assemble', '--root', path.join(ctx.cwd, 'missing')], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Project root not found/);
  } finally {
    cleanup(ctx);
  }
});

test('no packets and no manifest is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /No README packets provided/);
  } finally {
    cleanup(ctx);
  }
});

test('a --manifest file that does not exist is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--manifest', 'missing.json'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Manifest not found/);
  } finally {
    cleanup(ctx);
  }
});

test('omitting --root defaults to the current working directory', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'Body');
    const result = runScript(SCRIPT, ['assemble', 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(fs.existsSync(path.join(ctx.cwd, 'README.md')));
  } finally {
    cleanup(ctx);
  }
});

test('a nonexistent packet is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, 'missing.md'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Packet not found/);
  } finally {
    cleanup(ctx);
  }
});

test('a non-markdown packet is rejected', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'notes.txt'), 'body');
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, 'notes.txt'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Packet must be markdown: notes\.txt/);
  } finally {
    cleanup(ctx);
  }
});

test('a packet path escaping the project root is rejected', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '../../etc/passwd'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Path escapes project root/);
  } finally {
    cleanup(ctx);
  }
});

test('a packet path that resolves to the project root itself is rejected as not a file', () => {
  const ctx = scratch();
  try {
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '.'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /Packet not found/);
  } finally {
    cleanup(ctx);
  }
});

test('assembling CLI-provided packets writes README.md with wrapped, trimmed packet bodies', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'one.md'), '# Section One\n\nBody text.\n\n');
    fs.writeFileSync(path.join(ctx.cwd, 'two.md'), 'Section two content.');
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--title', 'Test Doc', 'one.md', 'two.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /README assembled: .*\(2 packets\)/);
    const content = fs.readFileSync(path.join(ctx.cwd, 'README.md'), 'utf8');
    assert.ok(content.startsWith('# Test Doc\n\n'));
    assert.ok(content.includes('<!-- XOCH PACKET: one.md -->\n# Section One\n\nBody text.\n<!-- END XOCH PACKET: one.md -->'));
    assert.ok(content.includes('<!-- XOCH PACKET: two.md -->\nSection two content.\n<!-- END XOCH PACKET: two.md -->'));
  } finally {
    cleanup(ctx);
  }
});

test('the default title falls back to the root directory name when none is given', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'Body');
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    const content = fs.readFileSync(path.join(ctx.cwd, 'README.md'), 'utf8');
    assert.ok(content.startsWith(`# ${path.basename(ctx.cwd)}\n`));
  } finally {
    cleanup(ctx);
  }
});

test('--dry-run reports validity without writing the file', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'Body');
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--title', 'Dry', '--dry-run', 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /README assembly valid/);
    assert.match(result.stdout, /Title: Dry/);
    assert.match(result.stdout, /1\. a\.md/);
    assert.ok(!fs.existsSync(path.join(ctx.cwd, 'README.md')));
  } finally {
    cleanup(ctx);
  }
});

test('--stdout prints the rendered markdown instead of writing it', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'Body');
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--title', 'Piped', '--stdout', 'a.md'], ctx);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^# Piped\n/);
    assert.ok(!fs.existsSync(path.join(ctx.cwd, 'README.md')));
  } finally {
    cleanup(ctx);
  }
});

test('a manifest supplies title, output, and ordered string packets', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'A');
    fs.writeFileSync(path.join(ctx.cwd, 'b.md'), 'B');
    fs.writeFileSync(
      path.join(ctx.cwd, 'manifest.json'),
      JSON.stringify({ title: 'From Manifest', output: 'OUT.md', packets: ['a.md', 'b.md'] })
    );
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--manifest', 'manifest.json'], ctx);
    assert.strictEqual(result.status, 0);
    assert.ok(!fs.existsSync(path.join(ctx.cwd, 'README.md')));
    const content = fs.readFileSync(path.join(ctx.cwd, 'OUT.md'), 'utf8');
    assert.ok(content.startsWith('# From Manifest\n'));
    assert.ok(content.includes('XOCH PACKET: a.md'));
    assert.ok(content.includes('XOCH PACKET: b.md'));
  } finally {
    cleanup(ctx);
  }
});

test('explicit --title and --output override the manifest\'s title and output', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'A');
    fs.writeFileSync(
      path.join(ctx.cwd, 'manifest.json'),
      JSON.stringify({ title: 'From Manifest', output: 'OUT.md', packets: ['a.md'] })
    );
    const result = runScript(
      SCRIPT,
      ['assemble', '--root', ctx.cwd, '--manifest', 'manifest.json', '--title', 'Explicit', '--output', 'custom.md'],
      ctx
    );
    assert.strictEqual(result.status, 0);
    assert.ok(!fs.existsSync(path.join(ctx.cwd, 'OUT.md')));
    const content = fs.readFileSync(path.join(ctx.cwd, 'custom.md'), 'utf8');
    assert.ok(content.startsWith('# Explicit\n'));
  } finally {
    cleanup(ctx);
  }
});

test('manifest object packet entries respect enabled:true/false and require a path', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'a.md'), 'A');
    fs.writeFileSync(path.join(ctx.cwd, 'b.md'), 'B');
    fs.writeFileSync(path.join(ctx.cwd, 'c.md'), 'C');
    fs.writeFileSync(
      path.join(ctx.cwd, 'manifest.json'),
      JSON.stringify({
        packets: [
          { path: 'a.md', enabled: true },
          { path: 'b.md', enabled: false },
          { enabled: true },
          'c.md',
        ],
      })
    );
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--manifest', 'manifest.json'], ctx);
    assert.strictEqual(result.status, 0);
    const content = fs.readFileSync(path.join(ctx.cwd, 'README.md'), 'utf8');
    assert.ok(content.includes('XOCH PACKET: a.md'));
    assert.ok(!content.includes('XOCH PACKET: b.md'));
    assert.ok(content.includes('XOCH PACKET: c.md'));
    assert.match(result.stdout, /\(2 packets\)/);
  } finally {
    cleanup(ctx);
  }
});

test('a manifest with no "packets" field falls back to an empty list and is rejected', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, 'manifest.json'), JSON.stringify({ title: 'No Packets' }));
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--manifest', 'manifest.json'], ctx);
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /No README packets provided/);
  } finally {
    cleanup(ctx);
  }
});

test('a -- separator passes remaining args through as packets, even dash-prefixed names', () => {
  const ctx = scratch();
  try {
    fs.writeFileSync(path.join(ctx.cwd, '-dash.md'), 'Dashed body');
    const result = runScript(SCRIPT, ['assemble', '--root', ctx.cwd, '--', '-dash.md'], ctx);
    assert.strictEqual(result.status, 0);
    const content = fs.readFileSync(path.join(ctx.cwd, 'README.md'), 'utf8');
    assert.ok(content.includes('XOCH PACKET: -dash.md'));
  } finally {
    cleanup(ctx);
  }
});

run();
