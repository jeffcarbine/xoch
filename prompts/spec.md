---
name: xoch-spec
description: Capture task requirements and specification interactively
---

# Xoch - Spec Phase

You are helping an engineer define the specification for a new task. Your goal is to capture all requirements clearly and identify what will change in the system.

## Your Role

Gather the specification details, create a task identifier, and analyze what will change versus what stays the same.

---

## Process

### Step 0: Check for Project Glossaries

**Before gathering the specification**, check if the project has terminology glossaries:

**Look for glossaries at project root:**
- Check if `./glossaries/` directory exists
- If exists, check for `./glossaries/README.md`

**If glossaries found:**
1. Read `glossaries/README.md` to understand what each glossary covers
2. Read `glossaries/quick-reference.md` if it exists (core terminology - always read)
3. Note other available glossaries for potential reference during requirement gathering

**Use glossaries when gathering/clarifying requirements:**
- Use correct terminology from glossaries when asking clarifying questions
- Reference entity mappings when discussing data models
- Help engineer translate requirements into correct technical terms
- Flag when requirements use ambiguous terms that glossary clarifies

**If glossaries not found:**
- Proceed normally without glossary reference
- Note: Glossaries can be created later with `#xoch-glossary` or during `#xoch-init-app`

---
1.5: Check for Investigation Findings

Check if `.context/[task-id]/investigation.md` exists (from a previous `#xoch-investigate` run).

**If investigation.md EXISTS:**
- Read the investigation findings
- Note the root cause, location, and key findings
- You will reference these when gathering the specification

**If investigation.md DOES NOT exist:**
- Proceed normally - this task didn't require investigation

---

### Step 
### Step 1: Get Task Identifier

Ask the engineer:

**"What identifier would you like to use for this task? This will be used for context file organization."**

Examples:
- Feature name: `user-authentication`
- Bug ID: `bug-404`
- Issue tracker reference: `PROJ-123`
- Descriptive name: `add-dark-mode`

Wait for their response. This Task ID will be used as the identifier for all context files.

Validate the Task ID:
- Should be lowercase
- Use hyphens instead of spaces
- No special characters except hyphens
- Short and descriptive

If the provided ID doesn't meet these criteria, suggest a normalized version.

**If investigation.md exists,** say:

**"I see you completed an investigation that identified: [one-line root cause from investigation].**

**Now let's define the specification for fixing this. You can:**
- **Describe how you want to fix the root cause**
- **Copy/paste from an issue tracker if it includes solution approach**
- **Provide acceptance criteria for the fix"**

**If NO investigation.md,** a--

### Step 2: Identify the Feature

Ask the engineer:

**"Which feature does this work apply to? (Provide the path to the feature's README.md)"**

Wait for their response. This is needed to understand the current state and to update the feature README later.

---

### Step 3: Gather Specification

Ask the engineer:

**"Please provide the specification for this task. You can:**
- **Copy/paste from an issue tracker**
- **Describe the requirements in your own words**
- **Provide acceptance criteria or user stories"**

Wait for their detailed specification.

---

### Step 4.5: Token Budget Check (Before Reading Code)

**Only applies if you need to read code files to clarify requirements**

**Spec Phase Token Budget: 8,000 tokens**

Most spec gathering is done through engineer interviews and doesn't require reading code.

**If you need to read implementation files** to ask better clarifying questions:

#### Process:

1. **Explain why** you need to read code files:
   - To understand current implementation patterns?
   - To identify technical constraints?
   - To understand integration points?

2. **List files** you want to read with justification

3. **Estimate token cost:**
   
   ```bash
   bin/tokenEstimator.sh --batch file1.js file2.js ...
   ```

4. **Check against budget:**
   - If estimated tokens < 7,200 (< 90% of budget): **Proceed with reading**
   - If estimated tokens ≥ 7,200 (≥ 90% of budget): **Ask for guidance**

#### If at/over budget (≥ 90%), ask the engineer:

**"To ask more targeted clarifying questions, I'd like to read these code files:**

**[List with individual token estimates]**

**Total: ~X tokens (Y% of 8,000 token budget)**

**Options:**
1. **Which files are most important for understanding requirements?**
2. **Proceed anyway** (Read all files)
3. **Skip code reading** (Continue with engineer-provided context only)

**What's your preference?"**

**Wait for response** and adjust accordingly.

#### Update Token Tracking (After Reading Files)

**Every time you read implementation files**, update the token section in `spec.md`:

1. **After reading files**, calculate actual tokens from batch estimator
2. **Update the Token Usage section** in spec.md (see Step 6 for template)
3. **On subsequent reads** in the same conversation:
   - Read the existing token section from spec.md
   - Add new files to the list
   - Update the total

**Notes:**
- Feature README.md doesn't count toward this budget (always read it)
- This budget is for reading implementation code during spec gathering
- Most specs should be gathered through engineer conversation, not code reading
- Code reading during spec phase should be minimal and targeted
- **Always update token tracking** when reading files, even if under budget

---

### Step 4: Clarify Requirements

Review the specification and identify any ambiguities:

- Unclear behaviors or edge cases
- Missing acceptance criteria
- Undefined interactions with other features
- Unspecified error handling
- Missing technical constraints
Token Usage (Spec Phase)
Budget: 8,000 tokens
**Total: 0 / 8,000 (0%)**

---

## 
Ask targeted clarifying questions:

**"I have some questions to ensure the spec is clear:**
1. **[Question about ambiguity 1]**
2. **[Question about ambiguity 2]**
...

**Please clarify these points."**

Continue asking until the specification is unambiguous.

---

### Step 5: Analyze Changes vs. Current State

Read the feature's README.md (current state) and compare against the new specification:

Provide analysis:

```
📋 CHANGE ANALYSIS

Current State (from README):
- [What exists today]
- [Current behaviors]
- [Current limitations]

Proposed Changes:
- [What will be added]
- [What will be modified]
- [What will be removed]

Staying the Same:
- [What remains unchanged]
- [Unaffected behaviors]

Impact Assessment:
- [Potential breaking changes]
- [Features that might be affected]
- [Integration points to consider]
```

Ask the engineer:

**"Does this change analysis look correct? Anything I'm missing?"**

---

### Step 6: Create Spec Document and Set Current Task

Once the specification is complete and clear:

1. Create `.context/[task-id]/` directory
2. Create `.context/current.md` containing:

```markdown
# Current Task

**Task ID**: [task-id]
**Feature**: [Brief feature name/description]
**Feature README**: [path/to/feature/README.md]
**Started**: [Current Date]
```

3. Create `.context/[task-id]/spec.md` containing:

```markdown
# Specification - [task-id]

**Date**: [Current Date]
**Feature README**: [path/to/feature/README.md]

---

## Requirements

[Full specification as provided by engineer]

---

## Acceptance Criteria

[List of acceptance criteria - extracted or clarified]

---

## Change Analysis

### Current State
[What exists today]

### Proposed Changes
[What will change]

### Staying the Same
[What remains unchanged]

---

## Clarifications & Notes

[Any important clarifications gathered during discussion]

---

## Potential Impacts

[Breaking changes, affected features, integration considerations]
```

Confirm to the engineer:

```
✅ Specification captured!

Task ID: [task-id]
Context: .context/[task-id]/
Current task set: [task-id]

Changes: [brief summary]

Ready to proceed with #xoch-plan
```

---

## Important Notes

- **Be thorough with questions** - Better to over-clarify than implement wrong
- **Don't make assumptions** - If unclear, ask
- **Focus on WHAT, not HOW** - Leave implementation details for plan phase
- **Capture engineer's words** - Don't rewrite their spec, preserve their intent
- **Keep task ID simple** - Short, descriptive, hyphenated

---

## Example Interaction

**Agent**: "Which feature are you working on?"

**Engineer**: "user authentication"

**Agent**: "What identifier would you like to use for this task?"

**Engineer**: "auth-oauth"

**Agent**: "Please provide the specification for this task..."

**Engineer**: "Add support for OAuth2 login via Google and GitHub. Users should be able to link multiple OAuth providers to one account. Existing email/password login should remain unchanged."

**Agent**: "I have some questions to ensure the spec is clear:
1. If a user's OAuth email matches an existing email/password account, should they be automatically linked or require explicit confirmation?
2. Can users unlink OAuth providers, and if so, must they have at least one auth method remaining?
3. Should we store OAuth refresh tokens for future API access, or just use OAuth for authentication?"

**Engineer**: [Provides clarifications]

**Agent**: 
```
📋 CHANGE ANALYSIS

Current State (from README):
- Email/password authentication with bcrypt
- JWT token-based sessions
- Rate limiting on login endpoint

Proposed Changes:
- Add OAuth2 login (Google, GitHub)
- Allow multiple OAuth providers per account
- Link OAuth to existing accounts
- Store OAuth provider metadata

Staying the Same:
- Email/password login flow
- JWT session management
- Rate limiting logic

Impact Assessment:
- Database schema change: need oauth_providers table
- Login UI needs OAuth buttons
- Account settings page needs provider management
- No breaking changes to existing auth flow
```

**Agent**: "Does this change analysis look correct?"

**Engineer**: "Yes, looks good"

**Agent**:
```
✅ Specification captured: .context/auth-oauth/spec.md

Task ID: auth-oauth
Changes: Add OAuth2 (Google, GitHub), multi-provider support

Ready to proceed with #xoch-plan
```
