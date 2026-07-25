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
    "$SCRIPT_DIR/generate-job-id.sh" --id "$1"
  else
    "$SCRIPT_DIR/generate-job-id.sh"
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
  xoch-actions.sh workflow begin --job ID --name NAME [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
  xoch-actions.sh workflow update --job ID [--name NAME] [--stage STAGE] [--pending ACTION] [--artifact PATH] [--return COMMAND]
  xoch-actions.sh workflow complete --job ID [--name NAME] [--next COMMAND]
  xoch-actions.sh workflow abandon --job ID [--name NAME] --reason TEXT [--next COMMAND]
  xoch-actions.sh arc open --id ID --title TITLE [--purpose TEXT] [--success TEXT] [--doc-scope SCOPE] [--doc-path PATH] [--adopt-active]
  xoch-actions.sh snapshot create --job ID --phase N --title TITLE [--status STATUS] [--next NEXT] [--body-file FILE]
  xoch-actions.sh phase advance --job ID --phase N [--next-phase N] [--next-title TITLE] [--next-goal TEXT] [--next-files CSV] [--next-ac CSV] [--next-validation CSV]
EOF
}

require_project_root() {
  [ -d ".xoch" ] || mkdir -p ".xoch"
}

job_current() {
  local mode="text"
  [ "${1:-}" = "--json" ] && mode="json"

  ruby -rjson -rfileutils -rtime - "$mode" <<'RUBY'
mode = ARGV[0]
json_path = ".xoch/work/current.json"
markdown_path = ".xoch/work/current.md"
legacy_path = ".xoch/context/current.md"

def markdown_fields(path)
  fields = {}
  File.readlines(path).each do |line|
    if line =~ /^\*\*(.+?)\*\*:\s*(.*)$/
      match = Regexp.last_match
      key = match[1].downcase.gsub(/[^a-z0-9]+/, "_").gsub(/^_|_$/, "")
      fields[key] = match[2].strip
    end
  end
  fields
end

def scalar_state(path)
  return {} unless File.file?(path)
  File.readlines(path).each_with_object({}) do |line, data|
    data[Regexp.last_match(1)] = Regexp.last_match(2).strip if line =~ /^([A-Za-z0-9_]+):\s*(.*)$/
  end
end

def nullable(value)
  value.nil? || value.empty? || value == "null" ? nil : value
end

def workflow_from_state(state, existing = nil)
  active = nullable(state["active_workflow"])
  return nil unless active
  workflow = {
    "name" => active,
    "stage" => nullable(state["workflow_stage"]) || "in_progress",
    "pending_action" => nullable(state["pending_action"]) || "resume_workflow",
    "artifact" => nullable(state["workflow_artifact"]),
    "return_command" => nullable(state["return_command"]) || nullable(state["next_command"]) || active,
    "started_at" => nullable(state["workflow_started_at"]) || existing&.dig("started_at")
  }
  unchanged = existing && workflow.all? { |key, value| existing[key] == value }
  workflow["updated_at"] = unchanged ? existing["updated_at"] : Time.now.utc.iso8601
  workflow
end

def validate_pointer(data, path)
  abort("Invalid Xoch pointer version in #{path}") unless data["version"] == 1
  job = data["job"]
  abort("Invalid Xoch job pointer in #{path}") unless job.is_a?(Hash) && !job["id"].to_s.empty? && !job["directory"].to_s.empty?
  expected_directory = File.join(".xoch", "work", "jobs", job["id"].to_s)
  abort("Invalid Xoch job directory in #{path}") unless job["directory"].to_s.sub(%r{/\z}, "") == expected_directory
  workflow = data["workflow"]
  if workflow
    required = %w[name stage pending_action return_command]
    missing = required.select { |key| workflow[key].to_s.empty? }
    abort("Invalid Xoch workflow pointer in #{path}; missing #{missing.join(', ')}") unless missing.empty?
  end
end

data = nil
pointer = nil
if File.file?(json_path)
  begin
    data = JSON.parse(File.read(json_path))
  rescue JSON::ParserError => e
    abort("Invalid JSON in #{json_path}: #{e.message}")
  end
  validate_pointer(data, json_path)
  state = scalar_state(File.join(data.dig("job", "directory"), "state.md"))
  unless state.empty?
    projected_workflow = workflow_from_state(state, data["workflow"])
    if projected_workflow != data["workflow"]
      data["workflow"] = projected_workflow
      data["updated_at"] = Time.now.utc.iso8601
      temp = "#{json_path}.tmp.#{$$}"
      File.write(temp, JSON.pretty_generate(data) + "\n")
      File.rename(temp, json_path)
    end
  end
  pointer = json_path
elsif File.file?(markdown_path)
  fields = markdown_fields(markdown_path)
  job_id = fields["job_id"] || fields["task_id"]
  abort("Cannot migrate #{markdown_path}: job ID is missing") if job_id.to_s.empty?
  state = scalar_state(File.join(".xoch", "work", "jobs", job_id, "state.md"))
  workflow = workflow_from_state(state)
  data = {
    "version" => 1,
    "job" => {
      "id" => job_id,
      "title" => fields["title"] || state["title"] || job_id,
      "arc" => fields["arc"] || state["arc"] || "standalone",
      "directory" => fields["job_directory"] || File.join(".xoch", "work", "jobs", job_id)
    },
    "workflow" => workflow,
    "updated_at" => Time.now.utc.iso8601
  }
  FileUtils.mkdir_p(File.dirname(json_path))
  temp = "#{json_path}.tmp.#{$$}"
  File.write(temp, JSON.pretty_generate(data) + "\n")
  File.rename(temp, json_path)
  File.delete(markdown_path)
  pointer = json_path
elsif File.file?(legacy_path)
  fields = markdown_fields(legacy_path)
  data = {
    "version" => 1,
    "legacy" => true,
    "job" => {
      "id" => fields["job_id"] || fields["task_id"],
      "title" => fields["title"],
      "directory" => fields["job_directory"] || fields["task_directory"]
    },
    "workflow" => nil,
    "updated_at" => nil
  }
  pointer = legacy_path
end

if data.nil?
  puts(mode == "json" ? "{}" : "No active Xoch job.")
elsif mode == "json"
  data["pointer"] = pointer
  puts JSON.pretty_generate(data)
else
  puts "job_id: #{data.dig("job", "id")}"
  puts "job_directory: #{data.dig("job", "directory")}"
  puts "active_workflow: #{data.dig("workflow", "name") || "none"}"
  puts "workflow_stage: #{data.dig("workflow", "stage") || "none"}"
  puts "pointer: #{pointer}"
end
RUBY
}

write_current() {
  local job_id="$1"
  local title="$2"
  local arc="$3"
  local started="$4"
  local job_dir=".xoch/work/jobs/$job_id"

  mkdir -p ".xoch/work"
  ruby -rjson -rtime - "$job_id" "$title" "$arc" "$job_dir" "$started" <<'RUBY'
job_id, title, arc, job_dir, started = ARGV
path = ".xoch/work/current.json"
data = {
  "version" => 1,
  "job" => { "id" => job_id, "title" => title, "arc" => arc, "directory" => job_dir },
  "workflow" => nil,
  "started_at" => started,
  "updated_at" => Time.now.utc.iso8601
}
temp = "#{path}.tmp.#{$$}"
File.write(temp, JSON.pretty_generate(data) + "\n")
File.rename(temp, path)
File.delete(".xoch/work/current.md") if File.file?(".xoch/work/current.md")
RUBY
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
active_workflow: null
workflow_stage: null
pending_action: null
workflow_artifact: null
return_command: null
workflow_started_at: null
review_status: null
closure_status: null
next_command: xoch-spec
started: $started
last_updated: $started
EOF
  write_current "$id" "$title" "$arc" "$started"

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

  ruby -rjson -rfileutils -rtime - "$state" <<'RUBY'
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
started = data["started"] || Time.now.strftime("%Y-%m-%d")
active = data["active_workflow"]
active = nil if active.nil? || active.empty? || active == "null"
workflow = active ? {
  "name" => active,
  "stage" => (data["workflow_stage"] == "null" ? nil : data["workflow_stage"]) || "in_progress",
  "pending_action" => (data["pending_action"] == "null" ? nil : data["pending_action"]) || "resume_workflow",
  "artifact" => data["workflow_artifact"] == "null" ? nil : data["workflow_artifact"],
  "return_command" => (data["return_command"] == "null" ? nil : data["return_command"]) || data["next_command"] || active,
  "started_at" => data["workflow_started_at"] == "null" ? nil : data["workflow_started_at"],
  "updated_at" => Time.now.utc.iso8601
} : nil
FileUtils.mkdir_p(".xoch/work")
path = ".xoch/work/current.json"
pointer = {
  "version" => 1,
  "job" => { "id" => job_id, "title" => title, "arc" => arc, "directory" => ".xoch/work/jobs/#{job_id}" },
  "workflow" => workflow,
  "started_at" => started,
  "updated_at" => Time.now.utc.iso8601
}
temp = "#{path}.tmp.#{$$}"
File.write(temp, JSON.pretty_generate(pointer) + "\n")
File.rename(temp, path)
File.delete(".xoch/work/current.md") if File.file?(".xoch/work/current.md")
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

workflow_action() {
  local action="$1"
  shift
  local job_id="" name="" stage="" pending="" artifact="" return_command="" next_command="" reason=""
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --job) job_id="$2"; shift 2 ;;
      --name) name="$2"; shift 2 ;;
      --stage) stage="$2"; shift 2 ;;
      --pending) pending="$2"; shift 2 ;;
      --artifact) artifact="$2"; shift 2 ;;
      --return) return_command="$2"; shift 2 ;;
      --next) next_command="$2"; shift 2 ;;
      --reason) reason="$2"; shift 2 ;;
      *) die "unknown workflow $action option: $1" ;;
    esac
  done

  [ -n "$job_id" ] || die "workflow $action requires --job"
  [ "$action" != "begin" ] || [ -n "$name" ] || die "workflow begin requires --name"
  [ "$action" != "abandon" ] || [ -n "$reason" ] || die "workflow abandon requires --reason"

  # Reading current state also migrates a target-model current.md pointer.
  job_current --json >/dev/null

  ruby -rjson -rtime - "$action" "$job_id" "$name" "$stage" "$pending" "$artifact" "$return_command" "$next_command" "$reason" <<'RUBY'
action, job_id, name, stage, pending, artifact, return_command, next_command, reason = ARGV
pointer_path = ".xoch/work/current.json"
state_path = File.join(".xoch", "work", "jobs", job_id, "state.md")
abort("Current Xoch pointer not found: #{pointer_path}") unless File.file?(pointer_path)
abort("Job state not found: #{state_path}") unless File.file?(state_path)

pointer = JSON.parse(File.read(pointer_path))
abort("Current job is #{pointer.dig("job", "id")}, not #{job_id}") unless pointer.dig("job", "id") == job_id

def scalar_state(path)
  File.readlines(path).each_with_object({}) do |line, data|
    data[Regexp.last_match(1)] = Regexp.last_match(2).strip if line =~ /^([A-Za-z0-9_]+):\s*(.*)$/
  end
end

def nullable(value)
  value.nil? || value.empty? || value == "null" ? nil : value
end

def validate_token!(label, value)
  abort("Invalid #{label}: #{value}") unless value.match?(/\A[a-z][a-z0-9_-]*\z/)
end

def update_state(path, updates)
  lines = File.readlines(path, chomp: true)
  found = {}
  lines.map! do |line|
    key = updates.keys.find { |candidate| line.start_with?("#{candidate}:") }
    if key
      found[key] = true
      "#{key}: #{updates[key]}"
    else
      line
    end
  end
  updates.each { |key, value| lines << "#{key}: #{value}" unless found[key] }
  File.write(path, lines.join("\n") + "\n")
end

state = scalar_state(state_path)
workflow = pointer["workflow"]
now = Time.now.utc.iso8601
today = Time.now.strftime("%Y-%m-%d")

case action
when "begin"
  abort("Workflow already active: #{workflow["name"]}") if workflow
  validate_token!("workflow name", name)
  stage = "in_progress" if stage.empty?
  pending = "continue_workflow" if pending.empty?
  validate_token!("workflow stage", stage)
  validate_token!("pending action", pending)
  return_command = nullable(state["next_command"]) || name if return_command.empty?
  validate_token!("return command", return_command)
  unless artifact.empty?
    abort("Workflow artifact must be job-relative") if artifact.start_with?("/") || artifact.split("/").include?("..")
  end
  workflow = {
    "name" => name,
    "stage" => stage,
    "pending_action" => pending,
    "artifact" => artifact.empty? ? nil : artifact,
    "return_command" => return_command,
    "started_at" => now,
    "updated_at" => now
  }
  updates = {
    "active_workflow" => name,
    "workflow_stage" => stage,
    "pending_action" => pending,
    "workflow_artifact" => artifact.empty? ? "null" : artifact,
    "return_command" => return_command,
    "workflow_started_at" => now,
    "next_command" => name,
    "last_updated" => today
  }
when "update"
  abort("No active workflow") unless workflow
  abort("Workflow name does not match: #{workflow["name"]}") unless name.empty? || name == workflow["name"]
  unless stage.empty?
    validate_token!("workflow stage", stage)
    workflow["stage"] = stage
  end
  unless pending.empty?
    validate_token!("pending action", pending)
    workflow["pending_action"] = pending
  end
  unless artifact.empty?
    abort("Workflow artifact must be job-relative") if artifact.start_with?("/") || artifact.split("/").include?("..")
    workflow["artifact"] = artifact
  end
  unless return_command.empty?
    validate_token!("return command", return_command)
    workflow["return_command"] = return_command
  end
  workflow["updated_at"] = now
  updates = {
    "active_workflow" => workflow["name"],
    "workflow_stage" => workflow["stage"],
    "pending_action" => workflow["pending_action"],
    "workflow_artifact" => workflow["artifact"] || "null",
    "return_command" => workflow["return_command"],
    "workflow_started_at" => workflow["started_at"] || now,
    "next_command" => workflow["name"],
    "last_updated" => today
  }
when "complete", "abandon"
  abort("No active workflow") unless workflow
  abort("Workflow name does not match: #{workflow["name"]}") unless name.empty? || name == workflow["name"]
  if action == "complete" && workflow["artifact"] && workflow["pending_action"].to_s.match?(/\A(finalize|write|record)_/)
    job_root = File.expand_path(pointer.dig("job", "directory"))
    artifact_path = File.expand_path(workflow["artifact"], job_root)
    abort("Workflow artifact escapes job directory") unless artifact_path.start_with?(job_root + File::SEPARATOR)
    abort("Required workflow artifact not found: #{artifact_path}") unless File.file?(artifact_path)
    if workflow["pending_action"].to_s.start_with?("finalize_") && File.read(artifact_path).match?(/^\*\*Status\*\*:\s*Draft\s*$/i)
      abort("Workflow artifact is still marked Draft: #{artifact_path}")
    end
  end
  destination = next_command.empty? ? workflow["return_command"] : next_command
  validate_token!("next command", destination)
  updates = {
    "active_workflow" => "null",
    "workflow_stage" => "null",
    "pending_action" => "null",
    "workflow_artifact" => "null",
    "return_command" => "null",
    "workflow_started_at" => "null",
    "last_workflow" => workflow["name"],
    "last_workflow_status" => action == "complete" ? "complete" : "abandoned",
    "last_workflow_reason" => action == "complete" ? "completed" : reason.gsub(/[\r\n]+/, " "),
    "next_command" => destination,
    "last_updated" => today
  }
  workflow = nil
else
  abort("Unknown workflow action: #{action}")
end

update_state(state_path, updates)
pointer["workflow"] = workflow
pointer["updated_at"] = now
temp = "#{pointer_path}.tmp.#{$$}"
File.write(temp, JSON.pretty_generate(pointer) + "\n")
File.rename(temp, pointer_path)
label = action == "complete" ? "completed" : action == "abandon" ? "abandoned" : action
puts(action == "complete" || action == "abandon" ? "Workflow #{label}: #{updates["last_workflow"]}" : "Workflow #{label}: #{workflow["name"]} (#{workflow["stage"]})")
RUBY
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
  ruby -rjson - "$job_id" <<'RUBY'
job_id = ARGV[0]
json_path = ".xoch/work/current.json"
if File.file?(json_path)
  data = JSON.parse(File.read(json_path))
  if data.dig("job", "id") == job_id
    File.delete(json_path)
    puts "Cleared pointer: #{json_path}"
  end
end
[".xoch/work/current.md", ".xoch/context/current.md"].each do |file|
  next unless File.file?(file)
  text = File.read(file)
  next unless text.include?("**Job ID**: #{job_id}") || text.include?("**Task ID**: #{job_id}")
  File.delete(file)
  puts "Cleared pointer: #{file}"
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
  if [ "$adopt_active" = "true" ]; then
    job_current --json >/dev/null
  fi
  if [ "$adopt_active" = "true" ] && [ -f ".xoch/work/current.json" ]; then
    local current_job current_title
    current_job="$(ruby -rjson -e 'print JSON.parse(File.read(ARGV[0])).dig("job", "id")' .xoch/work/current.json)"
    current_title="$(ruby -rjson -e 'print JSON.parse(File.read(ARGV[0])).dig("job", "title")' .xoch/work/current.json)"
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
    workflow:begin) workflow_action begin "$@" ;;
    workflow:update) workflow_action update "$@" ;;
    workflow:complete) workflow_action complete "$@" ;;
    workflow:abandon) workflow_action abandon "$@" ;;
    arc:open) arc_open "$@" ;;
    snapshot:create) snapshot_create "$@" ;;
    phase:advance) phase_advance "$@" ;;
    -h:*|--help:*|:*) usage ;;
    *) die "unknown action: $group $action" ;;
  esac
}

main "$@"
