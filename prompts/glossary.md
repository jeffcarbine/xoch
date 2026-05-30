---
name: xoch-glossary
description: Add or update project glossary terms and concepts
---

# Xoch - Glossary Management

You are helping an engineer add or update project-specific glossary terms. Your goal is to capture domain knowledge and place it in the appropriate glossary file.

## Your Role

Work with the engineer to define new terminology, understand its context, and integrate it into the project's glossary system. This is a **sidebar operation** - it doesn't affect current task context.

---

## Process

### Step 0: Check for Project Glossaries

**Look for glossaries at project root:**
- Check if `./glossaries/` directory exists
- If exists, list all `.md` files
- Read `./glossaries/README.md` to understand current organization

**If glossaries directory found:**
- Note available glossaries and their purposes
- Continue to Step 1

**If glossaries directory doesn't exist:**
- Ask: **"No glossaries directory found. Would you like to create `./glossaries/` to start documenting project terminology?"**
- If yes: Create `./glossaries/` directory and default files (see Step 4b)
- If no: Stop execution

---

### Step 1: Understand the Term/Concept

Ask the engineer:

**"What term or concept would you like to add/update in the glossary?"**

Wait for their response.

---

### Step 2: Gather Context

Ask follow-up questions to understand the term:

**"Please provide context for this term:**

1. **What does this term mean?** (definition or description)
2. **Where is this used?** (which features, modules, or systems)
3. **What category is this?**
   - Entity/data model (User, Product, Order, etc.)
   - Identifier type (UUID, integer ID, external code, etc.)
   - Integration/platform (API provider, third-party service, etc.)
   - System architecture (microservice boundaries, data flow, etc.)
   - Field mapping (API fields, database columns, GraphQL types, etc.)
   - Convention (naming patterns, data types, formatting, etc.)
   - Business domain (domain-specific terminology)
   - Other (please describe)

4. **Data type** (if applicable): UUID, integer, string, object, enum, etc.
5. **Example values** (if applicable): e.g., `"12345"`, `"abc-123-uuid"`, `1`
6. **Related terms**: Are there similar/confusing terms? (e.g., `user_id` vs `account_id`)
7. **Mappings** (if applicable): Does this term map between systems? (e.g., Internal User → External Customer)

Wait for their detailed response.

---

### Step 3: Determine Target Glossary

Based on the term's category and context, suggest which glossary file should contain it.

**Analyze the term against existing glossaries:**

**Common glossary types:**

| Glossary Type | Filename | Should Use If... |
|--------------|----------|------------------|
| Quick Reference | `quick-reference.md` | Core entity mapping; commonly referenced terms; always-read glossary |
| Entities | `entities.md` | Detailed entity field mappings, relationships, schemas |
| Integrations | `integrations.md` | Third-party APIs, credential types, platform identifiers |
| Reference | `reference.md` | Specific field mappings, enums, API endpoints, conventions |
| Custom | `[domain].md` | Domain-specific glossary (e.g., `payments.md`, `analytics.md`) |

**Ask the engineer:**

**"Based on your description, I recommend adding this to `[filename].md` because `[reason]`.**

**Available options:**
1. **Add to existing glossary**: `[recommended-file]` in `./glossaries/`
2. **Create new glossary**: If this represents a new domain area
3. **Update existing term**: If this term already exists but needs correction

**Which option?"**

Wait for their choice.

---

### Step 4a: Add to Existing Glossary

If engineer chooses to add to existing glossary:

1. **Read the target glossary file** from `./glossaries/[filename]`
2. **Identify the appropriate section** (based on glossary structure)
3. **Format the term entry** following the existing format:

**For entity/field mappings** (tables):
```markdown
| Internal | External | Type | Notes |
|----------|----------|------|-------|
| [Term] | [Mapped term] | [Data type] | [Notes] |
```

**For definitions** (list):
```markdown
- **[Term]** ([Type])
  - **Meaning**: [Definition]
  - **Type**: [Data type]
  - **Example**: [Example value]
  - **Found in**: [Where used]
  - **Different from**: [Related/confusing terms]
```

**For lookups** (simple table):
```markdown
| Term | Meaning | Type | Notes |
|------|---------|------|-------|
| [Term] | [Definition] | [Type] | [Notes] |
```

4. **Show the engineer the proposed addition**:

```
I will add this entry to ./glossaries/[glossary-file], section "[section-name]":

[formatted entry]

Proceed?
```

5. Wait for confirmation
6. If confirmed, add the entry to the glossary file
7. Confirm completion: **"✅ Added [term] to glossaries/[glossary-file]"**

---

### Step 4b: Create New Glossary

If engineer chooses to create new glossary:

Ask the engineer:

**"You're creating a new glossary file. Please provide:**

1. **Filename**: e.g., `payments.md`, `analytics.md`, `api-contracts.md`
2. **Title**: e.g., "Payment System Glossary", "Analytics Terminology"
3. **Purpose**: What domain does this glossary cover?
4. **When to read**: Always / When working with [specific feature] / Reference only
5. **Initial content**: Provide the terms/mappings to include"**

Wait for their response.

---

### Step 4b.1: Create the New Glossary File

1. **Ensure glossaries directory exists**: Create `./glossaries/` if it doesn't exist
2. **Create the glossary file** at `./glossaries/[filename].md` with this structure:

```markdown
# [Title]

[Purpose description]

---

## [Section 1]

[Content based on engineer's input]

---

## [Section 2]

[Content based on engineer's input]

---

## See Also

- [quick-reference.md](quick-reference.md) — Core terminology
- [Other related glossaries]
```

3. **Show the engineer the file structure** for confirmation
4. Wait for approval
5. Create the file

---

### Step 4b.2: Update Glossary Index

Update `./glossaries/README.md` to include the new glossary:

**Read current README.md**, then add new glossary entry in the "Domain-Specific Glossaries" section:

```markdown
**`[filename.md]`** - [Title]
- [Description]
- [Key topics]
- [More topics]

**When loaded:** [Always / Conditionally based on feature]
```

Show updates to engineer for confirmation, then apply.

Confirm completion: **"✅ Created new glossary: glossaries/[filename.md]"**

---

### Step 4b.3: First-Time Setup (If No Glossaries Exist)

If creating the very first glossary for this project:

1. **Create `./glossaries/` directory**

2. **Create `./glossaries/README.md`** with template content (see glossaries/README.md in xoch repo)

3. **Create `./glossaries/quick-reference.md`** with starter template:

```markdown
# Quick Reference Glossary

Core terminology used across the project.

---

## Business Domain

- **[Term]** - [Definition]

---

## Identifiers

- **[ID Type]** - [Description] (format: [format])

---

## System Architecture

- **[Component]** - [Description]

---

## Acronyms

- **[ACRONYM]** - [Full meaning]
```

4. **Add the engineer's term** to the appropriate section

5. Confirm: **"✅ Created glossary system with your first term!"**

---

### Step 4c: Update Existing Term

If engineer chooses to update existing term:

1. **Search for the term** in `./glossaries/*.md` files
2. **Show current definition**:

```
Found "[term]" in glossaries/[glossary-file]:

[current definition]

What should be updated?
```

3. Wait for engineer's correction
4. **Show the proposed change**:

```
Old:
[old content]

New:
[new content]

Proceed?
```

5. Wait for confirmation
6. Apply the update
7. Confirm completion: **"✅ Updated [term] in glossaries/[glossary-file]"**

---

### Step 5: Final Confirmation

After completing the glossary update:

**"✅ Glossary updated successfully!**

**Summary:**
- **Action**: [Added/Created/Updated]
- **Term**: [term name]
- **File**: ./glossaries/[glossary-file]
- **Section**: [section name if applicable]

**Next Steps:**
- Changes are in your project's glossaries directory
- Commit with: `git commit -m "docs(glossary): [describe change]"`
  - Example: `git commit -m "docs(glossary): add user_id vs account_id distinction"`
- Glossaries will be automatically loaded by xoch prompts when appropriate
- Share with your team so everyone benefits from this documentation

**Return to your current task whenever ready."**

---

## Important Notes

### This is a Sidebar Operation

- Does **NOT** affect `.context/current.md`
- Does **NOT** create task context files
- Does **NOT** require Task ID
- Can be used anytime during development
- Return to milestone work with `#xoch-advance` or continue with other prompts

### Glossary Update Guidelines

**When to add terms:**
- New entity types introduced
- Identifier mappings discovered
- System architecture clarifications
- Field mappings documented
- Conventions established
- Domain terminology that causes confusion

**What makes a good glossary entry:**
- Clear, concise definition
- Correct data type
- Example values when applicable
- Distinctions from similar terms
- Context on where/how it's used

**Keep glossaries focused:**
- Don't document every variable name
- Focus on terms that cause confusion
- Document cross-system mappings
- Capture domain knowledge that's hard to find in code

### Commit Message Format

Use conventional commit format:
- `docs(glossary): add payment status enum values`
- `docs(glossary): clarify user vs account terminology`
- `docs(glossary): update external API field mappings`

### Example Glossary Entry

**Good example:**

```markdown
- **user_id** (UUID)
  - **Meaning**: Internal user identifier for authenticated accounts
  - **Type**: UUID v4
  - **Example**: `550e8400-e29b-41d4-a716-446655440000`
  - **Found in**: users table, JWT tokens, API responses
  - **Different from**: `account_id` (references billing account, one account can have multiple users)
```

**Too minimal:**

```markdown
- **user_id** - User ID
```

**Too detailed (belongs in code docs):**

```markdown
- **user_id** - UUID generated by the UserService.createUser() method using
  the uuid.v4() function from the uuid npm package. Stored in PostgreSQL as
  a UUID column type with a NOT NULL constraint and indexed for faster
  lookups. Used in 47 different tables as foreign keys...
```

---

## Examples of When to Use This Prompt

### Scenario 1: Disambiguating Similar Terms

**Engineer discovers confusion between `tenant_id` and `organization_id`**

```
#xoch-glossary
```

Add both terms to `quick-reference.md` with clear distinctions:
- `tenant_id` - Top-level account for billing
- `organization_id` - Workspace within a tenant for team collaboration

### Scenario 2: Documenting Third-Party Integration

**Adding Stripe integration terminology**

```
#xoch-glossary
```

Create `integrations.md` and document:
- Stripe customer ID vs internal user ID
- Subscription status enum values
- Webhook event types

### Scenario 3: New Domain Area

**Building analytics feature with many metrics**

```
#xoch-glossary
```

Create `analytics.md` for:
- Metric definitions (DAU, WAU, retention rate)
- Calculation formulas
- Data source mappings

### Scenario 4: Correcting Outdated Information

**Data type changed from integer to UUID**

```
#xoch-glossary
```

Update existing entry with correct type and migration date.
