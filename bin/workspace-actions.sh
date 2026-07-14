#!/bin/bash

set -eo pipefail

usage() {
  cat <<'EOF'
Usage:
  workspace-actions.sh list [--map PATH] [--json]
  workspace-actions.sh add --name NAME --path PATH [--map PATH] [--replace]
  workspace-actions.sh remove --name NAME [--map PATH]
  workspace-actions.sh validate [--map PATH] [--json]

The workspace map is machine-local. Its default path is:
  ~/.xoch/workspace-map.json
EOF
}

die() {
  echo "Error: $*" >&2
  exit 2
}

command="${1:-}"
case "$command" in
  list|add|remove|validate) shift ;;
  --help|-h) usage; exit 0 ;;
  "") usage >&2; exit 2 ;;
  *) die "unknown command: $command" ;;
esac

map="$HOME/.xoch/workspace-map.json"
name=""
project_path=""
json_mode="false"
replace="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --map) map="${2:-}"; shift 2 ;;
    --name) name="${2:-}"; shift 2 ;;
    --path) project_path="${2:-}"; shift 2 ;;
    --json) json_mode="true"; shift ;;
    --replace) replace="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

ruby -rjson -rfileutils -rtime - "$command" "$map" "$name" "$project_path" "$json_mode" "$replace" <<'RUBY'
command, map_path, name, project_path, json_mode, replace = ARGV
json_mode = json_mode == "true"
replace = replace == "true"
map_path = File.expand_path(map_path)

def fail_with(message, code = 2)
  warn "Error: #{message}"
  exit code
end

def load_map(path)
  return { "version" => 1, "updated_at" => nil, "projects" => {} } unless File.file?(path)

  data = JSON.parse(File.read(path))
  fail_with("workspace map must contain a projects object") unless data["projects"].is_a?(Hash)
  data
rescue JSON::ParserError => e
  fail_with("invalid workspace map JSON: #{e.message}")
end

def write_map(path, data)
  FileUtils.mkdir_p(File.dirname(path))
  data["version"] = 1
  data["updated_at"] = Time.now.utc.iso8601
  temp = "#{path}.tmp.#{$$}"
  File.write(temp, JSON.pretty_generate(data) + "\n")
  File.rename(temp, path)
end

data = load_map(map_path)
projects = data["projects"]

case command
when "list"
  if json_mode
    puts JSON.pretty_generate(data)
  elsif projects.empty?
    puts "No Xoch workspace projects mapped."
  else
    projects.sort.each { |project_name, entry| puts "#{project_name}: #{entry["path"]}" }
  end
when "add"
  fail_with("--name is required") if name.strip.empty?
  fail_with("project names may contain only letters, numbers, dots, underscores, and hyphens") unless name.match?(/\A[A-Za-z0-9._-]+\z/)
  fail_with("--path is required") if project_path.strip.empty?

  expanded = File.expand_path(project_path)
  fail_with("project path does not exist: #{expanded}", 1) unless Dir.exist?(expanded)
  existing = projects[name]
  if existing && File.expand_path(existing["path"].to_s) != expanded && !replace
    fail_with("#{name} already maps to #{existing["path"]}; pass --replace after engineer confirmation", 1)
  end

  projects[name] = {
    "path" => expanded,
    "source" => "xoch-workspace",
    "last_seen" => Time.now.utc.iso8601
  }
  write_map(map_path, data)
  puts "Workspace project mapped: #{name} -> #{expanded}"
when "remove"
  fail_with("--name is required") if name.strip.empty?
  fail_with("workspace project not found: #{name}", 1) unless projects.delete(name)
  write_map(map_path, data)
  puts "Workspace project removed: #{name}"
when "validate"
  errors = []
  seen_paths = {}
  projects.each do |project_name, entry|
    path = File.expand_path(entry["path"].to_s)
    errors << "#{project_name}: missing path" if entry["path"].to_s.empty?
    errors << "#{project_name}: path does not exist: #{path}" unless Dir.exist?(path)
    if seen_paths[path]
      errors << "#{project_name}: path is also mapped as #{seen_paths[path]}"
    else
      seen_paths[path] = project_name
    end
  end

  result = { "valid" => errors.empty?, "map" => map_path, "project_count" => projects.length, "errors" => errors }
  if json_mode
    puts JSON.pretty_generate(result)
  elsif errors.empty?
    puts "Workspace map valid: #{map_path} (#{projects.length} projects)"
  else
    warn "Workspace map invalid: #{map_path}"
    errors.each { |error| warn "- #{error}" }
  end
  exit(errors.empty? ? 0 : 1)
end
RUBY
