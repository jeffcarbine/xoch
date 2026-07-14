#!/bin/bash

# Detect likely project validation commands without executing them.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  project-commands.sh detect [--root ROOT] [--json]
EOF
}

command="${1:-}"
[ "$command" = "detect" ] || { usage; exit 2; }
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

ruby -rjson - "$root" "$json_mode" <<'RUBY'
root, json_mode = ARGV
root = File.expand_path(root)
json_mode = json_mode == "true"
abort("Project root not found: #{root}") unless Dir.exist?(root)

commands = []
managers = []
add = lambda do |kind, command, source|
  commands << { kind: kind, command: command, source: source } unless commands.any? { |item| item[:command] == command }
end

package_path = File.join(root, "package.json")
if File.file?(package_path)
  package = JSON.parse(File.read(package_path)) rescue {}
  scripts = package.fetch("scripts", {})
  manager = if File.file?(File.join(root, "bun.lockb")) || File.file?(File.join(root, "bun.lock"))
    "bun"
  elsif File.file?(File.join(root, "pnpm-lock.yaml"))
    "pnpm"
  elsif File.file?(File.join(root, "yarn.lock"))
    "yarn"
  else
    "npm"
  end
  managers << manager
  %w[test lint typecheck check build format].each do |name|
    next unless scripts.key?(name)
    runner = case manager
    when "npm" then "npm run #{name}"
    when "bun" then "bun run #{name}"
    else "#{manager} #{name}"
    end
    add.call(name, runner, "package.json")
  end
end

if File.file?(File.join(root, "pyproject.toml")) || File.file?(File.join(root, "pytest.ini"))
  managers << "python"
  add.call("test", "pytest", "Python test configuration")
end
if File.file?(File.join(root, "go.mod"))
  managers << "go"
  add.call("test", "go test ./...", "go.mod")
  add.call("build", "go build ./...", "go.mod")
end
if File.file?(File.join(root, "Cargo.toml"))
  managers << "cargo"
  add.call("test", "cargo test", "Cargo.toml")
  add.call("check", "cargo check", "Cargo.toml")
end
if File.file?(File.join(root, "pom.xml"))
  managers << "maven"
  add.call("test", "mvn test", "pom.xml")
end
if File.file?(File.join(root, "build.gradle")) || File.file?(File.join(root, "build.gradle.kts"))
  managers << "gradle"
  add.call("test", "./gradlew test", "Gradle build")
end
if File.file?(File.join(root, "composer.json"))
  managers << "composer"
  composer = JSON.parse(File.read(File.join(root, "composer.json"))) rescue {}
  scripts = composer.fetch("scripts", {})
  %w[test analyse analyze lint].each do |name|
    add.call(name, "composer #{name}", "composer.json") if scripts.key?(name)
  end
end

result = { root: root, managers: managers.uniq, commands: commands }
if json_mode
  puts JSON.pretty_generate(result)
else
  puts "Managers: #{result[:managers].empty? ? "unknown" : result[:managers].join(", ")}" 
  commands.each { |item| puts "#{item[:kind]}: #{item[:command]} (#{item[:source]})" }
end
exit(commands.empty? ? 1 : 0)
RUBY
