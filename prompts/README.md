# Xoch Prompts

All Xoch prompts (AI agent workflows). Each prompt guides you through a specific phase of development.

---

## Invocation

**GitHub Copilot / Cursor**: `#xoch-[name]`
**Codex**: `$xoch-[name]`

---

## Prompt Categories

### Setup & Initialization

| Prompt | Purpose | Output |
|--------|---------|--------|
| **init-app** | Create/update application README | Application README.md |
| **init-feature** | Create/update feature README | Feature README.md |
| **validate** | Verify README accuracy | Validation findings |

**Use for:**
- First-time Xoch setup in existing projects
- Major refactors requiring documentation updates
- Validating documentation accuracy

---

### Main Workflow

Core development workflow for implementing features:

| Prompt | Purpose | Output |
|--------|---------|--------|
| **spec** | Capture requirements | `.xoch/current.md`, `spec.md` |
| **plan** | Architect solution + milestones | `plan.md`, `milestones.md` |
| **start** | Begin milestone work | - |
| **advance** | Complete milestone, move to next | `milestone-N.md`, updated READMEs |
| **finalize** | Archive completed work | `.xoch/archive/[task-id]-YYYY-MM-DD/` |
| **merge** | Resolve README conflicts | Merged README.md |

**Flow:**
```
spec → plan → start → advance (repeat) → finalize → merge (if conflicts)
```

---

### Optional Prompts

Handle special situations anytime:

| Prompt | Purpose | When to Use |
|--------|---------|-------------|
| **sidebar** | Explore tangential questions | Research without affecting milestone |
| **replan** | Update milestone structure | Requirements evolve mid-feature |
| **pause** | Pause current task | Context switch, blocked, end of day |
| **resume** | Resume paused/archived task | Return to paused work |
| **glossary** | Add/update terminology | Document project-specific terms |

---

### Meta Prompts

| Prompt | Purpose |
|--------|---------|
| **mod** | Modify Xoch itself (create/update prompts) |
| **test-hello** | Verify Xoch installation |

---

## Detailed Descriptions

### init-app

**Purpose**: Analyze codebase and create/update application-level README.

**Use when:**
- Setting up Xoch in existing project
- Major refactors
- README needs comprehensive update

**Creates**: Application `README.md` with:
- System overview
- Technical architecture
- Cross-cutting concerns
- Coding conventions

**Features:**
- Offers to create glossary structure (`./glossaries/`)
- Loads existing glossaries during analysis

---

### init-feature

**Purpose**: Analyze feature directory and create/update feature README.

**Use when:**
- Documenting existing features
- Feature implementation complete but undocumented

**Creates**: Feature `README.md` with:
- What the feature does (user perspective)
- How it works (technical perspective)
- Feature interactions
- Test scenarios

**Features:**
- Loads project glossaries for consistent terminology

---

### validate

**Purpose**: Verify README accuracy against actual implementation.

**Use when:**
- README might be outdated
- Joining new team/codebase
- Low confidence in documentation

**Skip when:**
- Using Xoch consistently (keeps READMEs accurate)

**Features:**
- Conditionally loads glossaries if validating terminology

---

### spec

**Purpose**: Capture task requirements interactively.

**Process:**
1. Asks for task link/identifier
2. Gathers requirements
3. Checks for investigation findings (integrates if present)
4. Loads project glossaries
5. Asks clarifying questions
6. Token budget check before reading files (5,000 limit)

**Creates:**
- `.xoch/current.md` - Active task tracker
- `.xoch/[task-id]/spec.md` - Requirements document

**Features:**
- Token tracking to prevent context overflow
- Investigation integration
- Glossary-aware requirement capture

---

### plan

**Purpose**: Architect solution and break into milestones.

**Process:**
1. Reviews spec
2. Analyzes codebase architecture
3. Token budget check (10,000 limit)
4. Creates implementation approach
5. Breaks work into milestones
6. Estimates complexity

**Creates:**
- `.xoch/[task-id]/plan.md` - Architecture approach
- `.xoch/[task-id]/milestones.md` - Milestone tracker

**Milestone structure:**
- Clear, testable deliverables
- 1-2 days work each
- Incremental progress

---

### start

**Purpose**: Begin implementation of current milestone.

**Process:**
1. Shows current milestone context
2. Token budget check (15,000 limit - largest budget)
3. Identifies files to modify/create
4. Provides implementation guidance

**Use:**
- First milestone only
- Continue with `#xoch-advance` for subsequent milestones

---

### advance

**Purpose**: Complete current milestone and advance to next.

**Process:**
1. Reviews git changes
2. Validates against milestone requirements
3. Token budget check for additional context (10,000 limit)
4. Conditionally loads glossaries (only when updating READMEs)
5. Creates milestone snapshot
6. Advances to next milestone
7. **When all complete**: Updates READMEs, prepares for finalize

**Key feature**: README updates happen during final advance, not in finalize.

**Use repeatedly** until all milestones complete.

---

### sidebar

**Purpose**: Pause milestone work to explore tangential questions.

**Use for:**
- Understanding existing code
- Exploring architecture
- Learning how something works

**Not for:**
- Milestone implementation (use advance)

**Return**: Use `#xoch-advance` to resume milestone.

---

### replan

**Purpose**: Update milestones when requirements change mid-feature.

**Preserves:**
- Completed milestones
- All context and decisions

**Updates:**
- Remaining milestones
- Architecture if needed

**Continue**: Use `#xoch-advance` after replanning.

---

### finalize

**Purpose**: Archive completed work after all milestones done.

**Process:**
1. Loads project glossaries
2. Verifies READMEs are current (should be updated by final advance)
3. **Suggests new glossary terms** based on completed work (if glossaries exist)
4. Archives context to `.xoch/archive/[task-id]-YYYY-MM-DD/`
5. Clears `.xoch/current.md`

**Glossary suggestions:**
- Analyzes milestones for domain-specific terms
- Checks against existing glossaries
- Suggests 3-5 valuable terms to add
- Optional - can add with `#xoch-glossary` or skip

**Use when:**
- All milestones complete
- READMEs updated
- Ready to commit

---

### merge

**Purpose**: Resolve README conflicts after git merge.

**Use when:**
- README merge conflicts occur
- Multiple branches updating same sections

**Strategy:**
- Preserves both changes
- Maintains chronological order
- Ensures accuracy

---

### pause

**Purpose**: Pause current task for parallel work.

**Use when:**
- Context switching to urgent work
- Blocked waiting for review
- End of day (save state)

**Process:**
1. Shows task status
2. Confirms pause
3. Removes `.xoch/current.md`
4. Preserves all task files

**Preserved:**
- Spec, plan, milestones
- Completed milestone snapshots
- Token tracking
- All decisions and notes

**Switch between**: Can pause multiple tasks simultaneously.

---

### resume

**Purpose**: Resume paused or archived task.

**Process:**
1. Checks for active task (must pause first)
2. Lists available paused/archived tasks
3. Asks which to resume (or uses provided task-id)
4. Restores from archive if needed
5. Recreates `.xoch/current.md`
6. Shows task summary and next steps

**Use when:**
- Resuming paused work
- Returning to completed task for fixes
- Switching between parallel tasks

**Task states:**
- **Active**: Entry in `current.md`
- **Paused**: Directory in `.xoch/[task-id]/`
- **Archived**: Directory in `.xoch/archive/[task-id]-[date]/`

---

### glossary

**Purpose**: Add/update project-specific terminology.

**Process:**
1. Checks for `./glossaries/` directory
2. Asks for term and context
3. Determines target glossary file
4. Adds/updates entry
5. Maintains consistency

**Glossary types:**
- `quick-reference.md` - Core terms (always loaded)
- `entities.md` - Data models/schemas
- `integrations.md` - Third-party mappings
- Custom domain glossaries

**Use anytime** - doesn't affect current task.

---

### mod

**Purpose**: Modify Xoch itself (meta-prompt for Xoch development).

**Use when:**
- Creating new prompts
- Updating existing workflows
- Extending Xoch functionality

**Not for:** Your application development (use main workflow).

---

### test-hello

**Purpose**: Verify Xoch installation.

**Output:** Test greeting confirming prompts are accessible.

**Use after:** Running `./install.sh`

---

## Token Budget System

Per-phase token limits prevent context overflow:

| Phase | Budget | Purpose |
|-------|--------|---------|
| **Spec** | 8,000 | Reading implementation files |
| **Plan** | 13,000 | Understanding architecture |
| **Start** | 18,000 | Milestone deep-dive |
| **Advance** | 15,000 | Additional context beyond git diff |
| **Sidebar** | 8,000 | Answering tangential questions |
| **Replan** | 12,000 | Adjusting milestones |
| **Pause** | 5,000 | Status summary |
| **Resume** | 8,000 | Loading archived context |
| **Glossary** | 8,000 | Reading existing glossaries |
| **Finalize** | 12,000 | Reading milestones for README updates |

**Unlimited**: init-app, init-feature, validate, merge

**Budgets include prompt overhead** (~1.4K-4.5K tokens) plus files you read.

**Process:** Identify files → Estimate (`bin/tokenEstimator.sh --batch`) → Check if ≥90% → Prioritize if over

---

## Glossary System

Project-specific terminology in `./glossaries/` for consistent understanding.

**Structure:**
- `quick-reference.md` - Core terms (always read)
- `entities.md` - Data models
- `integrations.md` - Third-party systems
- `[domain].md` - Domain-specific

**When loaded:**
- Always: `init-app`, `init-feature`, `spec`, `finalize`
- Conditional: `validate`, `advance` (only when updating READMEs)
- Never: `plan`, `start`, `investigate`, `replan`, `pause`, `resume`, `merge`

**Management:** Use `#xoch-glossary` to add terms, commit to git for team use.

---

## Parallel Task Management

Switch between tasks with `#xoch-pause` and `#xoch-resume`.

**States:**
- **Active**: Entry in `current.md`
- **Paused**: Directory in `.xoch/[task-id]/`
- **Archived**: Directory in `.xoch/archive/[task-id]-[date]/`

**Example:**
```bash
#xoch-pause         # Pause feature-a
#xoch-spec          # Start bug-fix
# ... work ...
#xoch-finalize
#xoch-resume        # Back to feature-a
```
