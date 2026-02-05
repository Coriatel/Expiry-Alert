# Skill Template — Anti-Patterns

Common mistakes when creating skills and how to avoid them.

---

## Anti-Pattern 1: Asking Too Many Questions

### ❌ DON'T: Leave decisions to the user

```markdown
### 2. Create the configuration file

Where would you like to put the configuration file?
What naming convention should we use?
Should this be JSON or YAML?
```

### ✅ DO: Make sensible defaults and state them

```markdown
### 2. Create Configuration File

Create `config/app.config.js` (using JavaScript for comments and programmatic config):

```javascript
module.exports = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
};
```

**Note**: If you prefer JSON, create `config/app.config.json` instead. For YAML, see [details/examples.md#yaml-config](./details/examples.md#yaml-config).
```

**Why**: Skills should be autonomous. Users want to get things done, not make 20 micro-decisions. Pick the most common approach and state it clearly.

---

## Anti-Pattern 2: Incomplete Code Examples

### ❌ DON'T: Provide snippets or partial code

```markdown
### 3. Create the Express server

```javascript
const express = require('express');
const app = express();

// Add your routes here
// ...

app.listen(3000);
```
```

### ✅ DO: Provide complete, runnable code

```markdown
### 3. Create Express Server

Create `src/server.js`:

```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing
```
```

**Why**: Incomplete code forces users to guess or research. Complete examples can be copied and immediately work.

---

## Anti-Pattern 3: Vague or Generic Steps

### ❌ DON'T: Use vague instructions

```markdown
### 4. Set up the database

Configure your database connection properly.
Make sure to use environment variables for sensitive data.
```

### ✅ DO: Provide specific, actionable steps

```markdown
### 4. Configure Database Connection

Create `.env` in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/myapp_dev"
```

Create `src/config/database.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

module.exports = prisma;
```

**Security Note**: Never commit `.env` to version control. Ensure `.env` is in `.gitignore`.
```

**Why**: Specific instructions eliminate ambiguity and ensure consistent results.

---

## Anti-Pattern 4: Missing Error Handling

### ❌ DON'T: Show happy path only

```javascript
router.post('/users', async (req, res) => {
  const user = await prisma.user.create({
    data: req.body,
  });
  res.json(user);
});
```

### ✅ DO: Include comprehensive error handling

```javascript
router.post('/users', async (req, res) => {
  try {
    // Validate input
    if (!req.body.email || !req.body.name) {
      return res.status(400).json({
        error: 'Missing required fields: email and name',
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        name: req.body.name,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    // Handle unique constraint violation
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'User with this email already exists',
      });
    }

    // Log and return generic error
    console.error('Failed to create user:', err);
    res.status(500).json({
      error: 'Failed to create user',
    });
  }
});
```

**Why**: Production code needs error handling. Teaching error-free patterns creates bad habits.

---

## Anti-Pattern 5: No Validation Steps

### ❌ DON'T: Skip validation

```markdown
## Expected Outputs

- File: `src/server.js`
- File: `src/routes/users.js`

Now your API is ready to use!
```

### ✅ DO: Include verification steps

```markdown
## Validation

### 1. Start the server

```bash
npm run dev
```

Expected output:
```
Server running on port 3000
```

### 2. Test the endpoint

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

Expected response (status 201):
```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "createdAt": "2025-12-31T12:00:00.000Z"
}
```

### 3. Verify in database

```bash
npx prisma studio
```

Navigate to the `User` model and confirm the new user exists.
```

**Why**: Validation ensures the skill worked correctly. Without it, users might think they succeeded when they didn't.

---

## Anti-Pattern 6: Ignoring Edge Cases

### ❌ DON'T: Only handle happy path

```markdown
### 5. Fetch user by ID

```javascript
router.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(req.params.id) },
  });
  res.json(user);
});
```
```

### ✅ DO: Handle edge cases

```markdown
### 5. Fetch User by ID

```javascript
router.get('/users/:id', async (req, res) => {
  try {
    // Validate ID format
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id },
    });

    // Handle not found
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Failed to fetch user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```
```

**Why**: Real-world code must handle invalid input, missing data, and errors gracefully.

---

## Anti-Pattern 7: Hardcoded Values

### ❌ DON'T: Hardcode configuration

```javascript
const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
}));

app.listen(3000);
```

### ✅ DO: Use environment variables

```javascript
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Why**: Hardcoded values make code inflexible and difficult to deploy across environments.

---

## Anti-Pattern 8: Missing File Paths

### ❌ DON'T: Use vague locations

```markdown
### 3. Create the routes file

In your routes folder, add a new file for user routes...
```

### ✅ DO: Specify exact paths

```markdown
### 3. Create User Routes

Create `src/routes/users.js`:

```javascript
// ... code ...
```

This file should be placed in the `src/routes/` directory. If the directory doesn't exist, create it first:

```bash
mkdir -p src/routes
```
```

**Why**: Ambiguity leads to inconsistent project structures and confusion.

---

## Anti-Pattern 9: Overloading One Skill

### ❌ DON'T: Cram multiple tasks into one skill

```markdown
# Complete Application Setup

This skill covers:
1. Database setup (Prisma)
2. API creation (Express)
3. Authentication (JWT)
4. Frontend (React)
5. Deployment (Docker + VPS)
6. CI/CD (GitHub Actions)

[... 500 lines of steps ...]
```

### ✅ DO: Create focused, modular skills

```markdown
# Set Up Express API with Prisma

This skill covers creating a basic Express API with Prisma ORM for database access.

**Prerequisites**:
- Node.js 18+ installed
- PostgreSQL running (see `/skills/database-setup/`)

**Next Steps After This Skill**:
- Add authentication: `/skills/auth-rbac/`
- Deploy to production: `/skills/deployment/`

[... 150 lines of focused steps ...]
```

**Why**: Focused skills are easier to maintain, reuse, and understand. Monolithic skills become outdated and overwhelming.

---

## Anti-Pattern 10: No Links to Related Content

### ❌ DON'T: Create isolated skills

```markdown
# Add API Endpoint

[... skill content ...]

(No references to other skills, rules, or documentation)
```

### ✅ DO: Link to related resources

```markdown
# Add API Endpoint

## Related Skills

- `/skills/prisma-postgres/` — Database modeling and queries
- `/skills/auth-rbac/` — Add authentication to endpoints
- `/skills/testing-e2e/` — Write tests for your API

## See Also

- [Cursor Rule: API Patterns](../../.cursor/rules/050-api-express.md)
- [Cursor Rule: Security](../../.cursor/rules/100-security-secrets.md)
- [Express Documentation](https://expressjs.com/en/guide/routing.html)
- [Prisma Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/crud)
- [Details: API Best Practices](./details/README.md)
- [Details: Code Examples](./details/examples.md)
```

**Why**: Skills are part of an ecosystem. Linking helps users discover related tools and deepen their understanding.

---

## Anti-Pattern 11: Generic or Boilerplate Language

### ❌ DON'T: Use filler text

```markdown
### 2. Configure the system

Configure the various components of the system according to best practices and your specific requirements.
```

### ✅ DO: Be specific and concrete

```markdown
### 2. Configure CORS and Body Parsing

Add middleware to `src/server.js` after the Express initialization:

```javascript
const cors = require('cors');

// Enable CORS for frontend (adjust origin in production)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```
```

**Why**: Generic language adds no value. Specific instructions teach and enable action.

---

## Anti-Pattern 12: Inconsistent Formatting

### ❌ DON'T: Mix formats and conventions

```markdown
### 2. Install dependencies
npm install express

### 3. create prisma schema
Add this to schema.prisma:
model User {
  id Int @id
}

## 4. Run Migration
`npx prisma migrate dev`

5: Start server
Start the application with: npm run dev
```

### ✅ DO: Use consistent formatting

```markdown
### 2. Install Dependencies

```bash
npm install express prisma @prisma/client
```

### 3. Create Prisma Schema

Add to `prisma/schema.prisma`:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
}
```

### 4. Run Migration

```bash
npx prisma migrate dev --name add_user_model
```

### 5. Start Development Server

```bash
npm run dev
```
```

**Why**: Consistency improves readability and professionalism.

---

## Anti-Pattern 13: Explaining Instead of Executing

### ❌ DON'T: Teach concepts at length in main skill

```markdown
### 3. Understanding Express Middleware

Express middleware is a function that has access to the request object (req),
the response object (res), and the next middleware function. Middleware can
execute code, modify the request/response, end the request-response cycle, or
call the next middleware. There are several types of middleware including
application-level, router-level, error-handling, built-in, and third-party...

[... 3 more paragraphs ...]

Now that you understand middleware, you can add some to your application.
```

### ✅ DO: Link to theory, focus on execution

```markdown
### 3. Add Middleware

Add logging and error handling middleware to `src/server.js`:

```javascript
// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Your routes here
app.use('/api/users', userRoutes);

// Error handling (must be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

For a deep dive on middleware patterns, see [details/README.md#middleware](./details/README.md#middleware).
```

**Why**: Skills are for doing. Theory goes in `details/README.md`.

---

## Anti-Pattern 14: Missing Prerequisites

### ❌ DON'T: Assume everything is set up

```markdown
# Deploy to Production

### 1. Push to GitHub
```bash
git push origin main
```

### 2. SSH to server
[... deployment steps ...]
```

### ✅ DO: State prerequisites clearly

```markdown
# Deploy to Production

## Prerequisites

Before starting this skill, ensure you have:

1. **Git repository**: Code committed and pushed to GitHub/GitLab
2. **Production server**: VPS with SSH access (see `/skills/vps-setup/`)
3. **Domain name**: DNS configured to point to server IP
4. **Environment variables**: Production `.env` file prepared
5. **Database**: PostgreSQL running on production server

If any prerequisites are missing, complete them before proceeding.

## Steps

### 1. Verify Local Build

Ensure the application builds successfully:

```bash
npm run build
npm test
```

All tests should pass before deploying.

### 2. Connect to Production Server

```bash
ssh user@your-server-ip
```

[... continue with deployment ...]
```

**Why**: Unmet prerequisites cause confusion and failure. Stating them upfront saves time.

---

## Anti-Pattern 15: No Troubleshooting Guidance

### ❌ DON'T: Leave users stranded when errors occur

```markdown
### 5. Run the migration

```bash
npx prisma migrate deploy
```

If you encounter errors, check your configuration.
```

### ✅ DO: Anticipate common errors and provide fixes

```markdown
### 5. Run Database Migration

```bash
npx prisma migrate deploy
```

**Common Errors:**

**Error**: `Error: P1001: Can't reach database server`

**Cause**: Database not running or incorrect DATABASE_URL

**Fix**:
1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check DATABASE_URL in `.env` matches your database credentials
3. Test connection: `psql $DATABASE_URL`

---

**Error**: `Error: P3009: migrate found failed migrations`

**Cause**: Previous migration failed partway through

**Fix**:
```bash
npx prisma migrate resolve --applied {migration_name}
# Then retry:
npx prisma migrate deploy
```

---

If migrations succeed, you'll see:
```
✓ All migrations have been applied.
```
```

**Why**: Errors are inevitable. Helping users resolve them quickly improves the experience.

---

## Conclusion

Avoid these anti-patterns by:

1. ✅ **Make decisions** (don't ask 20 questions)
2. ✅ **Show complete code** (not snippets)
3. ✅ **Be specific** (exact paths, exact commands)
4. ✅ **Handle errors** (don't show only happy path)
5. ✅ **Validate results** (include verification steps)
6. ✅ **Consider edge cases** (invalid input, missing data)
7. ✅ **Use environment variables** (not hardcoded values)
8. ✅ **Specify file paths** (no vague locations)
9. ✅ **Keep skills focused** (modular, not monolithic)
10. ✅ **Link to resources** (skills, rules, docs)
11. ✅ **Be concrete** (not generic)
12. ✅ **Format consistently** (headings, code blocks)
13. ✅ **Execute, don't explain** (theory in details/)
14. ✅ **State prerequisites** (don't assume setup)
15. ✅ **Provide troubleshooting** (anticipate errors)

A great skill is autonomous, actionable, complete, and helpful.

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintained by**: Development Policy Library Project
