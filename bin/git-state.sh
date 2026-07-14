#!/bin/bash

# Read-only git working state for Xoch checkpoints and diagnostics.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  git-state.sh inspect [--root ROOT] [--json]
EOF
}

command="${1:-}"
[ "$command" = "inspect" ] || { usage; exit 2; }
shift

root="."
json_mode="false"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --root) root="$2"; shift 2 ;;
    --json) json_mode="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repository: $root" >&2; exit 2; }
git_dir="$(git -C "$root" rev-parse --absolute-git-dir)"

ruby -rjson -rshellwords - "$root" "$git_dir" "$json_mode" <<'RUBY'
root, git_dir, json_mode = ARGV
root = File.expand_path(root)
json_mode = json_mode == "true"

git = ->(*args) { `git -C #{root.shellescape} #{args.map(&:shellescape).join(" ")} 2>/dev/null`.strip }
branch = git.call("branch", "--show-current")
upstream = git.call("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}")
ahead = upstream.empty? ? 0 : git.call("rev-list", "--count", "#{upstream}..HEAD").to_i
porcelain = git.call("status", "--porcelain=v1").lines.map(&:strip).reject(&:empty?)
conflicts = git.call("diff", "--name-only", "--diff-filter=U").lines.map(&:strip).reject(&:empty?)

operations = []
operations << "merge" if File.exist?(File.join(git_dir, "MERGE_HEAD"))
operations << "cherry-pick" if File.exist?(File.join(git_dir, "CHERRY_PICK_HEAD"))
operations << "revert" if File.exist?(File.join(git_dir, "REVERT_HEAD"))
operations << "rebase" if Dir.exist?(File.join(git_dir, "rebase-merge")) || Dir.exist?(File.join(git_dir, "rebase-apply"))

result = {
  root: root,
  branch: branch.empty? ? nil : branch,
  upstream: upstream.empty? ? nil : upstream,
  dirty: !porcelain.empty?,
  changed_count: porcelain.length,
  changed_entries: porcelain,
  ahead: ahead,
  operation: operations.empty? ? nil : operations.join("+"),
  conflicts: conflicts,
  clean_handoff: porcelain.empty? && ahead.zero? && operations.empty? && conflicts.empty?
}

if json_mode
  puts JSON.pretty_generate(result)
else
  puts "Branch: #{result[:branch] || "detached"}"
  puts "Upstream: #{result[:upstream] || "none"}"
  puts "Dirty: #{result[:dirty]} (#{result[:changed_count]} entries)"
  puts "Ahead: #{result[:ahead]}"
  puts "Operation: #{result[:operation] || "none"}"
  puts "Conflicts: #{result[:conflicts].empty? ? "none" : result[:conflicts].join(", ")}"
end
RUBY
