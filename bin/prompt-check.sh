#!/bin/bash

# Validate Xoch helper naming/syntax and prompt rendering in an isolated HOME.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  prompt-check.sh run [--root XOCH_REPO]
EOF
}

command="${1:-}"
[ "$command" = "run" ] || { usage; exit 2; }
shift

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --root) root="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done
root="$(cd "$root" && pwd)"
[ -f "$root/install.sh" ] || { echo "install.sh not found: $root" >&2; exit 2; }

for helper in "$root"/bin/*.sh; do
  [ -f "$helper" ] || continue
  name="$(basename "$helper")"
  if ! [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*\.sh$ ]]; then
    echo "Helper filename is not kebab-case: $name" >&2
    exit 1
  fi
  bash -n "$helper"
done
bash -n "$root/install.sh"

temp_home="$(mktemp -d "${TMPDIR:-/tmp}/xoch-prompt-check.XXXXXX")"
trap 'rm -rf "$temp_home"' EXIT
HOME="$temp_home" "$root/install.sh" codex >/dev/null

if rg -n '\{\{xoch-partial:|\{\{[A-Za-z_][A-Za-z0-9_]*\}\}' "$temp_home/.xoch/prompts" >/dev/null 2>&1; then
  echo "Prompt check failed: unresolved partial or variable" >&2
  exit 1
fi

echo "Xoch prompt and helper checks passed."
