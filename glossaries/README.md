# Project Glossaries

This directory contains project-specific terminology and domain glossaries that ensure consistent understanding across your team and AI development workflows.

---

## Purpose

- **Terminology consistency** - All engineers and AI agents use the same terms
- **Domain clarity** - Document domain-specific concepts and data structures
- **Entity mappings** - Map identifiers and fields between systems
- **Onboarding** - New team members learn project terminology quickly
- **AI accuracy** - Agents understand project-specific concepts correctly

---

## Structure

### Core Glossary (Always Read)

**`quick-reference.md`** - Core terminology that applies across the entire project
- Business domain terms
- System architecture concepts
- Common abbreviations and acronyms
- Key entity types
- Identifier conventions (e.g., UUID vs integer IDs)

**When loaded:** Always read when glossaries are used

---

### Domain-Specific Glossaries (Conditional)

Create additional glossaries for specific areas of your project:

**`entities.md`** - Data model and entity mappings
- Entity schemas and relationships
- Field definitions and types
- Data quirks and edge cases
- Migration history for complex fields

**`integrations.md`** - Third-party integrations and external systems
- API endpoint documentation
- Authentication patterns
- Data mapping between systems
- Credential management

**`[domain].md`** - Feature-specific terminology
- Payment system terms
- User management concepts
- Analytics definitions
- Any domain-specific area

**When loaded:** Conditionally based on what features are being worked on

---

## When Glossaries Are Used

Xoch prompts automatically check for and load glossaries when appropriate:

| Phase | Load Glossaries? | Why |
|-------|------------------|-----|
| **init-app** | ✅ **Always** | Documenting with proper terminology |
| **init-feature** | ✅ **Always** | Documenting with proper terminology |
| **spec** | ✅ **Always** | Capturing requirements with correct terms |
| **finalize** | ✅ **Always** | Final README validation |
| **glossary** | ✅ **Always** | Managing glossary files themselves |
| **validate** | 🔀 **Conditional** | Only if validating glossary or terminology |
| **advance** | 🔀 **Conditional** | Only if updating README (not just code review) |
| **plan** | ❌ **Never** | Architecture planning doesn't need glossaries |
| **start** | ❌ **Never** | Implementation doesn't need glossaries |
| **investigate** | ❌ **Never** | Exploring code, not documenting |
| **replan** | ❌ **Never** | Updating milestones doesn't need glossaries |
| **pause** | ❌ **Never** | Context management, not documenting |
| **resume** | ❌ **Never** | Context management, not documenting |
| **merge** | ❌ **Never** | Comparing READMEs, not documenting |

---

## Creating Your First Glossaries

### Option 1: During init-app

When you run `#xoch-init-app`, the agent will offer to create glossaries for your project.

### Option 2: Using the glossary prompt

```
#xoch-glossary
```

This prompt helps you:
- Create new glossary files
- Add terms to existing glossaries
- Update definitions
- Organize terminology

### Option 3: Manual creation

1. Create `.xoch/glossaries/quick-reference.md` first (core terms)
2. Add domain-specific glossaries as needed
3. Update this README with your glossary index

---

## Example: quick-reference.md

```markdown
# Quick Reference Glossary

## Business Domain

- **User** - End-user account with authentication credentials
- **Tenant** - Organization account that contains multiple users
- **Workspace** - Tenant-specific environment for collaboration

## Identifiers

- **UUID** - Primary identifiers for all entities (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- **External ID** - Third-party system identifiers (varies by integration)
- **Slug** - URL-friendly identifier (lowercase, hyphenated)

## System Architecture

- **API Gateway** - Entry point for all client requests
- **Worker** - Background job processor
- **Cache** - Redis-based caching layer

## Acronyms

- **MFA** - Multi-Factor Authentication
- **RBAC** - Role-Based Access Control
- **SPA** - Single Page Application
```

---

## Example: entities.md

```markdown
# Entity Glossary

## User Entity

**Database Table:** `users`

**Key Fields:**
- `id` (UUID) - Primary identifier
- `email` (string) - Unique, lowercase
- `email_verified` (boolean) - Email verification status
- `tenant_id` (UUID) - Foreign key to tenants
- `role` (enum) - admin | member | guest

**Important Notes:**
- Emails are case-insensitive (stored lowercase)
- Users can belong to multiple tenants via `user_tenants` junction table
- Soft-deleted users remain in database with `deleted_at` timestamp

---

## Tenant Entity

**Database Table:** `tenants`

**Key Fields:**
- `id` (UUID) - Primary identifier
- `slug` (string) - Unique URL identifier
- `name` (string) - Display name
- `plan` (enum) - free | pro | enterprise

**Important Notes:**
- Slug cannot be changed after creation (affects URLs)
- Free plan limited to 5 users
```

---

## Tips for Good Glossaries

### Do:
- ✅ Keep entries concise (1-3 sentences per term)
- ✅ Include examples when helpful
- ✅ Document data quirks and edge cases
- ✅ Update glossaries when domain changes
- ✅ Use consistent formatting across files

### Don't:
- ❌ Include implementation code (that belongs in READMEs)
- ❌ Duplicate information across glossaries
- ❌ Let glossaries become outdated
- ❌ Make glossaries too long (split into domain files)

---

## Maintenance

**Review regularly:** Update glossaries when:
- New domain concepts are introduced
- Data models change
- Terminology evolves
- Edge cases are discovered
- Integration patterns change

**Commit to git:** Glossaries are team documentation, not personal notes. Commit them to version control so everyone benefits.

---

## Token Efficiency

By documenting terminology once in glossaries, you avoid repeatedly explaining concepts in every AI conversation. This saves tokens and ensures consistency.

**Typical token usage:**
- Quick reference: ~500-1,000 tokens
- Domain glossary: ~800-1,500 tokens
- Total glossary system: ~2,000-3,000 tokens per session

This investment pays off across all development phases.
