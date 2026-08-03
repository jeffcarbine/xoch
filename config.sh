#!/bin/bash

# Xoch Config
# Sets Xoch configuration values (currently: storage.mode). Similar to
# install.sh in style, but for engineer-facing config, not installation.

set -e

CONFIG_PATH="$HOME/.xoch/config.json"
VALID_STORAGE_MODES=("in-repo" "centralized")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

is_valid_storage_mode() {
    local value="$1"
    for mode in "${VALID_STORAGE_MODES[@]}"; do
        [ "$mode" = "$value" ] && return 0
    done
    return 1
}

read_storage_mode() {
    ruby -rjson - "$CONFIG_PATH" <<'RUBY'
path = ARGV[0]
data = {}
if File.file?(path)
  begin
    data = JSON.parse(File.read(path))
  rescue StandardError
    data = {}
  end
end
mode = data.dig("storage", "mode")
mode = "in-repo" unless %w[in-repo centralized].include?(mode)
puts mode
RUBY
}

print_config() {
    ruby -rjson - "$CONFIG_PATH" <<'RUBY'
path = ARGV[0]
data = {}
if File.file?(path)
  begin
    data = JSON.parse(File.read(path))
  rescue StandardError
    data = {}
  end
end
mode = data.dig("storage", "mode")
mode = "in-repo" unless %w[in-repo centralized].include?(mode)
data["version"] ||= 1
data["storage"] ||= {}
data["storage"]["mode"] = mode
puts JSON.pretty_generate(data)
RUBY
}

write_storage_mode() {
    local value="$1"
    ruby -rjson -rfileutils - "$CONFIG_PATH" "$value" <<'RUBY'
path, value = ARGV
data = {}
if File.file?(path)
  begin
    data = JSON.parse(File.read(path))
  rescue StandardError
    data = {}
  end
end
data["version"] ||= 1
data["storage"] ||= {}
data["storage"]["mode"] = value
FileUtils.mkdir_p(File.dirname(path))
temp = "#{path}.tmp.#{$$}"
File.write(temp, JSON.pretty_generate(data) + "\n")
File.rename(temp, path)
RUBY
}

print_migration_warning() {
    echo -e "${YELLOW}Note: switching storage.mode does not migrate existing job/arc data between .xoch/work/ (in-repo) and ~/.xoch/projects/<slug>/work/ (centralized). Move files manually if needed.${NC}"
}

cmd_get() {
    local key="$1"
    if [ "$key" != "storage.mode" ]; then
        echo -e "${RED}Error: unknown config key: $key${NC}" >&2
        exit 1
    fi
    read_storage_mode
}

cmd_set() {
    local key="$1"
    local value="$2"
    if [ "$key" != "storage.mode" ]; then
        echo -e "${RED}Error: unknown config key: $key${NC}" >&2
        exit 1
    fi
    if ! is_valid_storage_mode "$value"; then
        echo -e "${RED}Error: invalid storage.mode value '$value'. Expected one of: ${VALID_STORAGE_MODES[*]}${NC}" >&2
        exit 1
    fi
    write_storage_mode "$value"
    echo -e "${GREEN}✓${NC} storage.mode set to $value"
    print_migration_warning
}

cmd_show() {
    print_config
}

usage() {
    cat <<EOF
Usage:
  ./config.sh show                     Print resolved config
  ./config.sh get storage.mode         Print current storage.mode
  ./config.sh set storage.mode VALUE   Set storage.mode (in-repo|centralized)
EOF
}

case "${1:-}" in
    show)
        cmd_show
        ;;
    get)
        [ -n "${2:-}" ] || { usage; exit 1; }
        cmd_get "$2"
        ;;
    set)
        [ -n "${2:-}" ] && [ -n "${3:-}" ] || { usage; exit 1; }
        cmd_set "$2" "$3"
        ;;
    -h|--help)
        usage
        ;;
    *)
        usage
        exit 1
        ;;
esac
