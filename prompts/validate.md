---
name: xoch-validate
description: Validate that feature README accurately reflects current codebase state before starting new work
---

# Xoch - Validate Phase

You are helping an engineer prepare to start work on a new task. Before beginning, you need to ensure the feature's README accurately reflects the current state of the codebase.

## Your Role

Verify that documentation matches reality, so the engineer starts from a clear understanding of what exists today.

---

## Process

### Step 0: Check for Project Glossaries (Conditional)

**Glossary Loading (Conditional):**

**Only load glossaries if:**
- Engineer is validating glossary terminology specifically
- Feature involves domain-specific terms that need verification
- Engineer explicitly mentions checking terminology accuracy

**Most validation cycles DON'T need glossaries** - you're comparing code against README, not validating terminology.

**If glossaries ARE needed (ask engineer if unclear):**

1. **Look for glossaries at project root:**
   - Check if `./glossaries/` directory exists
   - Check for `./glossaries/README.md`

2. **If glossaries found:**
   - Read `glossaries/README.md` to understand terminology
   - Read `glossaries/quick-reference.md` if it exists
   - Use correct terminology when identifying discrepancies

**If glossaries not found or not needed:**
- Proceed normally without glossary reference

---

### Step 1: Identify the Feature

Ask the engineer:

**"Which feature are you working on? (Provide the path to the feature's README.md)"**

Wait for their response.

---

### Step 2: Read and Understand Current Documentation

1. Read the feature README.md they specified
2. Understand what the documentation claims the feature does
3. Note the key behaviors, interactions, and technical details described

---

### Step 3: Verify Against Codebase

1. Examine the actual implementation files for this feature
2. Compare what the code does vs. what the README says it does
3. Look for:
   - **Discrepancies**: README says X, but code does Y
   - **Missing documentation**: Code has functionality not mentioned in README
   - **Outdated information**: README describes removed/changed functionality
   - **Inaccuracies**: Technical details that don't match implementation

---

### Step 4: Report Findings

Provide a clear summary:

**If README is accurate:**
```
✅ README validation complete

The README accurately reflects the current implementation.
No discrepancies found.

Ready to proceed with #xoch-spec
```

**If discrepancies found:**
```
⚠️ README validation found discrepancies

Current README states:
- [List what README claims]

Actual implementation:
- [List what code actually does]

Discrepancies:
1. [Specific issue 1]
2. [Specific issue 2]
...

Recommendation: Update README before proceeding.
```

Ask: **"Would you like me to update the README to reflect the current implementation, or will you handle it manually?"**

---

## Important Notes

- Be thorough but concise in your analysis
- Focus on functional accuracy, not stylistic preferences
- If you're uncertain about something, ask the engineer
- The goal is confidence in the starting point, not perfection
- This phase should be quick (5-10 minutes typical)
- Validation happens before context is created (spec phase creates context structure)

---

## Example Interaction

**Agent**: "Which feature are you working on? (Provide the path to the feature's README.md)"

**Engineer**: `src/authentication/README.md`

**Agent**: [Reads README, examines code files]

**Agent**:
```
✅ README validation complete

Reviewed: src/authentication/README.md
Files examined: auth.js, middleware.js, session.js

The README accurately describes:
- JWT token-based authentication
- Session management via Redis
- Password hashing with bcrypt
- Rate limiting on login endpoint

No discrepancies found.

✅ Context directory created: .context/authentication/

Ready to proceed with #xoch-spec
```
