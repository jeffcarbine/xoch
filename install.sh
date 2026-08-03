#!/bin/bash

# XochDev Installer
# Installs rendered Xoch prompts for Copilot, Codex, Claude Code, and Kiro.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_SOURCE_DIR="$SCRIPT_DIR/prompts"
CORE_PROMPTS_SOURCE_DIR="$PROMPTS_SOURCE_DIR/core"
BIN_SOURCE_DIR="$SCRIPT_DIR/bin"
XOCH_RUNTIME_DIR="$HOME/.xoch"
PROMPTS_DIR="$XOCH_RUNTIME_DIR/prompts"
CORE_PROMPTS_DIR="$PROMPTS_DIR/core"
BIN_DIR="$XOCH_RUNTIME_DIR/bin"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "XochDev Installer"
echo "===================="
echo ""

# Check if prompts directory exists
if [ ! -d "$PROMPTS_SOURCE_DIR" ]; then
    echo -e "${RED}Error: prompts/ directory not found${NC}"
    exit 1
fi

# Count installable prompts. Documentation files and partials are not commands.
PROMPT_COUNT=$(find "$PROMPTS_SOURCE_DIR" -maxdepth 1 -name "*.md" ! -name "README.md" -type f | wc -l | tr -d ' ')
echo "Found $PROMPT_COUNT prompt(s) to install"
echo ""

install_helpers() {
    echo "Installing helper scripts..."

    rm -rf "$BIN_DIR"
    mkdir -p "$BIN_DIR"

    if [ ! -d "$BIN_SOURCE_DIR" ]; then
        echo -e "  ${YELLOW}No bin/ directory found; skipping helpers${NC}"
        echo ""
        return
    fi

    local helper_count=0

    for helper_file in "$BIN_SOURCE_DIR"/*.sh; do
        if [ -f "$helper_file" ]; then
            helper_name=$(basename "$helper_file")
            cp "$helper_file" "$BIN_DIR/$helper_name"
            chmod +x "$BIN_DIR/$helper_name"
            helper_count=$((helper_count + 1))
            echo -e "  ${GREEN}✓${NC} $helper_name → $BIN_DIR"
        fi
    done

    if [ $helper_count -eq 0 ]; then
        echo -e "  ${YELLOW}No helper scripts found${NC}"
    fi

    echo ""
}

render_prompt_file() {
    local source_file="$1"
    local output_file="$2"

    ruby - "$PROMPTS_SOURCE_DIR" "$source_file" "$output_file" <<'RUBY'
prompts_dir, source_file, output_file = ARGV
partials_dir = File.join(prompts_dir, "partials")
source = File.read(source_file)

def fail_render(message)
  warn message
  exit 1
end

def parse_partial(body, source_file)
  body = body.strip
  fail_render("Error: malformed prompt partial in #{source_file}") if body.empty?

  if body.include?("\n")
    first_line, *rest = body.lines.map(&:chomp)
    path = first_line.strip
    assignments = rest.join("\n")
  else
    path, assignments = body.split(/\s+/, 2)
    assignments ||= ""
  end

  path = path.to_s.strip.sub(%r{\A\./}, "")
  fail_render("Error: missing prompt partial path in #{source_file}") if path.empty?
  fail_render("Error: invalid prompt partial path '#{path}' in #{source_file}") if path.start_with?("/") || path.split("/").include?("..")

  vars = {}
  scanner = StringScanner.new(assignments)
  until scanner.eos?
    scanner.skip(/\s+/)
    break if scanner.eos?
    key = scanner.scan(/[A-Za-z_][A-Za-z0-9_]*/)
    fail_render("Error: malformed variable assignment near '#{scanner.rest}' in #{source_file}") unless key
    scanner.skip(/\s*/)
    fail_render("Error: expected '=' after variable '#{key}' in #{source_file}") unless scanner.scan(/=/)
    scanner.skip(/\s*/)
    value = scanner.scan(/"([^"\\]|\\.)*"/)
    fail_render("Error: expected quoted value for variable '#{key}' in #{source_file}") unless value
    vars[key] = value[1...-1].gsub(/\\"/, '"').gsub(/\\\\/, "\\")
  end

  [path, vars]
end

begin
  require "strscan"

  rendered = source.gsub(/\{\{xoch-partial:(.*?)\}\}/m) do
    path, vars = parse_partial(Regexp.last_match(1), source_file)
    partial_file = File.join(partials_dir, path)
    fail_render("Error: prompt partial not found: #{partial_file}") unless File.file?(partial_file)

    partial_text = File.read(partial_file)
    used = []

    partial_text = partial_text.gsub(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/) do
      key = Regexp.last_match(1)
      fail_render("Error: missing variable '#{key}' for partial '#{path}' in #{source_file}") unless vars.key?(key)
      used << key
      vars[key]
    end

    unused = vars.keys - used
    warn "Warning: unused variable(s) for partial '#{path}' in #{source_file}: #{unused.join(', ')}" unless unused.empty?

    partial_text
  end

  File.write(output_file, rendered)
rescue StandardError => e
  fail_render("Error rendering #{source_file}: #{e.message}")
end
RUBY
}

render_prompts() {
    echo "Rendering prompts..."

    rm -rf "$PROMPTS_DIR"
    mkdir -p "$PROMPTS_DIR"

    for prompt_file in "$PROMPTS_SOURCE_DIR"/*.md; do
        if [ -f "$prompt_file" ]; then
            filename=$(basename "$prompt_file" .md)
            [ "$filename" = "README" ] && continue
            render_prompt_file "$prompt_file" "$PROMPTS_DIR/$filename.md"
        fi
    done

    if [ -d "$CORE_PROMPTS_SOURCE_DIR" ]; then
        mkdir -p "$CORE_PROMPTS_DIR"

        for core_prompt_file in "$CORE_PROMPTS_SOURCE_DIR"/*.md; do
            if [ -f "$core_prompt_file" ]; then
                filename=$(basename "$core_prompt_file" .md)
                render_prompt_file "$core_prompt_file" "$CORE_PROMPTS_DIR/$filename.md"
            fi
        done
    fi

    if grep -R "{{xoch-partial:" "$PROMPTS_DIR" >/dev/null 2>&1; then
        echo -e "${RED}Error: unresolved prompt partial found in rendered prompts${NC}" >&2
        exit 1
    fi

    RENDERED_COUNT=$(find "$PROMPTS_DIR" -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')
    CORE_RENDERED_COUNT=0
    if [ -d "$CORE_PROMPTS_DIR" ]; then
        CORE_RENDERED_COUNT=$(find "$CORE_PROMPTS_DIR" -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')
    fi

    echo -e "  ${GREEN}✓${NC} Rendered prompts -> $PROMPTS_DIR ($RENDERED_COUNT files, $CORE_RENDERED_COUNT core)"
    echo ""
}

# Clean up orphaned Copilot prompts
cleanup_copilot() {
    COPILOT_DIR="$HOME/Library/Application Support/Code/User/prompts"
    
    if [ ! -d "$COPILOT_DIR" ]; then
        return
    fi
    
    local removed=0
    
    for installed in "$COPILOT_DIR"/xoch-*.prompt.md; do
        if [ -f "$installed" ] || [ -L "$installed" ]; then
            # Extract the prompt name (e.g., xoch-meow.prompt.md → meow)
            installed_name=$(basename "$installed" .prompt.md | sed 's/^xoch-//')
            
            # Check if source file exists
            if [ "$installed_name" = "README" ] || [ ! -f "$PROMPTS_DIR/$installed_name.md" ]; then
                rm "$installed"
                echo -e "  ${YELLOW}✗${NC} Removed orphaned: xoch-$installed_name"
                removed=$((removed + 1))
            fi
        fi
    done
    
    if [ $removed -gt 0 ]; then
        echo ""
    fi
}

# Clean up orphaned Codex skills
cleanup_codex() {
    CODEX_DIR="$HOME/.codex/skills"
    
    if [ ! -d "$CODEX_DIR" ]; then
        return
    fi
    
    local removed=0
    
    for installed in "$CODEX_DIR"/xoch-*; do
        if [ -d "$installed" ]; then
            # Extract the skill name (e.g., xoch-meow → meow)
            installed_name=$(basename "$installed" | sed 's/^xoch-//')
            
            # Check if source file exists
            if [ "$installed_name" = "README" ] || [ ! -f "$PROMPTS_DIR/$installed_name.md" ]; then
                rm -rf "$installed"
                echo -e "  ${YELLOW}✗${NC} Removed orphaned: xoch-$installed_name"
                removed=$((removed + 1))
            fi
        fi
    done
    
    if [ $removed -gt 0 ]; then
        echo ""
    fi
}

# Clean up orphaned Claude Code skills
cleanup_claude() {
    CLAUDE_DIR="$HOME/.claude/skills"

    if [ ! -d "$CLAUDE_DIR" ]; then
        return
    fi

    local removed=0

    for installed in "$CLAUDE_DIR"/xoch-*; do
        if [ -d "$installed" ]; then
            installed_name=$(basename "$installed" | sed 's/^xoch-//')

            if [ "$installed_name" = "README" ] || [ ! -f "$PROMPTS_DIR/$installed_name.md" ]; then
                rm -rf "$installed"
                echo -e "  ${YELLOW}✗${NC} Removed orphaned: xoch-$installed_name"
                removed=$((removed + 1))
            fi
        fi
    done

    if [ $removed -gt 0 ]; then
        echo ""
    fi
}

# Clean up orphaned Kiro steering files
cleanup_kiro() {
    KIRO_DIR="$HOME/.kiro/steering"

    if [ ! -d "$KIRO_DIR" ]; then
        return
    fi

    local removed=0

    for installed in "$KIRO_DIR"/xoch-*.md; do
        if [ -f "$installed" ]; then
            installed_name=$(basename "$installed" .md | sed 's/^xoch-//')

            if [ "$installed_name" = "README" ] || [ ! -f "$PROMPTS_DIR/$installed_name.md" ]; then
                rm "$installed"
                echo -e "  ${YELLOW}✗${NC} Removed orphaned: xoch-$installed_name"
                removed=$((removed + 1))
            fi
        fi
    done

    if [ $removed -gt 0 ]; then
        echo ""
    fi
}

# Install for GitHub Copilot (VS Code)
install_copilot() {
    COPILOT_DIR="$HOME/Library/Application Support/Code/User/prompts"
    
    if [ ! -d "$COPILOT_DIR" ]; then
        echo -e "${YELLOW}VS Code prompts directory not found. Creating...${NC}"
        mkdir -p "$COPILOT_DIR"
    fi
    
    echo "Installing for GitHub Copilot..."
    
    for prompt_file in "$PROMPTS_DIR"/*.md; do
        if [ -f "$prompt_file" ]; then
            filename=$(basename "$prompt_file" .md)
            [ "$filename" = "README" ] && continue
            target="$COPILOT_DIR/xoch-$filename.prompt.md"
            
            # Remove existing symlink or file
            if [ -L "$target" ] || [ -f "$target" ]; then
                rm "$target"
            fi
            
            # Create symlink
            ln -s "$prompt_file" "$target"
            echo -e "  ${GREEN}✓${NC} xoch-$filename → Copilot"
        fi
    done
}

# Install for Codex
install_codex() {
    CODEX_DIR="$HOME/.codex/skills"
    
    if [ ! -d "$CODEX_DIR" ]; then
        echo -e "${YELLOW}Codex skills directory not found. Creating...${NC}"
        mkdir -p "$CODEX_DIR"
    fi
    
    echo "Installing for Codex..."
    
    for prompt_file in "$PROMPTS_DIR"/*.md; do
        if [ -f "$prompt_file" ]; then
            filename=$(basename "$prompt_file" .md)
            [ "$filename" = "README" ] && continue
            skill_dir="$CODEX_DIR/xoch-$filename"
            
            # Create skill directory and agents subdirectory
            mkdir -p "$skill_dir/agents"
            
            # Copy (not symlink) the prompt as SKILL.md for Codex
            # Codex appears to not discover symlinked files
            cp "$prompt_file" "$skill_dir/SKILL.md"
            
            # Extract name and description from YAML frontmatter for openai.yaml
            skill_name=$(grep "^name:" "$prompt_file" | head -1 | sed 's/name: //')
            skill_desc=$(grep "^description:" "$prompt_file" | head -1 | sed 's/description: //')
            
            # Create openai.yaml metadata file
            cat > "$skill_dir/agents/openai.yaml" <<EOF
interface:
  display_name: "Xoch ${filename}"
  short_description: "${skill_desc}"
  default_prompt: "Use \$${skill_name} to invoke this Xoch workflow step."
EOF
            
            echo -e "  ${GREEN}✓${NC} xoch-$filename → Codex"
        fi
    done
}

# Install for Claude Code
install_claude() {
    CLAUDE_DIR="$HOME/.claude/skills"

    if [ ! -d "$CLAUDE_DIR" ]; then
        echo -e "${YELLOW}Claude Code skills directory not found. Creating...${NC}"
        mkdir -p "$CLAUDE_DIR"
    fi

    echo "Installing for Claude Code..."

    for prompt_file in "$PROMPTS_DIR"/*.md; do
        if [ -f "$prompt_file" ]; then
            filename=$(basename "$prompt_file" .md)
            [ "$filename" = "README" ] && continue
            skill_dir="$CLAUDE_DIR/xoch-$filename"

            mkdir -p "$skill_dir"

            # Xoch lifecycle commands should only run when the engineer invokes them.
            awk '
                NR == 1 && $0 == "---" { in_frontmatter = 1; print; next }
                in_frontmatter && $0 == "---" {
                    print "disable-model-invocation: true"
                    in_frontmatter = 0
                }
                { print }
            ' "$prompt_file" > "$skill_dir/SKILL.md"

            echo -e "  ${GREEN}✓${NC} xoch-$filename → Claude Code"
        fi
    done
}

# Install for Kiro IDE
install_kiro() {
    KIRO_DIR="$HOME/.kiro/steering"

    if [ ! -d "$KIRO_DIR" ]; then
        echo -e "${YELLOW}Kiro steering directory not found. Creating...${NC}"
        mkdir -p "$KIRO_DIR"
    fi

    echo "Installing for Kiro..."

    for prompt_file in "$PROMPTS_DIR"/*.md; do
        if [ -f "$prompt_file" ]; then
            filename=$(basename "$prompt_file" .md)
            [ "$filename" = "README" ] && continue
            target="$KIRO_DIR/xoch-$filename.md"

            # Kiro only surfaces a steering file as an on-demand slash command with inclusion: manual.
            awk '
                NR == 1 && $0 == "---" { in_frontmatter = 1; print; next }
                in_frontmatter && $0 == "---" {
                    print "inclusion: manual"
                    in_frontmatter = 0
                }
                { print }
            ' "$prompt_file" > "$target"

            echo -e "  ${GREEN}✓${NC} xoch-$filename → Kiro"
        fi
    done
}

# Main installation
echo ""
install_helpers
render_prompts
cleanup_copilot
cleanup_codex
cleanup_claude
cleanup_kiro
install_copilot
echo ""
install_codex
echo ""
install_claude
echo ""
install_kiro

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Usage:"
echo "  GitHub Copilot: Type #xoch-meow in chat"
echo "  Codex: Type \$xoch-meow in chat"
echo "  Claude Code: Type /xoch-meow in chat"
echo "  Cursor: Type #xoch-meow in chat (uses VS Code prompts)"
echo "  Kiro: Type #xoch-meow in chat"
echo ""
echo "Note: You may need to restart your AI tool if its skills directory was just created."
