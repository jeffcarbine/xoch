# Contributing to Xoch

Thank you for your interest in improving Xoch! This guide will help you understand how to modify existing prompts or create new ones.

---

## Quick Start

The easiest way to modify Xoch is using Xoch itself!

```
#xoch-mod
```

This meta-prompt will guide you through:
- Modifying existing prompts
- Creating new prompts
- Understanding the system architecture
- Testing your changes

---

## Manual Modification

If you prefer to work manually:

### Modifying Existing Prompts

1. **Find the prompt** in `/prompts/[name].md`

2. **Understand the structure**:
   ```markdown
   ---
   name: xoch-[name]
   description: Brief description
   ---
   
   # Xoch - [Title]
   
   [Content...]
   ```

3. **Make your changes** while following the [Design Guidelines](#design-guidelines)

4. **Test your changes**:
   ```bash
   ./install.sh
   # Then test with #xoch-[name]
   ```

5. **Update documentation** if adding new behavior:
   - Update `SYSTEM_DESIGN.md` if changing workflow
   - Update `README.md` if changing usage

### Creating New Prompts

1. **Plan the prompt**:
   - What phase of the workflow does it support?
   - When should engineers use it?
   - What context does it need?
   - What does it output?

2. **Create the file** at `/prompts/[name].md`

3. **Follow the template**:
   ```markdown
   ---
   name: xoch-[name]
   description: One-line description
   ---
   
   # Xoch - [Title]
   
   You are helping an engineer [purpose].
   
   ## Your Role
   
   [Describe agent's responsibility]
   
   ---
   
   ## Process
   
   ### Step 1: [First Step]
   [Instructions]
   
   ### Step 2: [Second Step]
   [Instructions]
   
   [Continue...]
   
   ---
   
   ## Important Notes
   
   [Key considerations]
   
   ---
   
   ## Example Interaction
   
   [Show it in action]
   ```

4. **Install and test**:
   ```bash
   ./install.sh
   # Verify prompt appears in installation output
   # Test with #xoch-[name]
   ```

5. **Update documentation**:
   - Add to workflow phases in `SYSTEM_DESIGN.md`
   - Add to prompts list in `README.md`
   - Document when to use it

---

## Design Guidelines

### Consistency Rules

All Xoch prompts should follow these patterns:

#### 1. Auto-Detect Current Task
```markdown
### Step 1: Auto-Detect Current Task

Read `.xoch/current.md` to identify:
- task ID
- Feature name
- Feature README path

If `current.md` doesn't exist or is empty:
- Ask: "Which task...?"
- Wait for response
```

#### 2. Read Before Asking
Get information from context files when possible. Don't re-ask for things already captured:

**✅ Good:**
```markdown
Read `.xoch/[task-id]/spec.md` to get the Task URL
```

**❌ Bad:**
```markdown
Ask: "What is the Task URL?"
```

#### 3. Provide Context
Show engineers where they are in the workflow:

```markdown
📍 CURRENT CONTEXT

Task: [task-id] - [Feature Name]

Progress:
✅ Milestone 1: Complete
✅ Milestone 2: Complete
🔵 Milestone 3: In Progress (Current)
⬜ Milestone 4: Not Started
```

#### 4. Interactive Confirmation
Engineer always has final say:

```markdown
**"Ready to proceed?**

**Options:**
1. Yes, continue
2. No, not yet
3. Adjust something first

**Your choice:"**
```

#### 5. Save Artifacts
Create `.md` files in the context directory:

```markdown
Create `.xoch/[task-id]/[artifact].md` containing:
[Content structure]
```

#### 6. Use Status Indicators
- ✅ Complete
- ⚠️ Warning/Issue
- 🔵 In Progress
- ⬜ Not Started
- 💡 Observation/Note
- 🎯 Goal/Target
- 📋 Summary
- 🔍 Analysis

#### 7. Format for Copy/Paste
Use four dashes and indentation for copyable blocks:

```markdown
----
## Pull Request Title
\`\`\`bash
[Content that can be copied]
\`\`\`
----
```

---

## File Structure Conventions

### Context Files

| File | Purpose | Created By | Modified By |
|------|---------|-----------|-------------|
| `.xoch/current.md` | Track active task | `spec` | `finalize` (clears) |
| `.xoch/[task-id]/spec.md` | Requirements | `spec` | - |
| `.xoch/[task-id]/plan.md` | Architecture | `plan` | - |
| `.xoch/[task-id]/milestones.md` | Tracker | `plan` | `advance`, `replan` |
| `.xoch/[task-id]/milestone-N.md` | Snapshot | `advance` | - |
| `.xoch/[task-id]/replan-DATE.md` | Replan record | `replan` | - |
| `.xoch/archive/[task-id]-DATE/` | Archived | `finalize` | - |

### Naming Conventions

- **Prompt files**: `[name].md` → becomes `xoch-[name]`
- **Context directory**: `.xoch/[task-id]/`
- **Task ID**: Extracted from URL between `/browse/` and `?`
- **Date format**: `YYYY-MM-DD` for archives and replan records
- **Milestone files**: `milestone-[N].md` where N is 1-indexed

---

## Testing Your Changes

### 1. Installation Test
```bash
./install.sh
```
Should show your prompt in the installation list.

### 2. Invocation Test
```
#xoch-[your-prompt]
```
Should load and respond.

### 3. Functional Test

Create a test scenario:
- Set up test context files if needed
- Run through the workflow
- Verify behavior matches expectations
- Check that files are created/updated correctly

### 4. Integration Test

Test how your prompt interacts with others:
- Does it read the right context?
- Does it create files that other prompts expect?
- Does it fit naturally in the workflow?

---

## Common Patterns

### Running Commands

```markdown
Run the command:

\`\`\`bash
your-command-here
\`\`\`

Analyze the output:

**If successful:**
[Handle success]

**If failed:**
[Handle failure]
```

### Reading Context Files

```markdown
Read `.xoch/[task-id]/milestones.md`

Identify:
- Current milestone number
- Which milestones are complete
- Remaining milestones
```

### Creating Files

```markdown
Create `.xoch/[task-id]/[filename].md`:

\`\`\`markdown
# [Title]

**Date**: [Current Date]

[Content structure...]
\`\`\`
```

### Handling Missing Context

```markdown
If `current.md` doesn't exist or is empty:
- Ask: "Which task are you working on?"
- Wait for response
- Use provided information

Otherwise, auto-detect from `current.md`
```

---

## Documentation Standards

When modifying prompts, update these files:

### SYSTEM_DESIGN.md
Update if you:
- Add a new workflow phase
- Change the workflow sequence
- Modify context file structure
- Change core principles

### README.md
Update if you:
- Add a new prompt (add to table)
- Change when to use a prompt
- Modify the workflow steps
- Add new examples

### Prompt File Itself
Include in every prompt:
- Purpose explanation
- When to use it
- Step-by-step process
- Important notes
- Example interaction

---

## Code Review Checklist

Before submitting changes:

- [ ] Follows [Design Guidelines](#design-guidelines)
- [ ] Includes YAML frontmatter with `name` and `description`
- [ ] Auto-detects current task from `current.md` (if applicable)
- [ ] Reads context files instead of re-asking for info
- [ ] Provides clear status indicators (✅ ⚠️ 🔵 ⬜)
- [ ] Engineer has final say on decisions
- [ ] Includes example interaction
- [ ] Tested with `./install.sh`
- [ ] Documentation updated (`SYSTEM_DESIGN.md` and/or `README.md`)
- [ ] Prompt appears in installation output
- [ ] Invocation works (`#xoch-[name]`)
- [ ] Creates expected context files (if applicable)
- [ ] Integrates properly with other prompts

---

## Advanced Topics

### Installer Logic

The `install.sh` script:
1. Finds all `.md` files in `/prompts/`
2. Extracts `name:` from YAML frontmatter
3. For Copilot: Creates symlink at `~/Library/Application Support/Code/User/prompts/`
4. For Codex: Copies file and generates `agents/openai.yaml` metadata

**You don't need to modify the installer** unless changing installation logic.

### Multi-Agent Support

Xoch supports:
- **GitHub Copilot**: Uses `.prompt.md` format via symlinks
- **Codex**: Uses `SKILL.md` format via file copies + metadata
- **Cursor**: Uses Copilot prompts (no separate installation)

The installer handles all conversions automatically.

### Context Lifecycle

Understanding context file lifecycle:

1. **Created by `spec`**: `current.md`, `spec.md`
2. **Created by `plan`**: `plan.md`, `milestones.md`
3. **Created by `advance`**: `milestone-N.md` (repeating)
4. **Created by `replan`**: `replan-DATE.md` (optional, repeating)
5. **Archived by `finalize`**: All files moved to `archive/`
6. **Cleared by `finalize`**: `current.md`

---

## Getting Help

Need assistance?

1. **Use the mod prompt**: `#xoch-mod` provides guided help
2. **Read examples**: Look at existing prompts for patterns
3. **Check SYSTEM_DESIGN.md**: Complete system specification
4. **Open an issue**: File an issue on GitHub
5. **Join discussions**: Share ideas in GitHub Discussions

---

## Philosophy

When contributing, remember Xoch's core values:

1. **READMEs are source of truth** - Always current, never stale
2. **Incremental progress** - Milestones track the journey
3. **Context preservation** - Capture decisions and rationale
4. **Engineer control** - Agents advise, engineers decide
5. **Quality gates** - Enforce standards automatically

Keep these in mind when designing new features!

---

## Example: Adding a Test Runner

Let's walk through adding a `test` prompt that runs tests before allowing advancement:

**1. Plan the prompt:**
- Runs after lint check in `advance`
- Executes `npm test`
- Blocks advancement if tests fail
- Offers to fix or skip

**2. Create `/prompts/test.md`:**
```markdown
---
name: xoch-test
description: Run tests before milestone advancement
---

# Xoch - Test Runner

You are helping an engineer verify tests pass before advancing.

## Your Role

Run the test suite and ensure all tests pass before allowing milestone advancement.

[Continue with process steps...]
```

**3. Modify `advance.md`:**
Add test step after lint check:

```markdown
### Step 7: Run Lint Check
[Existing lint logic]

---

### Step 8: Run Tests

Run the test command:

\`\`\`bash
npm test
\`\`\`

[Handle pass/fail]
```

**4. Test:**
```bash
./install.sh
#xoch-advance  # Verify test step runs
```

**5. Document:**
- Add to `SYSTEM_DESIGN.md` workflow phases
- Add to `README.md` prompts table
- Note that `advance` now includes testing

Done! You've extended Xoch with a new quality gate.