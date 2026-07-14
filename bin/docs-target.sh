#!/bin/bash

# Resolve a changed path to the nearest durable documentation boundary.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  docs-target.sh resolve --path PATH [--root ROOT] [--manifest FILE] [--json]
EOF
}

command="${1:-}"
[ "$command" = "resolve" ] || { usage; exit 2; }
shift

root="."
path=""
manifest=".xoch/docs/readme-packets.json"
json_mode="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --root) root="$2"; shift 2 ;;
    --path) path="$2"; shift 2 ;;
    --manifest) manifest="$2"; shift 2 ;;
    --json) json_mode="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[ -n "$path" ] || { echo "--path is required" >&2; exit 2; }

ruby -rjson - "$root" "$path" "$manifest" "$json_mode" <<'RUBY'
root, path, manifest, json_mode = ARGV
root = File.expand_path(root)
target = File.expand_path(path, root)
json_mode = json_mode == "true"
abort("Path escapes project root: #{path}") unless target == root || target.start_with?(root + File::SEPARATOR)

directory = File.directory?(target) ? target : File.dirname(target)
readme = nil
cursor = directory
loop do
  candidate = File.join(cursor, "README.md")
  if File.file?(candidate) && cursor != root
    readme = candidate
    break
  end
  break if cursor == root
  parent = File.dirname(cursor)
  break if parent == cursor || !parent.start_with?(root)
  cursor = parent
end

manifest_path = File.expand_path(manifest, root)
result = if readme
  { path: path, scope: "feature", target: readme.delete_prefix(root + File::SEPARATOR), reason: "nearest nested README" }
else
  {
    path: path,
    scope: "root",
    target: File.file?(manifest_path) ? manifest_path.delete_prefix(root + File::SEPARATOR) : "README.md",
    reason: File.file?(manifest_path) ? "route through approved root packet manifest" : "no nested README or packet manifest found"
  }
end

if json_mode
  puts JSON.pretty_generate(result)
else
  puts "Scope: #{result[:scope]}"
  puts "Target: #{result[:target]}"
  puts "Reason: #{result[:reason]}"
end
RUBY
