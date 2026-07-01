#!/bin/bash

# Xoch deterministic helper actions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

die() {
  echo "Error: $*" >&2
  exit 1
}

today() {
  date +%Y-%m-%d
}

json_escape() {
  ruby -rjson -e 'print ARGV[0].to_json' "$1"
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
}

generate_id() {
  if [ -n "${1:-}" ]; then
    "$SCRIPT_DIR/generateJobId.sh" --id "$1"
  else
    "$SCRIPT_DIR/generateJobId.sh"
  fi
}

usage() {
  cat <<'EOF'
Usage:
  xoch-actions.sh job current [--json]
  xoch-actions.sh job open --id ID --title TITLE [--description TEXT] [--arc ARC] [--doc-scope SCOPE] [--doc-path PATH]
  xoch-actions.sh job set-current --job ID
  xoch-actions.sh state set --job ID --field FIELD --value VALUE
  xoch-actions.sh pointer clear --job ID
  xoch-actions.sh arc open --id ID --title TITLE [--purpose TEXT] [--success TEXT] [--doc-scope SCOPE] [--doc-path PATH] [--adopt-active]
  xoch-actions.sh snapshot create --job ID --phase N --title TITLE [--status STATUS] [--next NEXT] [--body-file FILE]
  xoch-actions.sh phase advance --job ID --phase N [--next-phase N] [--next-title TITLE] [--next-goal TEXT] [--next-files CSV] [--next-ac CSV] [--next-validation CSV]
EOF
}

require_project_root() {
  [ -d ".xoch" ] || mkdir -p ".xoch"
}

parse_current_file() {
  local file="$1"
  local mode="${2:-text}"
  ruby -rjson - "$file" "$mode" <<'RUBY'
file, mode = ARGV
text = File.read(file)
data = {}
text.each_line do |line|
  if line =~ /^\*\*(.+?)\*\*:\s*(.*)$/
    match = Regexp.last_match
    key = match[1].downcase.gsub(/[^a-z0-9]+/, "_").gsub(/^_|_$/, "")
    data[key] = match[2].strip
  end
end
data["pointer"] = file
if mode == "json"
  puts JSON.pretty_generate(data)
else
  data.each { |k, v| puts "#{k}: #{v}" }
end
RUBY
}

job_current() {
  local mode="text"
  [ "${1:-}" = "--json" ] && mode="json"

  if [ -f ".xoch/work/current.md" ]; then
    parse_current_file ".xoch/work/current.md" "$mode"
  elif [ -f ".xoch/context/current.md" ]; then
    parse_current_file ".xoch/context/current.md" "$mode"
  else
    [ "$mode" = "json" ] && echo "{}" || echo "No active Xoch job."
  fi
}

write_current() {
  local job_id="$1"
  local title="$2"
  local arc="$3"
  local status="$4"
  local phase="$5"
  local next_command="$6"
  local started="$7"
  local job_dir=".xoch/work/jobs/$job_id/"

  mkdir -p ".xoch/work"
  cat > ".xoch/work/current.md" <<EOF
# Current Job

**Job ID**: $job_id
**Title**: $title
**Arc**: $arc
**Status**: $status
**Current Phase**: $phase
**Next Command**: $next_command
**Job Directory**: $job_dir
**Started**: $started
EOF
}

job_open() {
  local id="" title="" description="" arc="standalone" doc_scope="unknown" doc_path="unknown"
  while [ $# -gt 0 ]; do
    case "$1" in
      --id) id="$2"; shift 2 ;;
      --title) title="$2"; shift 2 ;;
      --description) description="$2"; shift 2 ;;
      --arc) arc="$2"; shift 2 ;;
      --doc-scope) doc_scope="$2"; shift 2 ;;
      --doc-path) doc_path="$2"; shift 2 ;;
      *) die "unknown job open option: $1" ;;
    esac
  done

  [ -n "$title" ] || die "job open requires --title"
  id="$(generate_id "${id:-$title}")"
  description="${description:-$title}"
  local started
  started="$(today)"
  local job_dir=".xoch/work/jobs/$id"

  mkdir -p "$job_dir/notes" "$job_dir/phases" "$job_dir/revisions" "$job_dir/snapshots"
  cat > "$job_dir/state.md" <<EOF
job_id: $id
title: $title
description: $description
status: active
arc: $arc
current_phase: null
phase_count: 0
current_phase_title: null
current_phase_goal: null
current_phase_files: []
current_phase_acceptance_criteria: []
current_phase_validation: []
phase_index: []
documentation_targets:
  - scope: $doc_scope
    path: $doc_path
decisions: []
risks: []
unresolved_questions: []
review_status: null
closure_status: null
next_command: xoch-spec
started: $started
last_updated: $started
EOF
  write_current "$id" "$title" "$arc" "active" "none" "xoch-spec" "$started"

  echo "Job opened: $id"
  echo "Job directory: $job_dir"
}

job_set_current() {
  local job_id=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --job) job_id="$2"; shift 2 ;;
      *) die "unknown job set-current option: $1" ;;
    esac
  done
  [ -n "$job_id" ] || die "job set-current requires --job"
  local state=".xoch/work/jobs/$job_id/state.md"
  [ -f "$state" ] || die "state not found: $state"

  ruby -rfileutils - "$state" <<'RUBY'
state = ARGV[0]
data = {}
File.readlines(state).each do |line|
  if line =~ /^([A-Za-z0-9_]+):\s*(.*)$/
    data[Regexp.last_match(1)] = Regexp.last_match(2).strip
  end
end
job_id = data["job_id"] || File.basename(File.dirname(state))
title = data["title"] || job_id
arc = data["arc"] || "standalone"
status = data["status"] || "active"
phase = data["current_phase"] || "none"
next_command = data["next_command"] || "xoch-spec"
started = data["started"] || Time.now.strftime("%Y-%m-%d")
FileUtils.mkdir_p(".xoch/work")
File.write(".xoch/work/current.md", <<~MD)
  # Current Job

  **Job ID**: #{job_id}
  **Title**: #{title}
  **Arc**: #{arc}
  **Status**: #{status}
  **Current Phase**: #{phase}
  **Next Command**: #{next_command}
  **Job Directory**: .xoch/work/jobs/#{job_id}/
  **Started**: #{started}
MD
RUBY
  echo "Current job set: $job_id"
}

state_set() {
  local job_id="" field="" value=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --job) job_id="$2"; shift 2 ;;
      --field) field="$2"; shift 2 ;;
      --value) value="$2"; shift 2 ;;
      *) die "unknown state set option: $1" ;;
    esac
  done
  [ -n "$job_id" ] || die "state set requires --job"
  [ -n "$field" ] || die "state set requires --field"
  local state=".xoch/work/jobs/$job_id/state.md"
  [ -f "$state" ] || die "state not found: $state"
  ruby - "$state" "$field" "$value" "$(today)" <<'RUBY'
state, field, value, today = ARGV
lines = File.readlines(state, chomp: true)
found = false
lines = lines.map do |line|
  if line =~ /^#{Regexp.escape(field)}:/
    found = true
    "#{field}: #{value}"
  elsif line =~ /^last_updated:/
    "last_updated: #{today}"
  else
    line
  end
end
lines << "#{field}: #{value}" unless found
lines << "last_updated: #{today}" unless lines.any? { |line| line.start_with?("last_updated:") }
File.write(state, lines.join("\n") + "\n")
RUBY
  echo "Updated $state: $field=$value"
}

pointer_clear() {
  local job_id=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --job) job_id="$2"; shift 2 ;;
      *) die "unknown pointer clear option: $1" ;;
    esac
  done
  [ -n "$job_id" ] || die "pointer clear requires --job"
  ruby - "$job_id" <<'RUBY'
job_id = ARGV[0]
[".xoch/work/current.md", ".xoch/context/current.md"].each do |file|
  next unless File.file?(file)
  text = File.read(file)
  if text.include?("**Job ID**: #{job_id}") || text.include?("**Task ID**: #{job_id}")
    File.delete(file)
    puts "Cleared pointer: #{file}"
  end
end
RUBY
}

arc_open() {
  local id="" title="" purpose="" success="" doc_scope="unknown" doc_path="unknown" adopt_active="false"
  while [ $# -gt 0 ]; do
    case "$1" in
      --id) id="$2"; shift 2 ;;
      --title) title="$2"; shift 2 ;;
      --purpose) purpose="$2"; shift 2 ;;
      --success) success="$2"; shift 2 ;;
      --doc-scope) doc_scope="$2"; shift 2 ;;
      --doc-path) doc_path="$2"; shift 2 ;;
      --adopt-active) adopt_active="true"; shift ;;
      *) die "unknown arc open option: $1" ;;
    esac
  done
  [ -n "$title" ] || die "arc open requires --title"
  id="${id:-$(slugify "$title")}"
  purpose="${purpose:-$title}"
  success="${success:-TBD}"
  local started
  started="$(today)"
  local arc_dir=".xoch/work/arcs/$id"
  mkdir -p "$arc_dir/notes" "$arc_dir/revisions"
  cat > "$arc_dir/state.md" <<EOF
arc_id: $id
title: $title
purpose: $purpose
status: active
documentation_targets:
  - scope: $doc_scope
    path: $doc_path
success_outcome: $success
risks: []
unresolved_questions: []
started: $started
last_updated: $started
next_command: xoch-open-job
EOF
  local active_line="- None"
  if [ "$adopt_active" = "true" ] && [ -f ".xoch/work/current.md" ]; then
    local current_job current_title
    current_job="$(awk -F': ' '/\*\*Job ID\*\*/ {print $2}' .xoch/work/current.md | head -1)"
    current_title="$(awk -F': ' '/\*\*Title\*\*/ {print $2}' .xoch/work/current.md | head -1)"
    if [ -n "$current_job" ]; then
      active_line="- \`$current_job\` - ${current_title:-unknown}"
      [ -f ".xoch/work/jobs/$current_job/state.md" ] && ruby - ".xoch/work/jobs/$current_job/state.md" "$id" "$(today)" <<'RUBY'
state, arc, today = ARGV
lines = File.readlines(state, chomp: true)
found = false
lines = lines.map do |line|
  if line =~ /^arc:/
    found = true
    "arc: #{arc}"
  elsif line =~ /^last_updated:/
    "last_updated: #{today}"
  else
    line
  end
end
lines << "arc: #{arc}" unless found
File.write(state, lines.join("\n") + "\n")
RUBY
    fi
  fi
  cat > "$arc_dir/jobs.md" <<EOF
# Arc Jobs - $id

## Active

$active_line

## Planned

- None

## Complete

- None

## Parked

- None
EOF
  cat > "$arc_dir/notes.md" <<EOF
# Arc Notes - $id

Opened: $started
EOF
  echo "Arc opened: $id"
  echo "Arc directory: $arc_dir"
}

snapshot_create() {
  local job_id="" phase="" title="" status="Complete" next_text="" body_file=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --job) job_id="$2"; shift 2 ;;
      --phase) phase="$2"; shift 2 ;;
      --title) title="$2"; shift 2 ;;
      --status) status="$2"; shift 2 ;;
      --next) next_text="$2"; shift 2 ;;
      --body-file) body_file="$2"; shift 2 ;;
      *) die "unknown snapshot create option: $1" ;;
    esac
  done
  [ -n "$job_id" ] || die "snapshot create requires --job"
  [ -n "$phase" ] || die "snapshot create requires --phase"
  title="${title:-Phase $phase}"
  next_text="${next_text:-TBD}"
  local dir=".xoch/work/jobs/$job_id/snapshots"
  mkdir -p "$dir"
  local file="$dir/phase-$phase.md"
  if [ -n "$body_file" ]; then
    [ -f "$body_file" ] || die "body file not found: $body_file"
    cp "$body_file" "$file"
  else
    cat > "$file" <<EOF
# Phase $phase Snapshot - $title

**Completed**: $(today)
**Status**: $status

## What Changed

TBD

## Files Changed

- TBD

## Acceptance Criteria

- TBD

## Validation

- TBD

## Additional Notes

- TBD

## Next

$next_text
EOF
  fi
  echo "Snapshot written: $file"
}

phase_advance() {
  local job_id="" phase="" next_phase="" next_title="" next_goal="" next_files="" next_ac="" next_validation=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --job) job_id="$2"; shift 2 ;;
      --phase) phase="$2"; shift 2 ;;
      --next-phase) next_phase="$2"; shift 2 ;;
      --next-title) next_title="$2"; shift 2 ;;
      --next-goal) next_goal="$2"; shift 2 ;;
      --next-files) next_files="$2"; shift 2 ;;
      --next-ac) next_ac="$2"; shift 2 ;;
      --next-validation) next_validation="$2"; shift 2 ;;
      *) die "unknown phase advance option: $1" ;;
    esac
  done
  [ -n "$job_id" ] || die "phase advance requires --job"
  [ -n "$phase" ] || die "phase advance requires --phase"
  local job_dir=".xoch/work/jobs/$job_id"
  local state="$job_dir/state.md"
  local phases="$job_dir/phases.md"
  [ -f "$state" ] || die "state not found: $state"

  ruby - "$state" "$phases" "$phase" "$next_phase" "$next_title" "$next_goal" "$next_files" "$next_ac" "$next_validation" "$(today)" <<'RUBY'
state, phases, phase, next_phase, next_title, next_goal, next_files, next_ac, next_validation, today = ARGV

def csv_lines(value)
  value.to_s.split(",").map(&:strip).reject(&:empty?)
end

phase_entries = []
if File.file?(phases)
  text = File.read(phases)
  text = text.sub(/(## Current Phase:\s*)\d+/, "\\1#{next_phase}") unless next_phase.empty?
  pattern = /(## Phase #{Regexp.escape(phase)}:.*?)(\*\*Status\*\*:\s*)([^\n]+)(.*?)(?=\n---\n|\n## Phase |\z)/m
  text = text.sub(pattern) { "#{Regexp.last_match(1)}#{Regexp.last_match(2)}Complete#{Regexp.last_match(4)}" }
  File.write(phases, text)
  text.scan(/^## Phase\s+(\d+):\s*(.*?)\n(.*?)(?=\n---\n|\n## Phase |\z)/m) do |number, title, body|
    status = body[/\*\*Status\*\*:\s*([^\n]+)/, 1] || "unknown"
    phase_entries << [number, title.strip, status.strip.downcase.gsub(/\s+/, "_")]
  end
end

lines = File.readlines(state, chomp: true)
updates = if next_phase.empty?
  {
    "status" => "implementation_complete",
    "current_phase" => "null",
    "phase_count" => phase_entries.length.to_s,
    "current_phase_title" => "null",
    "current_phase_goal" => "null",
    "current_phase_files" => "[]",
    "current_phase_acceptance_criteria" => "[]",
    "current_phase_validation" => "[]",
    "next_command" => "xoch-review",
    "last_updated" => today
  }
else
  {
    "status" => "phase_ready",
    "current_phase" => next_phase,
    "phase_count" => phase_entries.length.to_s,
    "current_phase_title" => next_title,
    "current_phase_goal" => next_goal,
    "next_command" => "xoch-make",
    "last_updated" => today
  }
end

skip_blocks = %w[current_phase_files current_phase_acceptance_criteria current_phase_validation phase_index]
out = []
i = 0
while i < lines.length
  line = lines[i]
  key = line[/^([A-Za-z0-9_]+):/, 1]
  if key && updates.key?(key)
    out << "#{key}: #{updates[key]}"
    i += 1
  elsif key && skip_blocks.include?(key)
    i += 1
    i += 1 while i < lines.length && lines[i] =~ /^\s+- /
  else
    out << line
    i += 1
  end
end

updates.each do |key, value|
  out << "#{key}: #{value}" unless out.any? { |line| line.start_with?("#{key}:") }
end

unless next_phase.empty?
  out << "current_phase_files:"
  csv_lines(next_files).each { |item| out << "  - #{item}" }
  out << "current_phase_acceptance_criteria:"
  csv_lines(next_ac).each { |item| out << "  - #{item}" }
  out << "current_phase_validation:"
  csv_lines(next_validation).each { |item| out << "  - #{item}" }
end

unless phase_entries.empty?
  out << "phase_index:"
  phase_entries.each do |number, title, status|
    out << "  - phase: #{number}, title: #{title}, status: #{status}"
  end
end

File.write(state, out.join("\n") + "\n")
RUBY
  echo "Phase advanced for job $job_id: $phase -> ${next_phase:-review}"
}

main() {
  require_project_root
  local group="${1:-}"
  local action="${2:-}"
  [ -n "$group" ] || { usage; exit 1; }
  shift || true
  shift || true

  case "$group:$action" in
    job:current) job_current "$@" ;;
    job:open) job_open "$@" ;;
    job:set-current) job_set_current "$@" ;;
    state:set) state_set "$@" ;;
    pointer:clear) pointer_clear "$@" ;;
    arc:open) arc_open "$@" ;;
    snapshot:create) snapshot_create "$@" ;;
    phase:advance) phase_advance "$@" ;;
    -h:*|--help:*|:*) usage ;;
    *) die "unknown action: $group $action" ;;
  esac
}

main "$@"
