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
#xoch-test-hello
```

In Codex:
```
$xoch-test-hello
```

You should see a test greeting confirming the installation.

---

## Usage

### First Time Setup (Existing Codebase)

If you're adding Xoch to an existing project:

**1. Initialize application README:**
```
#xoch-init-app
```
→ Analyzes your codebase and creates/updates the application-level README

**2. Initialize feature READMEs:**
```
#xoch-init-feature
```
→ Analyzes individual feature directories and creates feature-level READMEs

Run this for each major feature in your application.

---

### Development Workflow (New Features)

Once READMEs exist, use the main workflow for all new development:

#### Phase 1: Validate
```
#xoch-validate
```
Verify README accuracy before starting work.

#### Phase 2: Specify
```
#xoch-spec
```
Capture task identifier and requirements interactively.
- Creates `.context/current.md` (tracks active task)
- Creates `.context/[task-id]/spec.md` (requirements)

#### Phase 3: Plan
```
#xoch-plan
```
Architect solution and break into milestones.
- Creates `.context/[task-id]/plan.md` (architecture)
- Creates `.context/[task-id]/milestones.md` (milestone tracker)

#### Phase 4: Start
```
#xoch-start
```
Begin implementation of current milestone.

#### Phase 5: Advance (Repeat for each milestone)
```
#xoch-advance
```
Complete current milestone and advance to next.
- Reviews changes against requirements
- Creates milestone snapshot
- Advances to next milestone

**Optional - Sidebar:**
```
#xoch-sidebar
```
Pause milestone work to explore related questions.
- Use anytime during development
- Returns to milestone with `#xoch-advance`

**Optional - Replan:**
```
#xoch-replan
```
Update milestones when new requirements emerge.
- Preserves completed milestones
- Adds/modifies remaining milestones
- Continue with `#xoch-advance`

#### Phase 6: Finalize
```
#xoch-finalize
```
Update READMEs and archive context (after all milestones complete).
- Updates feature README
- Updates application README (if needed)
- Archives context to `.context/archive/[task-id]-YYYY-MM-DD/`
- Clears `.context/current.md`

#### Phase 7: Merge (Optional)
```
#xoch-merge
```
Resolve README conflicts (if merge conflicts occur).

---

## File Structure

### In Your Projects

When using Xoch, your projects will have:

```
your-project/
├── README.md                           # Application-level README
├── .context/
│   ├── current.md                      # Currently active task
│   ├── [task-id]/
│   │   ├── spec.md                     # Requirements
│   │   ├── plan.md                     # Architecture approach
│   │   ├── milestones.md               # Milestone tracker
│   │   ├── milestone-1.md              # Completed milestone snapshot
│   │   ├── milestone-2.md              # Completed milestone snapshot
│   │   └── replan-YYYY-MM-DD.md        # Replan records (if any)
│   └── archive/
│       └── [task-id]-YYYY-MM-DD/       # Archived completed work
├── src/
│   └── feature-name/
│       └── README.md                   # Feature-level README
└── .gitignore                          # Add .context/ to ignore

```

**Important:** Add `.context/` to your `.gitignore`:
```bash
echo ".context/" >> .gitignore
```

### In Xoch Repository

```
xoch/
├── README.md                           # This file
├── SYSTEM_DESIGN.md                    # Complete system specification
├── install.sh                          # Installation script
└── prompts/
    ├── init-app.md                     # Initialize app README
    ├── init-feature.md                 # Initialize feature README
    ├── validate.md                     # Verify README accuracy
    ├── spec.md                         # Capture requirements
    ├── plan.md                         # Create milestones
    ├── start.md                        # Begin milestone
    ├── advance.md                      # Complete & advance
    ├── sidebar.md                      # Explore tangents
    ├── replan.md                       # Update milestones
    ├── finalize.md                     # Update READMEs
    ├── merge.md                        # Resolve conflicts
    ├── mod.md                          # Modify Xoch itself
    └── test-hello.md                   # Test installation
```

---

## Workflow Examples

### Simple Feature (3 milestones)

```bash
# Start new feature
#xoch-spec          # Capture task requirements

#xoch-plan          # Break into 3 milestones
                       # → Milestone 1: Backend API
                       # → Milestone 2: Frontend UI
                       # → Milestone 3: Testing

#xoch-start         # Begin Milestone 1

# Work on Milestone 1...
#xoch-advance       # Complete M1, advance to M2

# Work on Milestone 2...
#xoch-advance       # Complete M2, advance to M3

# Work on Milestone 3...
#xoch-advance       # Complete M3
                       # → "All milestones complete!"

#xoch-finalize      # Update READMEs, archive context
```

### Complex Feature (requirements evolve)

```bash
#xoch-spec          # Capture task requirements
#xoch-plan          # 4 milestones planned

#xoch-start         # Begin Milestone 1
#xoch-advance       # Complete M1
#xoch-advance       # Complete M2

# Discover need for additional work...
#xoch-replan        # Add 2 new milestones
                       # → Now 6 milestones total

#xoch-advance       # Complete M3
#xoch-advance       # Complete M4

# Have a question...
#xoch-sidebar       # "How does auth work?"
                       # [Discussion happens]
#xoch-advance       # Resume M5

#xoch-advance       # Complete M5
#xoch-advance       # Complete M6

#xoch-finalize      # Update READMEs, archive context
```

---

## Available Prompts

| Prompt | Purpose | When to Use |
|--------|---------|-------------|
| `init-app` | Create/update application README | First-time setup or major refactor |
| `init-feature` | Create/update feature README | Document existing features |
| `validate` | Verify README accuracy | Before starting new work |
| `spec` | Capture task requirements | Start new feature work |
| `plan` | Create architecture + milestones | After spec is clear |
| `start` | Begin current milestone | After planning |
| `advance` | Complete milestone, move to next | After each milestone |
| `sidebar` | Explore related questions | Anytime (pause current work) |
| `replan` | Update milestone structure | When requirements evolve |
| `finalize` | Update READMEs, archive | After all milestones complete |
| `merge` | Resolve README conflicts | If merge conflicts occur |
| `mod` | Modify Xoch itself | Maintain/extend Xoch |
| `test-hello` | Test installation | Verify setup |

---

## Modifying Xoch

Want to customize Xoch or add new prompts?

```
#xoch-mod
```

This meta-prompt helps you:
- **Modify existing prompts** - Update workflow steps or behavior
- **Create new prompts** - Add new phases to the workflow
- **View prompts** - Understand how existing prompts work
- **Update documentation** - Keep SYSTEM_DESIGN.md current

The `mod` prompt guides you through the process and automatically updates the installation.

---

## Design Principles

### 1. READMEs Are Source of Truth
- READMEs always reflect current state
- No need for massive changelogs
- Living documentation

### 2. Incremental Progress
- Break work into milestones
- Complete one milestone at a time
- Capture decisions along the way

### 3. Context Preservation
- All decisions documented in `.context/`
- Replan records explain why plans changed
- Milestone snapshots preserve history

### 4. Engineer Control
- Agent assessments are advisory
- Engineer has final say on all decisions
- Can iterate at any step

### 5. Quality Gates
- README validation before starting
- Requirements review on every advance
- Documentation updates on finalize

---

## Best Practices

### Context Management
- ✅ **DO** add `.context/` to `.gitignore`
- ✅ **DO** archive completed work in `.context/archive/`
- ✅ **DO** keep `current.md` up to date
- ❌ **DON'T** commit `.context/` to git (personal workspace state)

### Milestone Planning
- ✅ **DO** break large features into 3-7 milestones
- ✅ **DO** make each milestone independently testable
- ✅ **DO** replan when requirements evolve
- ❌ **DON'T** make milestones too granular (not one per file)

### README Maintenance
- ✅ **DO** update READMEs in `finalize` phase
- ✅ **DO** describe how features work, not how they changed
- ✅ **DO** include testing scenarios in feature READMEs
- ❌ **DON'T** let READMEs drift from implementation

### Using Sidebar
- ✅ **DO** use sidebar for exploratory questions
- ✅ **DO** use sidebar to understand existing code
- ✅ **DO** return with `advance` when done
- ❌ **DON'T** use sidebar for implementation (use milestones)

---

## Agents Supported

### GitHub Copilot (VS Code)
- ✅ Built-in VS Code integration
- ✅ Use `.prompt.md` files via chat
- ✅ Invocation: `#xoch-[name]`

### Cursor
- ✅ VS Code fork with Copilot built-in
- ✅ Uses same prompts as Copilot
- ✅ Invocation: `#xoch-[name]`

### Codex (OpenAI CLI)
- ✅ Requires `SKILL.md` format + metadata
- ✅ Installer handles conversion automatically
- ✅ Invocation: `$xoch-[name]`

---

## Troubleshooting

### "Prompt not found"
1. Run `./install.sh` from xoch directory
2. Restart VS Code or Codex
3. Try the test prompt: `#xoch-test-hello`

### "Context files not found"
- Ensure you've run `#xoch-spec` to create context
- Check that `.context/current.md` exists
- Verify Task ID is correct

### "README conflicts on merge"
- Use `#xoch-merge` to harmonize README changes
- Agent will analyze both versions and propose merged content

---

## Contributing

Want to improve Xoch?

1. **Modify prompts**: Use `#xoch-mod` for guided changes
2. **Update documentation**: Keep SYSTEM_DESIGN.md aligned with prompts
3. **Test changes**: Verify with real projects before committing
4. **Share feedback**: Open issues or PRs with improvements

---

## Philosophy

> "The best documentation is the code itself... and a README that explains why."

Xoch embraces this by:
- Making READMEs the specification AND documentation
- Capturing the "why" in context files
- Eliminating duplicate documentation efforts
- Keeping documentation alive through enforcement

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to:
- Modify existing prompts
- Create new workflow phases
- Improve documentation
- Report issues or suggest features

---

## Credits

Created for development teams who want:
- 📖 Living documentation that stays current
- 🎯 Spec-driven development with AI assistance
- 📝 Historical context without massive changelogs
- 🤖 Workflow automation that respects engineer autonomy

**Maintained with Xoch** - This project uses itself for development!

---

## Support

- 📖 [Read the documentation](README.md)
- 🐛 [Report issues](https://github.com/jeffcarbine/xoch/issues)
- 💬 [Join discussions](https://github.com/jeffcarbine/xoch/discussions)
- ⭐ Star the project if you find it useful!

---

[^1]: It is also the name of my black cat, short for Xochi, which is, in turn, short for Xochitl, which means "flower" in Nahuatl. She's very cute.