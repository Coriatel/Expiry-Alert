# Creating Great Skills — Theory and Best Practices

## Table of Contents

1. [Overview](#overview)
2. [Philosophy of Skills](#philosophy-of-skills)
3. [Skill vs Policy vs Documentation](#skill-vs-policy-vs-documentation)
4. [Anatomy of a Skill](#anatomy-of-a-skill)
5. [Writing Principles](#writing-principles)
6. [Structuring Steps](#structuring-steps)
7. [Code Examples Best Practices](#code-examples-best-practices)
8. [Autonomy and Decision-Making](#autonomy-and-decision-making)
9. [Linking and Cross-Referencing](#linking-and-cross-referencing)
10. [Maintenance and Evolution](#maintenance-and-evolution)
11. [Common Patterns](#common-patterns)
12. [Advanced Techniques](#advanced-techniques)

---

## Overview

Skills are **execution-focused guides** that enable autonomous task completion. Unlike documentation that explains concepts or policies that define constraints, skills provide **step-by-step instructions** for completing specific technical tasks.

**Key Characteristics:**
- **Procedural**: Numbered steps, not prose
- **Actionable**: Commands you can copy/paste
- **Autonomous**: Make sensible assumptions; don't ask 20 questions
- **Scoped**: One skill = one task
- **Validated**: Include checks and expected outputs

Think of skills as **recipes for code**, not textbooks about cooking.

---

## Philosophy of Skills

### 1. Autonomous Execution

The primary goal is to enable AI assistants and developers to complete tasks **without human intervention** for routine decisions.

**Autonomous means:**
- ✅ Use sensible defaults (e.g., "Create in `src/components/` unless specified")
- ✅ Make explicit assumptions (e.g., "Assumes Node.js 18+")
- ✅ Provide fallback logic (e.g., "If file exists, append; otherwise create")
- ❌ Don't ask: "Where should I put this file?"
- ❌ Don't ask: "What should I name this variable?"
- ❌ Don't ask: "Should I use TypeScript or JavaScript?"

**Ask ONLY when:**
- Action is destructive (deleting prod data, force-pushing)
- Requires credentials or secrets
- Genuinely no sensible default (rare)

### 2. Execution-Focused

Skills are **not** for learning or exploration. They are for **doing**.

**Execution-focused means:**
- ✅ Start with action verbs: "Create", "Configure", "Deploy", "Test"
- ✅ Include full code blocks, not snippets
- ✅ Specify exact file paths and commands
- ❌ Don't theorize about alternatives
- ❌ Don't explain every concept (link to details/)
- ❌ Don't provide 5 options; pick the best one

### 3. Completeness

Every skill should take you from **empty state to validated working state**.

**Complete means:**
- ✅ Pre-flight checks (dependencies, environment)
- ✅ Main execution steps (the actual work)
- ✅ Post-flight validation (tests, manual checks)
- ✅ Troubleshooting common errors
- ❌ Don't leave gaps: "Now configure the rest yourself"
- ❌ Don't skip validation: "It should work now"

### 4. Maintainability

Skills should be easy to update as tools and practices evolve.

**Maintainable means:**
- ✅ Version numbers for tools (Node 18+, Prisma 5.x)
- ✅ Link to official docs for deep dives
- ✅ Date stamps for time-sensitive content
- ❌ Don't hardcode values that change (API URLs, versions)
- ❌ Don't duplicate information across files

---

## Skill vs Policy vs Documentation

### Skills (execution guides)

**Purpose**: Enable completion of a specific task
**Format**: Numbered steps, code blocks, validation
**Example**: "Deploy Application to Production"
**Location**: `/skills/{name}/skill.md`
**Length**: 120-250 lines

### Policies (constraints and conventions)

**Purpose**: Define rules and standards
**Format**: Do's/don'ts, patterns, conventions
**Example**: "React Component Naming Conventions"
**Location**: `.cursor/rules/{number}-{name}.md`
**Length**: 200-600 lines

### Documentation (conceptual learning)

**Purpose**: Explain concepts and architecture
**Format**: Prose, diagrams, tutorials
**Example**: "Understanding RBAC Architecture"
**Location**: `/docs/` or `/skills/{name}/details/README.md`
**Length**: 500-2000+ lines

### When to Use Each

| Scenario | Use |
|----------|-----|
| "How do I add a new API endpoint?" | **Skill**: `/skills/api-express/skill.md` |
| "What are our API naming conventions?" | **Policy**: `.cursor/rules/050-api-express.md` |
| "What is REST and why do we use it?" | **Documentation**: `/skills/api-express/details/README.md` |

---

## Anatomy of a Skill

### Required Sections

#### 1. Purpose (1-3 sentences)

Clear, concise statement of what the skill accomplishes.

**Template:**
```markdown
## Purpose

This skill guides you through [ACTION] to [OUTCOME]. It covers [SCOPE] including [KEY ASPECTS].
```

**Example:**
```markdown
## Purpose

This skill guides you through creating a sortable, filterable, paginated data table component. It covers React implementation, SCSS styling, accessibility, and integration with backend APIs.
```

#### 2. When to Use This Skill

Clarify appropriate and inappropriate use cases.

**Template:**
```markdown
## When to Use This Skill

Use when:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

Do NOT use when:
- [Anti-scenario 1]
- [Anti-scenario 2]
```

**Example:**
```markdown
## When to Use This Skill

Use when:
- Adding a new API endpoint to an Express application
- Implementing RESTful CRUD operations
- Integrating with Prisma ORM

Do NOT use when:
- Building GraphQL APIs (use `/skills/graphql-api/` instead)
- Creating WebSocket endpoints (use `/skills/websocket/` instead)
- Working with serverless functions (different patterns apply)
```

#### 3. Required Inputs

List what the user must provide or what the skill assumes.

**Template:**
```markdown
## Required Inputs

1. **Input Name**: Description (type, format, example)
2. **Input Name**: Description (type, format, example)
```

**Example:**
```markdown
## Required Inputs

1. **Resource Name**: Singular noun for the API resource (e.g., "User", "Product")
2. **Fields**: Array of field definitions with name, type, and validation rules
3. **Authentication**: Whether endpoint requires authentication (default: true)
```

#### 4. Steps (Numbered, 8-15 steps typical)

The core execution guide. Each step should be:
- **Atomic**: One clear action
- **Ordered**: Dependencies flow naturally
- **Complete**: Include full code, not snippets

**Template:**
```markdown
## Steps

### 1. Step Title

Brief intro or context (1-2 sentences).

```language
# Full code block
```

Explanation of what this does (2-3 sentences).

### 2. Next Step Title
[...]
```

#### 5. Expected Outputs

What artifacts are created or modified?

**Template:**
```markdown
## Expected Outputs

After completing these steps, you will have:

1. **Files Created**:
   - `path/to/file1.ext` — Description
   - `path/to/file2.ext` — Description

2. **Files Modified**:
   - `path/to/existing.ext` — What changed

3. **Services/State**:
   - Database table created: `table_name`
   - Environment variable set: `VAR_NAME`
```

#### 6. Validation

How to verify success?

**Template:**
```markdown
## Validation

1. **Run tests**: `npm test`
   - Expected: All tests pass
2. **Manual check**: Visit `http://localhost:3000/endpoint`
   - Expected: Returns JSON with status 200
3. **Verify file**: Check `path/to/file`
   - Expected: Contains expected configuration
```

#### 7. Related Skills

Cross-reference complementary skills.

**Template:**
```markdown
## Related Skills

- `/skills/related-skill/` — When to use this instead or in addition
- `/skills/another-skill/` — Follow-up task after this skill
```

#### 8. See Also

Link to policies, details, and external docs.

**Template:**
```markdown
## See Also

- [Cursor Rule: Name](../../.cursor/rules/{number}-{name}.md)
- [Details: Theory](./details/README.md)
- [Details: Examples](./details/examples.md)
- [Details: Checklist](./details/checklist.md)
- [Details: Anti-Patterns](./details/anti-patterns.md)
- [Official Docs](https://example.com)
```

---

## Writing Principles

### 1. Clarity Over Cleverness

**DO:**
```markdown
### 2. Create User Model File

Create `src/models/User.js` with the following content:

```javascript
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

module.exports = User;
```

This defines a simple User class with name and email properties.
```

**DON'T:**
```markdown
### 2. Set Up Model Layer

Implement your data access patterns using appropriate OOP principles.
```

### 2. Specificity Over Generality

**DO:**
```markdown
Install Prisma CLI version 5.8.0 or higher:

```bash
npm install -D prisma@^5.8.0
```
```

**DON'T:**
```markdown
Install the necessary dependencies.
```

### 3. Prescriptive Over Descriptive

**DO:**
```markdown
### 3. Configure CORS

Add CORS middleware to `src/server.js` at line 12 (after Express initialization):

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```
```

**DON'T:**
```markdown
You should configure CORS to allow cross-origin requests from your frontend.
```

### 4. Examples Over Explanations

When in doubt, show don't tell:

**DO:**
```markdown
### 5. Add Validation Middleware

```javascript
// src/middleware/validateUser.js
function validateUser(req, res, next) {
  const { name, email } = req.body;

  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters' });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  next();
}

module.exports = validateUser;
```

This middleware validates user input before processing the request.
```

**DON'T:**
```markdown
### 5. Add Validation

Make sure to validate user input according to business rules.
```

---

## Structuring Steps

### Step Granularity

**Too granular** (frustrating):
```markdown
### 1. Open your code editor
### 2. Navigate to the src folder
### 3. Right-click and select "New File"
### 4. Type "server.js"
### 5. Press Enter
```

**Too coarse** (unclear):
```markdown
### 1. Set up the server with all necessary middleware and routes
```

**Just right** (atomic but meaningful):
```markdown
### 1. Create Express Server

Create `src/server.js` with basic Express configuration:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

This initializes Express and starts the server on the specified port.
```

### Step Dependencies

Order steps so each builds on the previous:

**Good flow:**
1. Install dependencies
2. Create configuration file
3. Initialize database connection
4. Create database schema
5. Implement API routes
6. Add validation middleware
7. Write tests
8. Run tests

**Bad flow** (jumps around):
1. Create API routes
2. Install dependencies
3. Write tests
4. Create configuration
5. Create schema

### Conditional Steps

Handle variations within steps, not as separate branches:

**DO:**
```markdown
### 4. Configure Authentication

Add JWT middleware to `src/middleware/auth.js`:

```javascript
// If using JWT (recommended for REST APIs)
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// If using session-based auth, use this instead:
// (See details/examples.md for session-based example)
```

For most REST APIs, use JWT as shown above.
```

**DON'T:**
```markdown
### 4a. If using JWT...
### 4b. If using sessions...
### 4c. If using OAuth...
```

---

## Code Examples Best Practices

### Full Files, Not Snippets

**DO** (complete, runnable):
```javascript
// src/routes/users.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await prisma.user.create({
      data: req.body,
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

module.exports = router;
```

**DON'T** (incomplete, confusing):
```javascript
// Somewhere in your routes...
router.get('/', async (req, res) => {
  // Fetch users from database
  res.json(users);
});

// Add other routes here...
```

### Inline Comments for Clarity

Use comments to:
- Explain **why**, not **what** (code shows what)
- Highlight important decisions
- Point out optional variations

**DO:**
```javascript
// Using bcrypt with 12 rounds balances security and performance
// Increase to 14 for high-security applications
const hashedPassword = await bcrypt.hash(password, 12);

// Soft delete instead of hard delete to maintain audit trail
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

**DON'T:**
```javascript
// Hash the password
const hashedPassword = await bcrypt.hash(password, 12);

// Update user
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

### Error Handling

Always include error handling:

```javascript
// ✅ Good: Proper error handling
try {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
} catch (err) {
  console.error('Database error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

// ❌ Bad: No error handling
const user = await prisma.user.findUnique({ where: { id } });
res.json(user);
```

---

## Autonomy and Decision-Making

### Making Assumptions

State assumptions explicitly:

```markdown
### 2. Create Database Schema

**Assumptions:**
- Using PostgreSQL 14+ (adjust for other databases)
- Prisma ORM is already initialized
- Database connection string is in `.env`

Create `prisma/schema.prisma`:

[...]
```

### Choosing Defaults

Pick the most common, safest option:

```markdown
### 5. Configure CORS

Add CORS middleware (allowing all origins in development; restrict in production):

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : '*',
  credentials: true,
}));
```

For production, set `FRONTEND_URL` in your `.env` file.
```

### Handling Variations

Primary path in main steps; variations in notes or links:

```markdown
### 3. Install Dependencies

```bash
npm install express prisma @prisma/client
```

**Note**: If using Yarn, run `yarn add express prisma @prisma/client` instead.
**Note**: For TypeScript, also install `@types/express` and `ts-node`.

See [details/examples.md](./details/examples.md#typescript-setup) for full TypeScript setup.
```

---

## Linking and Cross-Referencing

### Internal Links (Within Repository)

```markdown
## See Also

- [Cursor Rule: API Patterns](../../.cursor/rules/050-api-express.md)
- [Details: REST Best Practices](./details/README.md#rest-best-practices)
- [Related Skill: Database Migrations](/skills/prisma-postgres/skill.md)
```

### External Links (Official Docs)

```markdown
## See Also

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
```

### Linking Strategy

1. **Main skill.md**: Links to details/ and related skills
2. **details/README.md**: Deep dives with external references
3. **details/examples.md**: Code-heavy, minimal external links
4. **details/checklist.md**: Links to testing/validation tools
5. **details/anti-patterns.md**: Links to style guides and linters

---

## Maintenance and Evolution

### Versioning

Include version info for time-sensitive content:

```markdown
**Last Updated**: 2025-12-31
**Node.js Version**: 18+ (LTS)
**Prisma Version**: 5.8+
**React Version**: 18.2+
```

### Deprecation Warnings

```markdown
## ⚠️ Deprecated Approach

This skill previously recommended using `body-parser` middleware. As of Express 4.16+, use built-in `express.json()` instead.

See [Migration Guide](./details/migration-express-5.md) for details.
```

### Changelog (Optional)

For complex skills, maintain a changelog in details/:

```markdown
## Changelog

### 2025-12-31 - v2.0
- Updated to Prisma 5.x (breaking changes)
- Added TypeScript examples
- Removed deprecated `findOne` method

### 2024-06-15 - v1.5
- Added validation examples
- Improved error handling patterns
```

---

## Common Patterns

### Pattern: Multi-Step File Creation

```markdown
### 2. Create Project Structure

Create the following files:

1. **Configuration**: `config/database.js`
```javascript
[... full file ...]
```

2. **Model**: `models/User.js`
```javascript
[... full file ...]
```

3. **Routes**: `routes/users.js`
```javascript
[... full file ...]
```
```

### Pattern: Environment Configuration

```markdown
### 1. Set Up Environment Variables

Create `.env` in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
JWT_SECRET="your-secret-key-change-in-production"
NODE_ENV="development"
PORT=3000
```

**Security Note**: Never commit `.env` to version control. Ensure `.env` is in `.gitignore`.
```

### Pattern: Installation & Initialization

```markdown
### 1. Install Dependencies

```bash
npm install package1 package2 package3
npm install -D dev-package1 dev-package2
```

### 2. Initialize Tool

```bash
npx tool-cli init
```

This creates configuration files: `tool.config.js` and `tool.schema.json`.
```

### Pattern: Testing & Validation

```markdown
## Validation

### 1. Run Unit Tests

```bash
npm test -- --coverage
```

Expected output:
```
PASS  src/routes/users.test.js
  ✓ GET /users returns all users (45ms)
  ✓ POST /users creates new user (32ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Coverage:    95%
```

### 2. Manual API Test

```bash
curl http://localhost:3000/api/users
```

Expected response:
```json
[
  { "id": 1, "name": "Alice", "email": "alice@example.com" },
  { "id": 2, "name": "Bob", "email": "bob@example.com" }
]
```
```

---

## Advanced Techniques

### Conditional Logic in Steps

Use inline conditionals for minor variations:

```markdown
### 4. Configure Authentication

```javascript
// For stateless APIs (recommended for REST):
const jwt = require('jsonwebtoken');

// For stateful apps, use sessions instead:
// const session = require('express-session');
// app.use(session({ secret: process.env.SESSION_SECRET }));
```

For most REST APIs, use JWT as shown above. For server-rendered apps with session state, see [details/examples.md#session-auth](./details/examples.md#session-auth).
```

### Troubleshooting Sections

Include common errors and fixes:

```markdown
## Troubleshooting

### Error: "Cannot find module '@prisma/client'"

**Cause**: Prisma Client not generated.

**Fix**:
```bash
npx prisma generate
```

### Error: "connect ECONNREFUSED 127.0.0.1:5432"

**Cause**: PostgreSQL not running.

**Fix**:
```bash
# macOS with Homebrew
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Docker
docker-compose up -d postgres
```
```

### Progressive Enhancement

Start with MVP, then add enhancements:

```markdown
### 6. Add Pagination (Optional but Recommended)

For large datasets, add pagination:

```javascript
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({ skip, take: limit }),
    prisma.user.count(),
  ]);

  res.json({
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
```

This is optional for small datasets but essential for production use with 1000+ records.
```

---

## Conclusion

Great skills are:
1. **Autonomous**: Make decisions; don't ask 20 questions
2. **Actionable**: Provide full code, exact commands
3. **Complete**: Cover setup, execution, and validation
4. **Concise**: 120-250 lines in main skill.md
5. **Maintainable**: Versioned, linked, updatable

Use this guide as a reference when creating or reviewing skills. Aim for skills that a developer (or AI) can follow from start to finish without external input.

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintained by**: Development Policy Library Project
