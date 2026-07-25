#!/bin/bash

set -eo pipefail

usage() {
  cat <<'EOF'
Usage:
  context-sync.sh sync --scope PATH [--dry-run]
  context-sync.sh check --scope PATH

The primary repository owns canonical job context. This helper mirrors only Xoch
job artifacts to participants; it never copies source files or current.json.
EOF
}

die() {
  echo "Error: $*" >&2
  exit 2
}

command="${1:-}"
case "$command" in
  sync|check) shift ;;
  --help|-h) usage; exit 0 ;;
  "") usage >&2; exit 2 ;;
  *) die "unknown command: $command" ;;
esac

scope=""
dry_run="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --scope) scope="${2:-}"; shift 2 ;;
    --dry-run) dry_run="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

[ -n "$scope" ] || die "--scope is required"

ruby -rjson -rfileutils -rdigest -rtime - "$command" "$scope" "$dry_run" <<'RUBY'
command, scope_argument, dry_run = ARGV
dry_run = dry_run == "true"
scope_argument = File.expand_path(scope_argument)

SHARED_ITEMS = %w[
  state.md
  spec.md
  plan.md
  phases.md
  phases
  snapshots
  notes
  revisions
  review.md
  closure.md
].freeze

def fail_with(message, code = 2)
  warn "Error: #{message}"
  exit code
end

def read_json(path)
  JSON.parse(File.read(path))
rescue Errno::ENOENT
  fail_with("scope file not found: #{path}", 1)
rescue JSON::ParserError => e
  fail_with("invalid scope JSON in #{path}: #{e.message}")
end

def validate_scope!(data)
  fail_with("scope version must be 1") unless data["version"] == 1
  fail_with("scope job_id is required") if data["job_id"].to_s.empty?
  fail_with("scope mode must be multi-project") unless data["mode"] == "multi-project"
  projects = data["projects"]
  fail_with("scope must contain at least two projects") unless projects.is_a?(Array) && projects.length >= 2

  names = {}
  paths = {}
  primary_count = 0
  expected_job_path = File.join(".xoch", "work", "jobs", data["job_id"].to_s)
  projects.each_with_index do |project, index|
    fail_with("projects[#{index}] must be an object") unless project.is_a?(Hash)
    name = project["name"].to_s
    role = project["role"]
    path = project["path"].to_s
    job_path = project["job_path"].to_s
    fail_with("projects[#{index}].name is required") if name.empty?
    fail_with("duplicate project name: #{name}") if names[name]
    names[name] = true
    fail_with("projects[#{index}].role is invalid") unless %w[primary participant].include?(role)
    primary_count += 1 if role == "primary"
    fail_with("projects[#{index}].path must be absolute") unless path.start_with?(File::SEPARATOR)
    expanded_path = File.expand_path(path)
    fail_with("duplicate project path: #{expanded_path}") if paths[expanded_path]
    paths[expanded_path] = true
    fail_with("projects[#{index}].job_path must be #{expected_job_path}") unless job_path == expected_job_path
  end
  fail_with("scope must contain exactly one primary project") unless primary_count == 1
  primary = projects.find { |project| project["role"] == "primary" }
  fail_with("scope primary must match the primary project") unless data["primary"] == primary["name"]
end

def job_root(project)
  File.join(File.expand_path(project["path"]), project["job_path"])
end

def digest_path(path, digest, prefix)
  if File.file?(path)
    digest << "file\0#{prefix}\0"
    File.open(path, "rb") { |file| digest << file.read }
  elsif File.directory?(path)
    digest << "dir\0#{prefix}\0"
    Dir.children(path).sort.each do |child|
      digest_path(File.join(path, child), digest, File.join(prefix, child))
    end
  end
end

def context_digest(root)
  digest = Digest::SHA256.new
  SHARED_ITEMS.each { |item| digest_path(File.join(root, item), digest, item) }
  digest.hexdigest
end

def same_path?(source, destination)
  return false unless File.exist?(source) && File.exist?(destination)
  return File.binread(source) == File.binread(destination) if File.file?(source) && File.file?(destination)
  return false unless File.directory?(source) && File.directory?(destination)

  source_children = Dir.children(source).sort
  return false unless source_children == Dir.children(destination).sort
  source_children.all? { |child| same_path?(File.join(source, child), File.join(destination, child)) }
end

def copy_path(source, destination)
  FileUtils.rm_rf(destination) if File.exist?(destination)
  FileUtils.mkdir_p(File.dirname(destination))
  File.directory?(source) ? FileUtils.cp_r(source, destination) : FileUtils.cp(source, destination, preserve: true)
end

requested_scope = read_json(scope_argument)
validate_scope!(requested_scope)
projects = requested_scope["projects"]
primary = projects.find { |project| project["role"] == "primary" }

canonical_root = job_root(primary)
canonical_scope_path = File.join(canonical_root, "projects.json")
canonical = read_json(canonical_scope_path)
validate_scope!(canonical)
fail_with("scope job_id does not match canonical scope") unless requested_scope["job_id"] == canonical["job_id"]

canonical_projects = canonical["projects"]
canonical_primary = canonical_projects.find { |project| project["role"] == "primary" }
fail_with("requested scope primary does not match canonical scope") unless primary["name"] == canonical_primary["name"] && File.expand_path(primary["path"]) == File.expand_path(canonical_primary["path"])
fail_with("canonical primary path does not exist: #{canonical_primary["path"]}", 1) unless Dir.exist?(canonical_primary["path"])

participants = canonical_projects.select { |project| project["role"] == "participant" }
participants.each do |participant|
  fail_with("participant path does not exist: #{participant["path"]}", 1) unless Dir.exist?(participant["path"])
end

source_revision = canonical["revision"]
fail_with("canonical revision must be a non-negative integer") unless source_revision.is_a?(Integer) && source_revision >= 0
source_digest = context_digest(canonical_root)
mode = command == "check" ? "check" : dry_run ? "dry-run" : "sync"
summary = {
  "job_id" => canonical["job_id"],
  "mode" => mode,
  "primary" => canonical_primary["name"],
  "canonical_job" => canonical_root,
  "source_revision" => source_revision,
  "source_digest" => source_digest,
  "participants" => []
}

unsafe = false
participants.each do |participant|
  destination_root = job_root(participant)
  destination_scope_path = File.join(destination_root, "projects.json")
  entry = { "name" => participant["name"], "job" => destination_root, "status" => "ready", "changed" => [] }

  if Dir.exist?(destination_root) && !File.file?(destination_scope_path) && !Dir.empty?(destination_root)
    entry["status"] = "unmanaged-context"
    unsafe = true
  elsif File.file?(destination_scope_path)
    destination_scope = read_json(destination_scope_path)
    if destination_scope["job_id"] != canonical["job_id"]
      entry["status"] = "different-job"
      unsafe = true
    elsif destination_scope["revision"].is_a?(Integer) && destination_scope["revision"] > source_revision
      entry["status"] = "newer-participant"
      unsafe = true
    elsif destination_scope["content_digest"] && context_digest(destination_root) != destination_scope["content_digest"]
      entry["status"] = "participant-modified"
      unsafe = true
    end
  end

  unless unsafe && entry["status"] != "ready"
    SHARED_ITEMS.each do |item|
      source = File.join(canonical_root, item)
      destination = File.join(destination_root, item)
      entry["changed"] << item if File.exist?(source) && !same_path?(source, destination)
      entry["changed"] << item if !File.exist?(source) && File.exist?(destination)
    end
    entry["changed"] << "projects.json" unless File.file?(destination_scope_path) && File.binread(destination_scope_path) == File.binread(canonical_scope_path)
    entry["status"] = "out-of-sync" if command == "check" && !entry["changed"].empty?
  end
  summary["participants"] << entry
end

if unsafe
  puts JSON.pretty_generate(summary)
  fail_with("sync refused because participant context is unmanaged, newer, or independently modified", 1)
end

if command == "check"
  puts JSON.pretty_generate(summary)
  exit(summary["participants"].all? { |participant| participant["changed"].empty? } ? 0 : 1)
end

unless dry_run
  canonical["revision"] = source_revision + 1
  canonical["content_digest"] = source_digest
  canonical["last_synced_at"] = Time.now.utc.iso8601
  temp = "#{canonical_scope_path}.tmp.#{$$}"
  File.write(temp, JSON.pretty_generate(canonical) + "\n")
  File.rename(temp, canonical_scope_path)

  participants.each do |participant|
    destination_root = job_root(participant)
    FileUtils.mkdir_p(destination_root)
    SHARED_ITEMS.each do |item|
      source = File.join(canonical_root, item)
      destination = File.join(destination_root, item)
      File.exist?(source) ? copy_path(source, destination) : FileUtils.rm_rf(destination)
    end
    FileUtils.cp(canonical_scope_path, File.join(destination_root, "projects.json"), preserve: true)
  end
  summary["revision"] = canonical["revision"]
end

puts JSON.pretty_generate(summary)
RUBY
