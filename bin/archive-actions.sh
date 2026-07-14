#!/bin/bash

# Safe archive and restore operations for Xoch job and arc folders.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  archive-actions.sh archive --kind job|arc --id ID [--root ROOT] [--dry-run]
  archive-actions.sh restore --kind job|arc [--id ID | --archive PATH] [--root ROOT] [--dry-run]
EOF
}

command="${1:-}"
[ -n "$command" ] || { usage; exit 2; }
shift

kind=""
id=""
archive_path=""
root="."
dry_run="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --kind) kind="$2"; shift 2 ;;
    --id) id="$2"; shift 2 ;;
    --archive) archive_path="$2"; shift 2 ;;
    --root) root="$2"; shift 2 ;;
    --dry-run) dry_run="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

ruby -rfileutils - "$command" "$kind" "$id" "$archive_path" "$root" "$dry_run" <<'RUBY'
command, kind, id, archive_arg, root, dry_run = ARGV
root = File.expand_path(root)
dry_run = dry_run == "true"
abort("--kind must be job or arc") unless %w[job arc].include?(kind)
abort("Unknown command: #{command}") unless %w[archive restore].include?(command)

plural = kind == "job" ? "jobs" : "arcs"
base = File.join(root, ".xoch", "work", plural)
archive_root = File.join(base, "archive")

def valid_id!(id)
  abort("A safe --id is required") unless id && id.match?(/\A[a-zA-Z0-9][a-zA-Z0-9._-]*\z/)
end

def points_to_job?(root, id)
  pointer = File.join(root, ".xoch", "work", "current.md")
  File.file?(pointer) && File.read(pointer).include?("**Job ID**: #{id}")
end

case command
when "archive"
  valid_id!(id)
  abort("Clear or pause the active job before archiving: #{id}") if kind == "job" && points_to_job?(root, id)
  source = File.join(base, id)
  abort("Active #{kind} folder not found: #{source}") unless Dir.exist?(source)
  FileUtils.mkdir_p(archive_root) unless dry_run
  stem = "#{id}-archive-#{Time.now.strftime("%Y-%m-%d")}" 
  destination = File.join(archive_root, stem)
  suffix = 2
  while File.exist?(destination)
    destination = File.join(archive_root, "#{stem}-#{suffix}")
    suffix += 1
  end
  puts "Archive #{dry_run ? "plan" : "move"}: #{source} -> #{destination}"
  FileUtils.mv(source, destination) unless dry_run
when "restore"
  source = nil
  if !archive_arg.empty?
    source = File.expand_path(archive_arg, root)
    allowed = File.expand_path(archive_root)
    abort("Archive path is outside #{allowed}: #{source}") unless source.start_with?(allowed + File::SEPARATOR)
  else
    valid_id!(id)
    candidates = Dir.glob(File.join(archive_root, "#{id}-archive-*"), File::FNM_CASEFOLD).select { |path| Dir.exist?(path) }
    abort("No archive found for #{kind}: #{id}") if candidates.empty?
    source = candidates.max_by { |path| File.mtime(path) }
  end
  abort("Archive folder not found: #{source}") unless Dir.exist?(source)
  restored_id = id.empty? ? File.basename(source).sub(/-archive-\d{4}-\d{2}-\d{2}(?:-\d+)?\z/, "") : id
  valid_id!(restored_id)
  destination = File.join(base, restored_id)
  abort("Refusing to overwrite active #{kind}: #{destination}") if File.exist?(destination)
  puts "Restore #{dry_run ? "plan" : "move"}: #{source} -> #{destination}"
  FileUtils.mv(source, destination) unless dry_run
end
RUBY
