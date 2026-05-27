# Xoch System Design

**Spec-Driven Development with Living Documentation**

A lightweight, spec-driven development system where README files serve as both living specifications and documentation, eliminating the need for massive change logs while maintaining clarity on how systems and features work.

## Core Philosophy

- **Documentation IS the specification** - README files are the source of truth
- **Context over history** - Focus on current state, not append-only logs
- **Human-guided, AI-assisted** - Engineers architect, agents execute
- **Feature-level granularity** - Each feature maintains its own specification
- **Interactive by design** - Prompts ask questions and guide engineers through each phase

---

## Prompt Interaction Model

All Xoch prompts follow an **interactive question-driven approach**:

1. Engineer invokes a prompt (e.g., `#xoch-spec`, `$xoch-plan`)
2. Agent asks specific questions to gather needed information
3. Engineer provides answers
4. Agent analyzes, provides feedback, and may ask follow-ups
5. Process continues until phase is complete

**Example** - Spec Phase:
```
Engineer: #xoch-spec
Agent: "What is the link to the task?"
Engineer: [provides URL]
Agent: "Please provide the spec for this task"
Engineer: [provides description]
Agent: [analyzes and asks clarifying questions]
```

This approach ensures consistency, gathers all necessary context, and guides engineers through the workflow systematically.

---

## File Structure & Conventions

### README Hierarchy

```
application/
├── README.md                              # Project-level specification
├── .context/                              # Working context (gitignored)
│   ├── current.md                         # Current active task (Task ID)
│   ├── user-auth/                        # Active task context (by Task ID)
│   │   ├── validate.md                    # Validation findings
│   │   ├── spec.md                        # task requirements
│   │   ├── plan.md                        # Architecture + approach
│   │   ├── milestones.md                  # Milestone tracker (current status)
│   │   ├── milestone-1.md                 # Completed milestone snapshots
│   │   ├── milestone-2.md
│   │   ├── milestone-N.md
│   │   └── finalize.md                    # Documentation updates
│   ├── bug-404/                           # Another task context
│   │   └── ...
│   ├── archive/                           # Completed tasks (historical)
│   │   ├── user-auth-2026-05-26/          # Archived context (Task ID + date)
│   │   └── bug-404-2026-05-27/
│   └── .gitignore
├── .xoch                               # Configuration file (optional)
└── path/to/feature/
    └── README.md                          # Feature-level specification
```

### README Content Guidelines

**Project-level README.md** should contain:
- High-level system overview
- How end-users interact with the system
- Technical architecture patterns
- Coding conventions and organizational rules
- Cross-cutting concerns

**Feature-level README.md** should contain:
- What the feature does (user perspective)
- How the feature works (technical perspective)
- How it interacts with other features
- Test scenarios and acceptance criteria
- Known limitations (if any)

**Keep READMEs tight and streamlined** - Avoid bloat. Focus on clarity and essential information.

---

## Context Tracking

Xoch uses task IDs (e.g., `IE-1285`) as the primary identifier for tasks. This provides:
- **Unique identification** - Task IDs are globally unique
- **Traceability** - Direct link to requirements and project management
- **Clean naming** - Short, consistent directory names
- **Source of truth** - Issue tracker is the authoritative task source

### Current Task File

`.context/current.md` tracks the active task:

```markdown
# Current Task

**Task ID**: IE-1285
**Feature**: User Authentication OAuth
**Feature README**: src/authentication/README.md
**Started**: 2026-05-26
```

**Benefits:**
- Prompts automatically detect current task (no need to specify each time)
- Context preserved across prompt invocations
- Clear indication of what's in progress
- Supports switching between multiple tasks

**Prompt Behavior:**
1. Read `.context/current.md` to get Task ID
2. If found and valid, use that task context automatically
3. If not found or unclear, ask engineer for Task ID
4. Continue with identified task

---

## Development Workflow

### Bootstrapping Phase (One-Time Setup)

Before using the main Xoch workflow, you must establish README documentation for your application and features. These prompts help you document existing codebases.

#### Initialize Application README

**Trigger**: Need to document the application for the first time or major updates

**Process**:
1. Engineer invokes the `init-app` prompt
2. Agent reads existing README.md (if any)
3. Agent analyzes folder structure and codebase
4. Agent identifies all features and architecture
5. Agent presents analysis to engineer for confirmation
6. Engineer provides corrections/feedback
7. Agent generates/updates comprehensive application README

**Outputs**:
- Complete `README.md` at application root
- Documentation of all features, architecture, conventions

**Use Cases**:
- First-time setup of Xoch in existing codebase
- Major architectural changes requiring README overhaul
- Onboarding new projects to Xoch

---

#### Initialize Feature README

**Trigger**: Need to document a specific feature for the first time

**Process**:
1. Engineer invokes the `init-feature` prompt with feature path
2. Agent reads existing feature README (if any)
3. Agent reads application README for context
4. Agent analyzes feature code to understand functionality
5. Agent identifies integration points with other features
6. Agent presents analysis to engineer for confirmation
7. Engineer provides corrections/feedback
8. Agent generates/updates comprehensive feature README

**Outputs**:
- Complete `README.md` in feature directory
- Documentation of functionality, API, integration points, testing

**Use Cases**:
- First-time setup of Xoch for existing features
- Adding documentation to undocumented features
- Major feature refactors requiring README updates

---

### Main Workflow (Ongoing Development)

Once READMEs are established, use the main workflow for all new development:

---

### Phase 1: Validate & Start Development

**Trigger**: Engineer is ready to begin work on a task

**Process**:
1. Engineer invokes the `validate` prompt
2. Agent reads the relevant feature README.md to understand current state
3. Agent verifies README is accurate against actual codebase
4. Agent flags any discrepancies between spec and implementation
5. Engineer either updates README or confirms it's accurate

**Outputs**: 
- Validated understanding of current state
- Report of findings (displayed to engineer)

**Note**: Validation happens before task context is created. This is a quick check phase.
Context directory will be created in the spec phase once Task ID is known.

---

### Phase 2: Provide Specification

**Trigger**: Engineer has task and is ready to define the work

**Process** (Interactive):
1. Engineer invokes the `spec` prompt
2. Agent asks: "What is the link to the task?"
3. Engineer provides task URL
4. Agent asks: "Please provide the spec for this task (copy/paste from issue tracker or describe)"
5. Engineer provides detailed specification
6. Agent analyzes spec against current README state
7. Agent identifies what will change and what will remain the same
8. Agent asks clarifying questions if spec is ambiguous
9. Agent stores all information in context

**Outputs**:
- `.context/current.md` - Tracks current active task (Task ID + feature info)
- `.context/[task-id]/spec.md` containing:
  - task URL and ID
  - Full specification
  - Analysis of changes vs. current state
  - Clarified requirements

**Note**: The spec phase creates the context directory structure and sets the current task.
All subsequent prompts will read `current.md` to identify the active task automatically.

**Note**: The README describes how things work NOW. The spec describes what will CHANGE.

---

### Phase 3: Plan Architecture & Milestones

**Trigger**: Spec is clear and understood

**Process** (Interactive):
1. Engineer invokes the `plan` prompt
2. Agent asks: "Please provide your architectural approach and guidance for implementing this task"
3. Engineer provides implementation strategy
4. Agent asks: "How would you like to break this work into milestones?"
5. Engineer provides milestone breakdown
6. Agent analyzes:
   - Potential pitfalls or issues
   - Breaking changes with other features
   - Missing or unnecessary milestones
   - Dependencies between milestones
   - Suggested milestone refinements
7. Engineer reviews and refines milestones
8. Agent creates formal plan document with approved milestones

**Outputs**:
- `.context/[task-id]/plan.md` containing:
  - Architectural approach
  - Files to be modified/created
  - Implementation strategy
  - Potential risks identified
  - Engineer's final approved approach
- `.context/[task-id]/milestones.md` tracking file:
  - List of all milestones
  - Current milestone indicator
  - Status for each (Not Started / In Progress / Complete)

**Milestone Tracker Example**:
```markdown
# Milestones - User Authentication Feature

## Current Milestone: 1

## Milestone 1: Database Schema
- Create users table with email, password_hash, created_at
- Add unique index on email
- Create migration scripts
**Status**: In Progress

## Milestone 2: API Endpoints
- POST /auth/register - create new user
- POST /auth/login - authenticate and return token
- GET /auth/verify - validate token
**Status**: Not Started

## Milestone 3: Frontend Integration
- Login form component
- Registration flow
- Token storage in localStorage
**Status**: Not Started
```

---

### Phase 4: Start Implementation

**Trigger**: Plan and milestones are approved

**Process**:
1. Engineer invokes the `start` prompt
2. Agent reads `.context/current.md` to identify the task (Task ID)
3. Agent reads `.context/[task-id]/milestones.md`
4. Agent identifies current milestone (first "In Progress" or "Not Started")
5. Agent provides detailed summary:
   - What needs to be implemented
   - Files that will be changed
   - Testing requirements
   - How this milestone fits into the larger plan
5. Agent asks: "Would you like me to implement this, or will you handle it manually?"
6. Engineer either:
   - **Option A**: Instructs agent to implement
   - **Option B**: Implements manually
   - **Option C**: Mix of both (agent does part, engineer does part)

**Outputs**:
- Clear understanding of current milestone scope
- Work begins on implementation

---

### Phase 5: Advance to Next Milestone

**Trigger**: Current milestone work is complete (or engineer believes it is)

**Process**:
1. Engineer invokes the `advance` prompt
2. Agent performs review:
   - Reads current milestone requirements from `milestones.md`
   - Analyzes `git diff` to see what changed
   - Compares changes against milestone requirements
   - Checks if tests exist/pass
3. Agent asks: "Did you make any additional changes not captured in git diff?"
4. Engineer explains any additional context
5. Agent provides assessment:
   - ✅ All milestone requirements met
   - ⚠️ Potential gaps: [lists missing items]
   - 💡 Observations: [notes any concerns]
6. Agent asks: **"Ready to mark this milestone complete and advance?"**
7. Engineer confirms (yes/no):
   - **If no**: Engineer can continue working, invoke `advance` again later
   - **If yes**: Agent proceeds
8. Agent creates milestone snapshot and advances:
   - Creates `.context/[feature-name]/milestone-N.md` with:
     - What was implemented
     - Key decisions made
     - Git commit references
     - Any deviations from plan
   - Updates `milestones.md`:
     - Marks current milestone ✅ Complete
     - Moves to next milestone (sets as "In Progress")
9. Agent determines next action:
   - **If more milestones**: Explains next milestone (like `start` did)
   - **If all milestones complete**: Confirms all work done, ready for final review

**Outputs**:
- `.context/[task-id]/milestone-N.md` (snapshot of completed work)
- Updated `milestones.md` with progress
- Explanation of next milestone (if any)

**Key Feature**: Engineer always has final say - agent assessment is advisory, not blocking.

---

### Sidebar: Explore Related Questions (Available Anytime) - OPTIONAL

**Trigger**: Need to step away from milestone work to explore a related question or tangent

**When to Use**:
- Investigate a technical question before implementing
- Explore alternative approaches
- Research a dependency or integration
- Debug an unexpected issue
- Understand existing code better
- Ask "what if" questions
- Get help with a decision

**Process**:
1. Engineer invokes the `sidebar` prompt (can be used anytime during development)
2. Agent reads `.context/current.md` and milestone context
3. Agent provides summary of current work state:
   - What task you're on
   - Current milestone and progress
   - What you're implementing
4. Agent asks: **"What would you like to explore or discuss?"**
5. Engineer asks their question or describes the tangent
6. Agent provides thorough assistance:
   - Answers technical questions
   - Investigates code
   - Discusses trade-offs
   - Helps with debugging
   - Explains architecture
   - Researches topics
7. Discussion continues as long as needed (back-and-forth is fine)
8. When complete, agent reminds engineer to use `advance` to return to milestone work

**Outputs**:
- None - sidebar doesn't modify context files
- Just provides helpful assistance

**Returning to Work**: Use `#xoch-advance` to check milestone status and resume

**Example Scenarios**:
- "How does the notification service work?" → Read code, explain flow
- "Should I use approach A or B?" → Discuss trade-offs, recommend
- "Why is this test failing?" → Help debug, suggest fixes
- "Can you explain how this legacy feature works?" → Analyze old code

---

### Phase 5.5: Replan (Update Milestones for New Requirements) - OPTIONAL

**Trigger**: During implementation, new requirements emerge that require adjusting the milestone plan

**When to Use**:
- Discover additional work while implementing
- Requirements evolve based on learnings
- Review uncovers edge cases needing separate milestones
- Technical constraints require additional milestones
- Performance/security needs emerge during development

**Process** (Interactive):
1. Engineer invokes the `replan` prompt
2. Agent reads `.context/current.md` to identify task
3. Agent reads `milestones.md` to understand current progress:
   - Which milestones are complete
   - Current milestone position
   - Remaining milestones
4. Agent reads existing context (spec, plan, milestone snapshots)
5. Agent asks: **"What new requirements or changes have emerged?"**
6. Engineer explains what was discovered and why plan needs adjustment
7. Agent asks clarifying questions:
   - Does this affect completed work?
   - Addition to current milestone or new milestones?
   - Architecture changes needed?
   - Dependencies with other work?
   - Priority level?
8. Agent proposes updated milestone structure:
   - ✅ **Completed milestones preserved** (never modified)
   - 🔵 **Current milestone can be adjusted** if needed
   - ➕ **New milestones added** after current position
   - 🔄 **Remaining milestones renumbered** if structure changes
9. Agent explains rationale and impact assessment
10. Engineer reviews and either approves or requests modifications
11. Agent iterates until engineer approves
12. Agent updates `milestones.md` with new structure
13. Agent creates `.context/[task-id]/replan-[date].md` documenting:
    - Why replan occurred
    - What changed
    - Before/after milestone structures
    - Impact assessment

**Outputs**:
- Updated `.context/[task-id]/milestones.md` with new milestone structure
- `.context/[task-id]/replan-[date].md` documenting the changes
- Clear path forward with adjusted plan

**Post-Replan**: Continue using `advance` normally with the updated milestone structure. Can replan again if more requirements emerge.

**Example Scenario**:
- On milestone 4 of 4, discover users need visibility into whether fix worked
- Need to add response messaging and UI updates
- Replan adds 2-3 new milestones for this work
- Continue advancing through new milestones to completion

---

### Phase 6: Finalize (Update Documentation & Archive)

**Trigger**: All milestones complete and work is ready to merge

**Process** (Interactive):
1. Engineer invokes the `finalize` prompt
2. Agent reads all milestone snapshots and completed work
3. Agent updates **feature README.md** to reflect:
   - How the feature now works
   - Any new interactions or behaviors
   - Updated test scenarios
4. Agent reviews **project README.md** and determines if updates needed:
   - New patterns introduced?
   - New architectural considerations?
   - Changes to conventions?
5. Agent asks: "Review the proposed README updates. Approve or request changes?"
6. Engineer reviews and either approves or provides feedback
7. Agent revises if needed, then commits README updates to branch
8. **Archive context**: Agent asks: "Ready to archive this context? (You can delete it later if desired)"
9. If yes, agent moves `.context/[feature-name]/` to `.context/archive/[feature-name]-YYYY-MM-DD/`

**Outputs**:
- Updated feature README.md
- Updated project README.md (if necessary)
- `.context/archive/[task-id]-YYYY-MM-DD/` (archived for reference)
- `.context/current.md` cleared (task complete)
- Clean `.context/` directory ready for next task

**Timing**: README updates and context archiving happen AFTER all milestones complete, BEFORE merge to master.

**Archive Notes**:
- Archived contexts are preserved for historical reference
- Engineer can manually delete archives anytime
- Archive naming includes date to prevent conflicts with future features of same name

---

## Edge Cases & Special Scenarios

### Conflicting README Updates (Multiple Engineers)

**Trigger**: Two engineers updated the same README independently

**Process**:
1. Engineer invokes the `merge` prompt when conflict detected
2. Agent reads both versions of the README
3. Agent analyzes:
   - What each version describes
   - Conflicts vs. complementary changes
   - Technical accuracy of both
4. Agent proposes harmonized version that incorporates both changes
5. Engineer reviews and approves merged version

**Outputs**: Harmonized README.md that reflects both sets of changes

---

### Context Handoff Between Engineers

**Process**:
1. New engineer reads `.context/current.md` to identify the active task
2. New engineer reads feature README.md (current state)
3. New engineer reads `.context/[task-id]/milestones.md` (current progress)
4. New engineer reads latest completed milestone snapshot (e.g., `milestone-2.md`)
5. New engineer understands:
   - What the feature currently does
   - What's being changed (from spec + plan)
   - What's been completed (from milestone snapshots)
   - What remains to be done (from milestones.md)
5. New engineer invokes `#xoch-start` to continue from current milestone

---

### Abandoned Work / Reverted Changes

**Process**:
- If work is abandoned before merge: Delete `.context/[task-id]/` directory and clear `current.md`
- README never updated, so no cleanup needed
- If work is merged then reverted: Create new ticket to update feature to new state
- No special rollback mechanism - Git handles code, new work handles README updates

---

## Technical Implementation

### Configuration File (`.xoch`)

Optional configuration file to define project-specific conventions:

```json
{
  "projectReadme": "README.md",
  "featureReadmePattern": "**/README.md",
  "contextDirectory": ".context",
  "taskBaseUrl": "https://your-issue-tracker.com/tasks/",
  "prompts": {
    "validate": ".xoch/prompts/validate.md",
    "spec": ".xoch/prompts/spec.md",
    "plan": ".xoch/prompts/plan.md",
    "start": ".xoch/prompts/start.md",
    "advance": ".xoch/prompts/advance.md",
    "finalize": ".xoch/prompts/finalize.md",
    "finalize": ".xoch/prompts/finalize.md",
    "merge": ".xoch/prompts/merge.md"
  }
}
```

---

### Agent-Agnostic Implementation

To ensure this system works with any AI agent (GitHub Copilot, Cursor, Aider, etc.), prompts should:

1. **Be self-contained** - Each prompt explains its own context and purpose
2. **Use standard markdown** - No proprietary formats
3. **Reference file paths explicitly** - Don't rely on agent memory
4. **Provide clear instructions** - Step-by-step guidance
5. **Define expected outputs** - Agent knows what to produce

**Prompt Format**:
```markdown
# [Phase Name] Prompt

## Purpose
[What this phase accomplishes]

## Context Required
- Read: [list of files agent must read]
- Previous work: [reference to snapshots if applicable]

## Instructions
[Step-by-step process]

## Output Format
[Expected structure of output]

## Validation
[How to verify success]
```

---

### Git Integration

**`.gitignore` additions**:
```
.context/
.xoch-local
```

**Workflow**:
- `.context/` is never committed (working space only)
- README updates are committed to feature branch
- README updates merge with code changes
- Conflicts handled via standard git merge + `merge` prompt

---

## Context Window Management

### If READMEs Grow Too Large

**Strategies**:
1. **Enforce README discipline** - Keep them tight during finalize phase
2. **Split large features** - Break into sub-features with own READMEs
3. **Summarization prompt** - Agent summarizes large README into key points
4. **Link to external docs** - README references deeper docs for complex topics

**Monitor and adjust** - Start with discipline, add summarization if needed

---

## Summary of Workflow Phases

### Bootstrapping (One-Time)
0. **init-app** - Initialize/update application README by analyzing codebase
0. **init-feature** - Initialize/update feature README by analyzing feature code

### Main Workflow (Ongoing)
1. **validate** - Ensure README matches current codebase state
2. **spec** - Capture task and specification interactively
3. **plan** - Architect solution and break into milestones
4. **start** - Begin implementation (explains current milestone)
5. **advance** - Review milestone, complete it, move to next (repeat until done)
6. **sidebar** - (Anytime) Pause milestone work to explore related questions or tangents
7. **replan** - (Optional) Update milestones when new requirements emerge during development
7. **finalize** - Update READMEs and archive context after all milestones complete
10. **merge** - (Optional) Harmonize conflicting README updates

---

## Development Flow Summary

**Dev Phase** (Planning & Implementation):
1. validate → 2. spec → 3. plan → 4. start → 5. advance (loop)

**Completion Phase**:
6. finalize (update READMEs + archive) → Merge to master

**Production Phase** (Document & Deploy):
7. finalize (sync READMEs + archive context) → Merge to Master

**Edge Case**:
8. merge (resolve README conflicts if needed)

**Context Lifecycle**:
- `.context/current.md` - Identifies active task by Task ID
- `.context/[task-id]/` - Active work directory (named by Task ID)
- `.context/archive/[task-id]-YYYY-MM-DD/` - Historical reference after merge
- Archives can be manually deleted anytime by engineer

---

## Milestone-Based Development

**Key Advantages**:
- ✅ **Structured progress** - Clear milestones instead of ad-hoc snapshots
- ✅ **Flexible implementation** - AI-assisted, manual, or hybrid
- ✅ **Engineer control** - Agent reviews but doesn't block advancement
- ✅ **Git diff awareness** - Agent understands manual changes
- ✅ **Context preservation** - Each milestone snapshot enables handoffs
- ✅ **Progress visibility** - `milestones.md` shows status at a glance

**The advance loop**:
```
#xoch-start        → Read milestone 1, explain what to do
[implement code]
#xoch-advance      → Review work, complete milestone 1, explain milestone 2
[implement code]
#xoch-advance      → Review work, complete milestone 2, explain milestone 3
[implement code]
#xoch-advance      → Review work, complete milestone 3, detect all done
#xoch-finalize     → Update READMEs, archive context
```

---

## Next Steps

1. Create prompt templates for each phase (validate, spec, plan, start, advance, finalize, merge)
2. Define milestone document schemas and formats
3. Build example `.xoch` configuration
4. Test on a pilot feature
5. Iterate based on real-world usage

**Prompts to create**:

*Bootstrapping (one-time):*
- `init-app.md` - Initialize/update application README ✅
- `init-feature.md` - Initialize/update feature README ✅

*Main workflow (ongoing):*
- `validate.md` - Check README accuracy ✅
- `spec.md` - Capture task requirements (interactive) ✅
- `plan.md` - Architect + create milestones (interactive) ✅
- `start.md` - Begin work on current milestone ✅
- `advance.md` - Review, complete milestone, advance to next ✅
- `sidebar.md` - Explore related questions anytime ✅
- `replan.md` - Update milestones when requirements evolve ✅
- `finalize.md` - Update READMEs + archive context ✅
- `merge.md` - Resolve README conflicts ✅

*Maintenance:*
- `mod.md` - Modify Xoch itself (create/update prompts) ✅

---

## Benefits Over Traditional Approaches

✅ **No massive change logs** - Documentation stays current, not historical  
✅ **Self-documenting codebase** - READMEs explain both user and technical perspectives  
✅ **Context preservation** - Snapshots enable seamless handoffs  
✅ **Human-in-the-loop** - Engineers maintain control of architecture  
✅ **Agent-agnostic** - Works with any AI coding assistant  
✅ **Git-friendly** - Leverages existing version control workflows  
✅ **Scalable** - Doesn't grow unbounded over time  

