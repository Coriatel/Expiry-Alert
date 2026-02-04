# Database — Prisma ORM with PostgreSQL

## Prisma Setup

### Schema File Structure
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Models
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(MALE)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Post {
  id         String     @id @default(cuid())
  title      String
  content    String
  visibility Visibility @default(PUBLIC)
  published  Boolean    @default(false)
  authorId   String
  author     User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  @@index([authorId])
  @@index([visibility])
}

enum Role {
  ADMIN
  MALE
  FEMALE
}

enum Visibility {
  PUBLIC
  MALE_ONLY
  FEMALE_ONLY
  ADMIN_ONLY
}
```

### Environment Configuration
```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# For production, use connection pooling
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public&connection_limit=5&pool_timeout=10"
```

### Prisma Client Singleton
```javascript
// lib/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

## Migrations

### Creating Migrations
```bash
# Create a new migration
npx prisma migrate dev --name add_user_role

# Reset database (⚠️ destructive - deletes all data)
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy

# Generate Prisma Client after schema changes
npx prisma generate
```

### Migration Best Practices
```javascript
// ✅ DO: Name migrations descriptively
npx prisma migrate dev --name add_user_email_index
npx prisma migrate dev --name add_post_visibility_enum
npx prisma migrate dev --name create_refresh_tokens_table

// ✅ DO: Review generated SQL before applying
// Check: prisma/migrations/{timestamp}_{name}/migration.sql

// ❌ DON'T: Edit migrations after they're applied
// ❌ DON'T: Skip migrations in production
```

## CRUD Operations

### Create
```javascript
// Create single record
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    password: hashedPassword,
    role: 'MALE',
  },
});

// Create with relation
const post = await prisma.post.create({
  data: {
    title: 'My First Post',
    content: 'Hello, world!',
    author: {
      connect: { id: userId }, // Connect to existing user
    },
  },
});

// Create with nested creation
const userWithPosts = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    password: hashedPassword,
    posts: {
      create: [
        { title: 'Post 1', content: 'Content 1' },
        { title: 'Post 2', content: 'Content 2' },
      ],
    },
  },
  include: {
    posts: true, // Include related posts in response
  },
});

// Bulk create
const users = await prisma.user.createMany({
  data: [
    { email: 'user1@example.com', name: 'User 1', password: 'hash1' },
    { email: 'user2@example.com', name: 'User 2', password: 'hash2' },
  ],
  skipDuplicates: true, // Skip if email already exists
});
```

### Read
```javascript
// Find unique (by unique field)
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
});

// Find unique or throw error
const user = await prisma.user.findUniqueOrThrow({
  where: { id: userId },
});

// Find first matching record
const post = await prisma.post.findFirst({
  where: { published: true },
  orderBy: { createdAt: 'desc' },
});

// Find many with filters
const users = await prisma.user.findMany({
  where: {
    role: 'ADMIN',
    createdAt: {
      gte: new Date('2024-01-01'),
    },
  },
  orderBy: { createdAt: 'desc' },
  skip: 10,
  take: 10,
});

// Find with relations
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    },
  },
});

// Select specific fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // Don't select password!
  },
});
```

### Update
```javascript
// Update single record
const user = await prisma.user.update({
  where: { id: userId },
  data: { name: 'New Name' },
});

// Update or create (upsert)
const user = await prisma.user.upsert({
  where: { email: 'user@example.com' },
  update: { name: 'Updated Name' },
  create: {
    email: 'user@example.com',
    name: 'New User',
    password: hashedPassword,
  },
});

// Update many
const result = await prisma.post.updateMany({
  where: { authorId: userId },
  data: { published: true },
});

// Increment/decrement numbers
const post = await prisma.post.update({
  where: { id: postId },
  data: {
    views: { increment: 1 },
  },
});
```

### Delete
```javascript
// Delete single record
const user = await prisma.user.delete({
  where: { id: userId },
});

// Delete many
const result = await prisma.post.deleteMany({
  where: {
    published: false,
    createdAt: {
      lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
  },
});

// Cascade delete (defined in schema with onDelete: Cascade)
// Deleting user will also delete their posts
const user = await prisma.user.delete({
  where: { id: userId },
  // Posts are automatically deleted
});
```

## Advanced Queries

### Complex Filtering
```javascript
// AND condition (default)
const posts = await prisma.post.findMany({
  where: {
    published: true,
    authorId: userId,
  },
});

// OR condition
const posts = await prisma.post.findMany({
  where: {
    OR: [
      { visibility: 'PUBLIC' },
      { authorId: userId },
    ],
  },
});

// NOT condition
const users = await prisma.user.findMany({
  where: {
    NOT: {
      role: 'ADMIN',
    },
  },
});

// Complex nested conditions
const posts = await prisma.post.findMany({
  where: {
    AND: [
      { published: true },
      {
        OR: [
          { visibility: 'PUBLIC' },
          { authorId: userId },
        ],
      },
    ],
  },
});

// Text search
const posts = await prisma.post.findMany({
  where: {
    OR: [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { content: { contains: searchTerm, mode: 'insensitive' } },
    ],
  },
});

// Date range
const posts = await prisma.post.findMany({
  where: {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  },
});
```

### Aggregations
```javascript
// Count
const userCount = await prisma.user.count();

const publishedCount = await prisma.post.count({
  where: { published: true },
});

// Aggregate functions
const result = await prisma.post.aggregate({
  _count: { id: true },
  _avg: { views: true },
  _sum: { views: true },
  _min: { createdAt: true },
  _max: { createdAt: true },
  where: { published: true },
});

// Group by
const postsByAuthor = await prisma.post.groupBy({
  by: ['authorId'],
  _count: { id: true },
  _sum: { views: true },
  orderBy: {
    _count: { id: 'desc' },
  },
});
```

### Transactions
```javascript
// Sequential transactions
const result = await prisma.$transaction(async (tx) => {
  // Create user
  const user = await tx.user.create({
    data: { email, name, password },
  });

  // Create initial post
  const post = await tx.post.create({
    data: {
      title: 'Welcome Post',
      content: 'Welcome to the platform!',
      authorId: user.id,
    },
  });

  return { user, post };
});

// Batch transactions (all or nothing)
const [deletedPosts, updatedUser] = await prisma.$transaction([
  prisma.post.deleteMany({ where: { authorId: userId } }),
  prisma.user.update({
    where: { id: userId },
    data: { name: 'Updated Name' },
  }),
]);
```

## Performance Optimization

### Indexing
```prisma
model User {
  id    String @id
  email String @unique  // Automatic index

  @@index([createdAt]) // Single column index
  @@index([role, createdAt]) // Composite index
}

model Post {
  id       String @id
  title    String
  authorId String

  @@index([authorId, published]) // For queries filtering by author + published
  @@fulltext([title, content]) // Full-text search (PostgreSQL only)
}
```

### Query Optimization
```javascript
// ✅ DO: Use select to fetch only needed fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
});

// ❌ DON'T: Fetch all fields when not needed
const users = await prisma.user.findMany(); // Fetches password, etc.

// ✅ DO: Use pagination
const posts = await prisma.post.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// ✅ DO: Use cursor-based pagination for large datasets
const posts = await prisma.post.findMany({
  take: 10,
  cursor: lastPostId ? { id: lastPostId } : undefined,
  skip: lastPostId ? 1 : 0,
  orderBy: { createdAt: 'desc' },
});
```

### Connection Pooling
```javascript
// In production, use connection pooling
// DATABASE_URL with connection_limit parameter
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"

// Or use PgBouncer for external pooling
```

## Seeding

### Seed File
```javascript
// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  });

  // Create test users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'male@example.com',
        name: 'Male User',
        password: await bcrypt.hash('password123', 10),
        role: 'MALE',
      },
    }),
    prisma.user.create({
      data: {
        email: 'female@example.com',
        name: 'Female User',
        password: await bcrypt.hash('password123', 10),
        role: 'FEMALE',
      },
    }),
  ]);

  // Create posts
  await prisma.post.createMany({
    data: [
      {
        title: 'Public Post',
        content: 'This is visible to everyone',
        visibility: 'PUBLIC',
        published: true,
        authorId: admin.id,
      },
      {
        title: 'Admin Only Post',
        content: 'Only admins can see this',
        visibility: 'ADMIN_ONLY',
        published: true,
        authorId: admin.id,
      },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Run Seed
```bash
# Add to package.json
{
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}

# Run seed
npx prisma db seed

# Or run directly
node prisma/seed.js
```

## Best Practices

### ✅ DO
- Use transactions for operations that must succeed or fail together
- Add indexes for frequently queried fields
- Use `select` to fetch only needed fields
- Use `findUniqueOrThrow` when record must exist
- Handle Prisma errors properly (P2002, P2025, etc.)
- Use connection pooling in production
- Run migrations before deploying
- Back up database before destructive migrations

### ❌ DON'T
- Don't expose full user objects (including passwords) in API responses
- Don't use `deleteMany` without a `where` clause in production
- Don't skip migrations
- Don't run `prisma migrate reset` in production
- Don't store sensitive data in plain text
- Don't use raw SQL unless absolutely necessary
- Don't forget to handle Prisma errors

---

**Related Skills**:
- `/skills/prisma-postgres/` — Database implementation guide
- `/skills/api-express/` — API patterns
- `/skills/auth-rbac/` — RBAC with database

**See Also**:
- [050-api-express.md](./050-api-express.md)
- [060-auth-rbac.md](./060-auth-rbac.md)
- [100-security-secrets.md](./100-security-secrets.md)
