#!/bin/bash

set -eo pipefail

usage() {
  cat <<'EOF'
Usage:
  dependency-actions.sh resolve [--dependencies PATH] [--map PATH] [--scope PATH]

Defaults:
  dependencies: .xoch/docs/dependencies.json
  map:          ~/.xoch/workspace-map.json

The command prints JSON and exits 1 when a declared project cannot be resolved.
EOF
}

die() {
  echo "Error: $*" >&2
  exit 2
}

command="${1:-}"
case "$command" in
  resolve) shift ;;
  --help|-h) usage; exit 0 ;;
  "") usage >&2; exit 2 ;;
  *) die "unknown command: $command" ;;
esac

dependencies=".xoch/docs/dependencies.json"
map="$HOME/.xoch/workspace-map.json"
scope=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dependencies) dependencies="${2:-}"; shift 2 ;;
    --map) map="${2:-}"; shift 2 ;;
    --scope) scope="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

ruby -rjson - "$dependencies" "$map" "$scope" <<'RUBY'
dependencies_path, map_path, scope_path = ARGV.map { |path| path.empty? ? path : File.expand_path(path) }

def fail_json(result, message, code = 2)
  result["error"] = message
  puts JSON.pretty_generate(result)
  exit code
end

result = {
  "dependencies_file" => dependencies_path,
  "workspace_map" => map_path,
  "scope" => scope_path.empty? ? nil : scope_path,
  "resolved" => [],
  "missing" => []
}

fail_json(result, "dependencies file not found: #{dependencies_path}", 1) unless File.file?(dependencies_path)

begin
  dependency_data = JSON.parse(File.read(dependencies_path))
rescue JSON::ParserError => e
  fail_json(result, "invalid dependencies JSON: #{e.message}")
end

dependencies = dependency_data["dependencies"]
fail_json(result, "dependencies file must contain a dependencies array") unless dependencies.is_a?(Array)

workspace_projects = {}
if File.file?(map_path)
  begin
    map_data = JSON.parse(File.read(map_path))
    workspace_projects = map_data["projects"].is_a?(Hash) ? map_data["projects"] : {}
  rescue JSON::ParserError => e
    fail_json(result, "invalid workspace map JSON: #{e.message}")
  end
end

scope_projects = []
unless scope_path.empty?
  fail_json(result, "scope file not found: #{scope_path}", 1) unless File.file?(scope_path)
  begin
    scope_data = JSON.parse(File.read(scope_path))
    scope_projects = Array(scope_data["projects"]).map { |project| project["name"] }
  rescue JSON::ParserError => e
    fail_json(result, "invalid project scope JSON: #{e.message}")
  end
end

dependencies.each_with_index do |dependency, index|
  fail_json(result, "dependencies[#{index}] must be an object") unless dependency.is_a?(Hash)
  name = dependency["name"].to_s
  fail_json(result, "dependencies[#{index}].name is required") if name.empty?

  entry = workspace_projects[name]
  entry = { "path" => entry } if entry.is_a?(String)
  if entry.is_a?(Hash) && !entry["path"].to_s.empty?
    path = File.expand_path(entry["path"])
    if Dir.exist?(path)
      result["resolved"] << {
        "name" => name,
        "path" => path,
        "in_job_scope" => scope_projects.include?(name),
        "documentation" => File.join(path, ".xoch", "docs"),
        "declaration" => dependency
      }
    else
      result["missing"] << {
        "name" => name,
        "reason" => "mapped path does not exist: #{path}",
        "declaration" => dependency
      }
    end
  else
    result["missing"] << {
      "name" => name,
      "reason" => "not present in #{map_path}",
      "declaration" => dependency
    }
  end
end

puts JSON.pretty_generate(result)
exit(result["missing"].empty? ? 0 : 1)
RUBY
