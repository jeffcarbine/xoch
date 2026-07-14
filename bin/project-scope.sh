#!/bin/bash

set -eo pipefail

usage() {
  cat <<'EOF'
Usage:
  project-scope.sh create --job ID --primary NAME=PATH --participant NAME=PATH [--participant NAME=PATH ...]
  project-scope.sh validate --scope PATH [--json]
  project-scope.sh role --scope PATH [--cwd PATH] [--json]
  project-scope.sh primary-job --scope PATH
  project-scope.sh projects --scope PATH [--json]

Multi-project scope is optional. Standalone Xoch jobs do not need projects.json.
EOF
}

die() {
  echo "Error: $*" >&2
  exit 2
}

command="${1:-}"
case "$command" in
  create|validate|role|primary-job|projects) shift ;;
  --help|-h) usage; exit 0 ;;
  "") usage >&2; exit 2 ;;
  *) die "unknown command: $command" ;;
esac

job=""
primary=""
scope=""
cwd="$PWD"
json_mode="false"
participants=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --job) job="${2:-}"; shift 2 ;;
    --primary) primary="${2:-}"; shift 2 ;;
    --participant) participants+=("${2:-}"); shift 2 ;;
    --scope) scope="${2:-}"; shift 2 ;;
    --cwd) cwd="${2:-}"; shift 2 ;;
    --json) json_mode="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

ruby -rjson -rfileutils -rtime - "$command" "$job" "$primary" "$scope" "$cwd" "$json_mode" "${participants[@]}" <<'RUBY'
command, job, primary_spec, scope_path, cwd, json_mode, *participant_specs = ARGV
json_mode = json_mode == "true"

def fail_with(message, code = 2)
  warn "Error: #{message}"
  exit code
end

def split_project(spec, label)
  name, path = spec.split("=", 2)
  fail_with("#{label} must use NAME=PATH") if name.to_s.empty? || path.to_s.empty?
  fail_with("invalid project name: #{name}") unless name.match?(/\A[A-Za-z0-9._-]+\z/)
  expanded = File.expand_path(path)
  fail_with("project path does not exist: #{expanded}", 1) unless Dir.exist?(expanded)
  [name, expanded]
end

def load_scope(path)
  fail_with("--scope is required") if path.to_s.empty?
  expanded = File.expand_path(path)
  fail_with("scope file not found: #{expanded}", 1) unless File.file?(expanded)
  [JSON.parse(File.read(expanded)), expanded]
rescue JSON::ParserError => e
  fail_with("invalid scope JSON: #{e.message}")
end

def scope_errors(data)
  errors = []
  projects = data["projects"]
  errors << "version must be 1" unless data["version"] == 1
  errors << "job_id is required" if data["job_id"].to_s.empty?
  errors << "mode must be multi-project" unless data["mode"] == "multi-project"
  errors << "primary is required" if data["primary"].to_s.empty?
  errors << "revision must be a non-negative integer" unless data["revision"].is_a?(Integer) && data["revision"] >= 0
  errors << "projects must contain at least two entries" unless projects.is_a?(Array) && projects.length >= 2
  return errors unless projects.is_a?(Array)

  names = {}
  paths = {}
  primary_count = 0
  projects.each_with_index do |project, index|
    unless project.is_a?(Hash)
      errors << "projects[#{index}] must be an object"
      next
    end
    name = project["name"].to_s
    role = project["role"]
    path = project["path"].to_s
    job_path = project["job_path"].to_s
    errors << "projects[#{index}].name is required" if name.empty?
    errors << "duplicate project name: #{name}" if names[name]
    names[name] = true unless name.empty?
    errors << "projects[#{index}].role must be primary or participant" unless %w[primary participant].include?(role)
    primary_count += 1 if role == "primary"
    errors << "projects[#{index}].path must be absolute" unless path.start_with?(File::SEPARATOR)
    errors << "projects[#{index}].path does not exist: #{path}" unless Dir.exist?(path)
    expanded_path = File.expand_path(path)
    errors << "projects[#{index}].path is also used by #{paths[expanded_path]}" if paths[expanded_path]
    paths[expanded_path] = name unless path.empty?
    errors << "projects[#{index}].job_path must be relative" if job_path.empty? || job_path.start_with?(File::SEPARATOR) || job_path.split("/").include?("..")
    expected_job_path = File.join(".xoch", "work", "jobs", data["job_id"].to_s)
    errors << "projects[#{index}].job_path must be #{expected_job_path}" unless job_path == expected_job_path
  end
  errors << "exactly one primary project is required" unless primary_count == 1
  errors << "primary does not match a listed project" unless names[data["primary"]]
  role_primary = projects.find { |project| project.is_a?(Hash) && project["role"] == "primary" }
  errors << "primary must match the project with role primary" if role_primary && role_primary["name"] != data["primary"]
  errors
end

case command
when "create"
  fail_with("--job is required") if job.empty?
  fail_with("job ID must use lowercase letters, numbers, and hyphens") unless job.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/)
  fail_with("--primary is required") if primary_spec.empty?
  fail_with("at least one --participant is required") if participant_specs.empty?

  primary_name, primary_path = split_project(primary_spec, "--primary")
  project_specs = [[primary_name, primary_path, "primary"]]
  participant_specs.each do |spec|
    name, path = split_project(spec, "--participant")
    project_specs << [name, path, "participant"]
  end
  names = project_specs.map(&:first)
  fail_with("project names must be unique") unless names.uniq.length == names.length

  job_path = File.join(".xoch", "work", "jobs", job)
  output_path = File.join(primary_path, job_path, "projects.json")
  fail_with("scope already exists: #{output_path}", 1) if File.exist?(output_path)

  data = {
    "version" => 1,
    "job_id" => job,
    "mode" => "multi-project",
    "primary" => primary_name,
    "revision" => 0,
    "content_digest" => nil,
    "last_synced_at" => nil,
    "projects" => project_specs.map do |name, path, role|
      { "name" => name, "role" => role, "path" => path, "job_path" => job_path }
    end
  }
  errors = scope_errors(data)
  fail_with(errors.join("; ")) unless errors.empty?

  FileUtils.mkdir_p(File.dirname(output_path))
  temp = "#{output_path}.tmp.#{$$}"
  File.write(temp, JSON.pretty_generate(data) + "\n")
  File.rename(temp, output_path)
  puts "Multi-project scope created: #{output_path}"
when "validate"
  data, expanded = load_scope(scope_path)
  errors = scope_errors(data)
  result = { "valid" => errors.empty?, "scope" => expanded, "errors" => errors }
  if json_mode
    puts JSON.pretty_generate(result)
  elsif errors.empty?
    puts "Project scope valid: #{expanded}"
  else
    warn "Project scope invalid: #{expanded}"
    errors.each { |error| warn "- #{error}" }
  end
  exit(errors.empty? ? 0 : 1)
when "role"
  data, = load_scope(scope_path)
  errors = scope_errors(data)
  fail_with(errors.join("; "), 1) unless errors.empty?
  expanded_cwd = File.expand_path(cwd)
  project = data["projects"].find do |candidate|
    path = File.expand_path(candidate["path"])
    expanded_cwd == path || expanded_cwd.start_with?(path + File::SEPARATOR)
  end
  result = if project
    project.merge(
      "is_primary" => project["role"] == "primary",
      "primary" => data["primary"],
      "canonical_job" => File.join(data["projects"].find { |item| item["role"] == "primary" }["path"], project["job_path"])
    )
  else
    { "name" => nil, "role" => "unmapped", "cwd" => expanded_cwd, "primary" => data["primary"] }
  end
  if json_mode
    puts JSON.pretty_generate(result)
  else
    result.each { |key, value| puts "#{key}: #{value}" }
  end
when "primary-job"
  data, = load_scope(scope_path)
  errors = scope_errors(data)
  fail_with(errors.join("; "), 1) unless errors.empty?
  primary = data["projects"].find { |project| project["role"] == "primary" }
  puts File.join(primary["path"], primary["job_path"])
when "projects"
  data, = load_scope(scope_path)
  errors = scope_errors(data)
  fail_with(errors.join("; "), 1) unless errors.empty?
  if json_mode
    puts JSON.pretty_generate(data["projects"])
  else
    data["projects"].each { |project| puts "#{project["name"]}: #{project["role"]} #{project["path"]}" }
  end
end
RUBY
