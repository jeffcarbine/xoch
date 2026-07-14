#!/bin/bash

# Acceptance-criteria coverage checks for Xoch jobs.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  coverage-actions.sh compare --job ID [--root ROOT] [--require plan|snapshots|review|all] [--json]
  coverage-actions.sh create-review --job ID [--root ROOT] [--force]
EOF
}

command="${1:-}"
[ -n "$command" ] || { usage; exit 2; }
shift

job=""
root="."
json_mode="false"
force="false"
require_stage="all"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --job) job="$2"; shift 2 ;;
    --root) root="$2"; shift 2 ;;
    --json) json_mode="true"; shift ;;
    --force) force="true"; shift ;;
    --require) require_stage="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[ -n "$job" ] || { echo "--job is required" >&2; exit 2; }

ruby -rjson -rfileutils - "$command" "$job" "$root" "$json_mode" "$force" "$require_stage" <<'RUBY'
command, job, root, json_mode, force, require_stage = ARGV
root = File.expand_path(root)
job_dir = File.join(root, ".xoch", "work", "jobs", job)
abort("Job folder not found: #{job_dir}") unless Dir.exist?(job_dir)

def criteria(path)
  return [] unless File.file?(path)
  File.read(path).scan(/\bAC(?:-NF)?-\d+\b/i).map(&:upcase).uniq.sort
end

spec = File.join(job_dir, "spec.md")
plan = File.join(job_dir, "plan.md")
review = File.join(job_dir, "review.md")
snapshots = Dir.glob(File.join(job_dir, "snapshots", "*.md")).sort
spec_ids = criteria(spec)
plan_ids = criteria(plan)
review_ids = criteria(review)
snapshot_ids = snapshots.flat_map { |path| criteria(path) }.uniq.sort

result = {
  job: job,
  spec: spec_ids,
  plan: plan_ids,
  snapshots: snapshot_ids,
  review: review_ids,
  missing_from_plan: spec_ids - plan_ids,
  missing_from_snapshots: spec_ids - snapshot_ids,
  missing_from_review: spec_ids - review_ids,
  orphaned_in_plan: plan_ids - spec_ids,
  orphaned_in_snapshots: snapshot_ids - spec_ids,
  orphaned_in_review: review_ids - spec_ids
}

case command
when "compare"
  abort("No acceptance criteria found in #{spec}") if spec_ids.empty?
  abort("--require must be plan, snapshots, review, or all") unless %w[plan snapshots review all].include?(require_stage)
  if json_mode == "true"
    puts JSON.pretty_generate(result)
  else
    result.each do |key, value|
      next if key == :job
      puts "#{key}: #{value.empty? ? "none" : value.join(", ")}" 
    end
  end
  required_keys = case require_stage
  when "plan" then [:missing_from_plan]
  when "snapshots" then [:missing_from_plan, :missing_from_snapshots]
  when "review" then [:missing_from_plan, :missing_from_snapshots, :missing_from_review]
  else [:missing_from_plan, :missing_from_snapshots, :missing_from_review]
  end
  missing = result.values_at(*required_keys).flatten
  exit(missing.empty? ? 0 : 1)
when "create-review"
  abort("No acceptance criteria found in #{spec}") if spec_ids.empty?
  abort("Review already exists: #{review}") if File.exist?(review) && force != "true"
  rows = spec_ids.map { |id| "| #{id} | Not Verified | | |" }
  body = [
    "# Review - #{job}", "", "**Status**: In Progress", "",
    "## Acceptance Coverage", "",
    "| AC | Status | Evidence | Notes |",
    "|---|---|---|---|", *rows, "",
    "## Quality And Risk", "", "TBD", "",
    "## Documentation", "", "TBD", ""
  ].join("\n")
  File.write(review, body)
  puts "Review scaffolded: #{review}"
else
  abort("Unknown command: #{command}")
end
RUBY
