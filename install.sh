#!/bin/bash

# XochDev Installer
# Installs Xoch prompts for Copilot and Codex via symlinks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR="$SCRIPT_DIR/prompts"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "XochDev Installer"
echo "===================="
echo ""

# Check if prompts directory exists
if [ ! -d "$PROMPTS_DIR" ]; then
    echo -e "${RED}Error: prompts/ directory not found${NC}"
    exit 1
fi

# Count prompts
PROMPT_COUNT=$(find "$PROMPTS_DIR" -name "*.md" -type f | wc -l | tr -d ' ')
echo "Found $PROMPT_COUNT prompt(s) to install"
echo ""

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

# Main installation
echo ""
install_copilot
echo ""
install_codex

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Usage:"
echo "  GitHub Copilot: Type #xoch-test-hello in chat"
echo "  Codex: Type \$xoch-test-hello in chat"
echo "  Cursor: Type #xoch-test-hello in chat (uses VS Code prompts)"
echo ""
echo "Note: You may need to restart VS Code or Codex for changes to take effect."
