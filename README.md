# 🐈‍⬛ Xoch - Spec-Driven Development

**Open-Source Development Workflow System**

A lightweight, spec-driven development system where README files serve as both living specifications and documentation. Works with AI agents (GitHub Copilot, Codex, Cursor) to guide development workflows through incremental milestones.

---

## What is Xoch?

Xoch (SOH-ch)[^1] eliminates massive changelogs by maintaining clarity through README files that serve as the source of truth. Instead of documenting changes after the fact, READMEs always reflect current reality, and incremental milestones track the journey.

### Core Philosophy

- **READMEs describe NOW** - How features work currently
- **Specs describe CHANGE** - What will be modified
- **Milestones track PROGRESS** - Incremental implementation steps
- **Context is preserved** - All decisions and rationale captured
- **Agents guide workflow** - AI assistants for each phase

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/jeffcarbine/xoch.git
cd xoch

# Run the installer
./install.sh
```

The installer will:
- ✅ Install prompts for **GitHub Copilot** (symlinks to VS Code prompts directory)
- ✅ Install prompts for **Codex** (copies to `~/.codex/skills/`)
- ✅ Work automatically with **Cursor** (uses Copilot prompts)

### Verify Installation

In VS Code or Cursor:
```
#xoch-meow
```

In Codex:
```
$xoch-meow
```

You should see a test greeting confirming the installation.

---

## Usage

### First Time Setup

For existing projects, initialize documentation:

```bash
#xoch-init-app        # Create application README
#xoch-init-feature    # Create feature READMEs (run for each feature)
```

### Main Workflow

**Flow**: `spec → plan → start → advance (repeat) → finalize`

```bash
#xoch-spec            # Capture requirements
#xoch-plan            # Create milestones
#xoch-start           # Begin milestone
#xoch-advance         # Complete milestone, advance to next (repeat)
#xoch-finalize        # Archive when all milestones done
```

**Optional prompts:**
- `#xoch-validate` - Verify README accuracy
- `#xoch-sidebar` - Explore tangential questions
- `#xoch-replan` - Update milestones when requirements change
- `#xoch-merge` - Resolve README conflicts

---

## Token Management

Xoch includes **token budget management** to keep AI agent context efficient and prevent overflow.

### Token Budgets by Phase

| Phase | Budget | What It Covers |
|-------|--------|----------------|
| **spec** | 8,000 tokens | Prompt (~3K) + reading implementation files to clarify requirements |
| **plan** | 13,000 tokens | Prompt (~3K) + reading codebase to understand architecture |
| **start** | 18,000 tokens | Prompt (~2.5K) + deep-dive into files for first milestone |
| **advance** | 15,000 tokens | Prompt (~4.5K) + reading additional context beyond git diff |
| **sidebar** | 8,000 tokens | Prompt (~2.2K) + reading files to answer tangential questions |
| **replan** | 12,000 tokens | Prompt (~4K) + reading context to adjust milestones |
| **pause** | 5,000 tokens | Prompt (~1.4K) + reading context for status summary |
| **resume** | 8,000 tokens | Prompt (~2.5K) + loading archived task context |
| **glossary** | 8,000 tokens | Prompt (~3.3K) + reading existing glossaries |
| **finalize** | 12,000 tokens | Prompt (~4.5K) + reading milestones to update READMEs |

**Budgets include prompt overhead** - Each budget accounts for the prompt itself plus files you read.

**Unlimited phases**: init-app, init-feature, validate, merge

### Token Estimator Tool

Check token usage before reading files:

```bash
# Single file
bin/tokenEstimator.sh README.md

# Multiple files
bin/tokenEstimator.sh --batch file1.js file2.js file3.js
```

**README Token Limit**: 3,000 tokens (~10,500 characters) for feature READMEs.

### How Budget Enforcement Works

In budget-limited phases:

1. Agent identifies files to read
2. Runs `tokenEstimator.sh --batch` to estimate total tokens
3. **If under 90% of budget**: Proceeds with reading
4. **If at/over 90%**: Asks you to prioritize which files matter most
5. Tracks token usage in context files (spec.md, plan.md, milestones.md)

This prevents context overflow while maintaining visibility into what's being read.

---

### Parallel Tasks

Switch between multiple tasks:

```bash
#xoch-pause           # Pause current task
#xoch-resume [task]   # Resume paused/archived task
```

---

## Glossaries

Maintain consistent terminology with project-specific glossaries:

```bash
#xoch-glossary        # Add/update project terms
```

Glossaries are stored in `.xoch/glossaries/` and committed to git for team-wide consistency.

See [prompts/README.md](prompts/README.md) for detailed prompt documentation.

---

## Project Structure

Xoch uses `.xoch/` for all working files:

```
your-project/
├── README.md                    # Application spec
├── .xoch/                       # Xoch workspace (flexible gitignore)
│   ├── glossaries/              # Project terminology (shareable)
│   │   ├── README.md
│   │   └── quick-reference.md
│   └── context/                 # Task context (flexible gitignore)
│       ├── current.md           # Active task
│       ├── [task-id]/           # Task context
│       │   ├── spec.md
│       │   ├── plan.md
│       │   └── milestones.md
│       └── archive/             # Completed tasks
└── src/feature/
    └── README.md                # Feature spec
```

Add to `.gitignore` (choose your sharing preference):
```bash
# Option 1: Ignore everything (default - solo development)
echo ".xoch/" >> .gitignore

# Option 2: Share glossaries only (ignore context)
echo ".xoch/context/" >> .gitignore

# Option 3: Share glossaries + context folders (ignore active task pointer)
echo ".xoch/context/current.md" >> .gitignore
```

---

## Example Workflow

```bash
# New feature
#xoch-spec          # Requirements
#xoch-plan          # Break into milestones
#xoch-start         # Begin M1
#xoch-advance       # Complete M1 → M2
#xoch-advance       # Complete M2 → M3
#xoch-advance       # Complete M3 (updates READMEs)
#xoch-finalize      # Archive

# Requirements change mid-feature
#xoch-replan        # Update remaining milestones
#xoch-advance       # Continue

# Context switching
#xoch-pause         # Pause feature-a
#xoch-spec          # Start bug-fix
# ... fix bug ...
#xoch-finalize      # Complete bug
#xoch-resume        # Back to feature-a
```

---

## Documentation

- **[prompts/README.md](prompts/README.md)** - Detailed prompt documentation
- **[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)** - Complete system specification
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines

---

## Key Features

- **Token budgets** per phase prevent context overflow
- **Project glossaries** maintain terminology consistency
- **Pause/resume** for parallel task management
- **Milestone snapshots** preserve decision history
- **Living READMEs** eliminate changelogs

---

## Troubleshooting

**Prompt not found**: Run `./install.sh` and restart VS Code/Codex

**Context files not found**: Run `#xoch-spec` to create initial context

**README conflicts**: Use `#xoch-merge` to resolve

---

## License

MIT License - See [LICENSE](LICENSE)

---

[^1]: It is also the name of my black cat, short for Xochi, which is, in turn, short for Xochitl, which means "flower" in Nahuatl. She's very cute.