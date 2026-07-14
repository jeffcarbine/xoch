#!/bin/bash

# Detect source drift without assuming a fixed README packet schema.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  docs-drift.sh baseline [--root ROOT] [--baseline FILE]
  docs-drift.sh check [--root ROOT] [--baseline FILE] [--since REF] [--json]

The helper reports changed source paths. Xoch or the engineer decides whether each
signal belongs in a root README packet, a nested README, or no documentation.
EOF
}

command="${1:-}"
[ -n "$command" ] || { usage; exit 2; }
shift

root="."
baseline=".xoch/docs/drift-baseline.json"
since=""
json_mode="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --root) root="$2"; shift 2 ;;
    --baseline) baseline="$2"; shift 2 ;;
    --since) since="$2"; shift 2 ;;
    --json) json_mode="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

ruby -rjson -rdigest -rfileutils -ropen3 - "$command" "$root" "$baseline" "$since" "$json_mode" <<'RUBY'
command, root, baseline_arg, since, json_mode = ARGV
root = File.expand_path(root)
baseline = File.expand_path(baseline_arg, root)
json_mode = json_mode == "true"
abort("Project root not found: #{root}") unless Dir.exist?(root)

extensions = %w[.js .mjs .cjs .ts .tsx .jsx .rb .py .php .go .rs .java .kt .kts .swift .cs .c .h .cpp .hpp .sh .bash .zsh .fish .scss .sass .css .html .vue .svelte .sql .graphql .gql .toml .yaml .yml]
special = %w[package.json composer.json Cargo.toml go.mod pom.xml build.gradle build.gradle.kts pyproject.toml]

source_like = lambda do |path|
  normalized = path.sub(%r{\A\./}, "")
  next false if normalized.start_with?(".xoch/", ".git/", "node_modules/", "vendor/", "dist/", "build/", "coverage/")
  special.include?(File.basename(normalized)) || extensions.include?(File.extname(normalized).downcase)
end

tracked = lambda do
  stdout, status = Open3.capture2("git", "-C", root, "ls-files", "-co", "--exclude-standard")
  paths = if status.success?
    stdout.lines.map(&:strip)
  else
    Dir.glob(File.join(root, "**", "*"), File::FNM_DOTMATCH).select { |path| File.file?(path) }.map { |path| path.delete_prefix(root + File::SEPARATOR) }
  end
  paths.select { |path| source_like.call(path) }.uniq.sort
end

hashes = lambda do
  tracked.call.to_h do |path|
    full = File.join(root, path)
    [path, File.file?(full) ? Digest::SHA256.file(full).hexdigest : nil]
  end
end

case command
when "baseline"
  current = hashes.call
  FileUtils.mkdir_p(File.dirname(baseline))
  File.write(baseline, JSON.pretty_generate({ generated_at: Time.now.strftime("%Y-%m-%dT%H:%M:%S%z"), files: current }) + "\n")
  puts "Documentation drift baseline written: #{baseline} (#{current.length} source files)"
when "check"
  signals = []
  if !since.empty?
    stdout, status = Open3.capture2("git", "-C", root, "diff", "--name-only", "#{since}...HEAD")
    abort("Unable to compare git ref: #{since}") unless status.success?
    signals = stdout.lines.map(&:strip).select { |path| source_like.call(path) }.uniq.sort
  else
    abort("Drift baseline not found: #{baseline}") unless File.file?(baseline)
    previous = JSON.parse(File.read(baseline)).fetch("files", {})
    current = hashes.call
    signals = (previous.keys | current.keys).select { |path| previous[path] != current[path] }.sort
  end
  result = { root: root, baseline: since.empty? ? baseline : nil, since: since.empty? ? nil : since, drift: !signals.empty?, signals: signals }
  if json_mode
    puts JSON.pretty_generate(result)
  else
    puts(signals.empty? ? "No documentation drift signals." : "Documentation drift signals:")
    signals.each { |path| puts "- #{path}" }
  end
  exit(signals.empty? ? 0 : 1)
else
  abort("Unknown command: #{command}")
end
RUBY
