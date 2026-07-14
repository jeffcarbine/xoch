#!/bin/bash

# Maintain explicit Xoch ignore rules without hiding shareable docs by accident.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  gitignore-actions.sh ensure [--root ROOT] [--mode shared-docs|local-all] [--repair] [--dry-run]
EOF
}

command="${1:-}"
[ "$command" = "ensure" ] || { usage; exit 2; }
shift

root="."
mode="shared-docs"
repair="false"
dry_run="false"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --root) root="$2"; shift 2 ;;
    --mode) mode="$2"; shift 2 ;;
    --repair) repair="true"; shift ;;
    --dry-run) dry_run="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

ruby - "$root" "$mode" "$repair" "$dry_run" <<'RUBY'
root, mode, repair, dry_run = ARGV
root = File.expand_path(root)
repair = repair == "true"
dry_run = dry_run == "true"
abort("--mode must be shared-docs or local-all") unless %w[shared-docs local-all].include?(mode)
path = File.join(root, ".gitignore")
text = File.file?(path) ? File.read(path) : ""
lines = text.lines.map(&:chomp)
broad_indexes = lines.each_index.select { |index| %w[.xoch/ /.xoch/ .xoch /.xoch].include?(lines[index].strip) }

if mode == "shared-docs" && broad_indexes.any? && !repair
  warn "A broad .xoch ignore rule hides docs and glossaries. Rerun with --repair to replace it safely."
  exit 1
end

if repair
  lines = lines.each_with_index.reject { |_, index| broad_indexes.include?(index) }.map(&:first)
end

block = if mode == "local-all"
  ["# Xoch local state and documentation", "/.xoch/"]
else
  [
    "# Xoch local workflow state; share project docs and glossaries",
    "/.xoch/*",
    "!/.xoch/docs/",
    "!/.xoch/glossaries/"
  ]
end

missing = block.reject { |line| lines.include?(line) }
if missing.empty?
  puts "Xoch gitignore rules already current: #{path}"
  exit 0
end

lines << "" unless lines.empty? || lines.last.empty?
lines.concat(missing)
rendered = lines.join("\n").sub(/\n*\z/, "\n")
if dry_run
  puts rendered
else
  File.write(path, rendered)
  puts "Xoch gitignore rules updated: #{path}"
end
RUBY
