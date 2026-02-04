# Skill: Database Migration

**Goal**: Modify the database schema safely

**Time**: ~5 minutes

---

## Steps

### 1. Update Prisma Schema

Edit `/prisma/postgres/schema.prisma`:

```prisma
model User {
  // ... existing fields
  phoneNumber String? @map("phone_number") // Add new field
}
```

### 2. Create Migration

```bash
cd prisma/postgres
npx prisma migrate dev --name add_phone_number
```

This will:
1. Generate SQL migration file
2. Apply it to your local database
3. Regenerate Prisma Client

### 3. Update Seed File (Optional)

If the new field is required, update `/prisma/postgres/seed.js`:

```javascript
const admin = await prisma.user.upsert({
  // ...
  create: {
    // ...
    phoneNumber: '050-1234567',
  },
});
```

### 4. Verify Migration

```bash
npm run db:studio --workspace=apps/api
```

Open Prisma Studio and check the new field exists.

---

## Production Deployment

**Before deploying**:

1. Test migration on staging environment
2. Backup production database
3. Deploy with migration:

```bash
npx prisma migrate deploy
```

**Never** use `prisma migrate dev` in production!

---

## Rollback

If migration fails:

```bash
# Undo last migration (development only)
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# In production: manually restore from backup
```

---

## Common Patterns

### Add Optional Field
```prisma
phoneNumber String? @map("phone_number")
```

### Add Required Field with Default
```prisma
status String @default("active")
```

### Add Enum
```prisma
enum Status {
  ACTIVE
  INACTIVE
  PENDING
}

model User {
  status Status @default(ACTIVE)
}
```

### Add Relation
```prisma
model Post {
  authorId String @map("author_id")
  author   User   @relation(fields: [authorId], references: [id])
}
```

---

## See Also

- Prisma Docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- `/docs/DATABASE.md` - Database design guide
- `/skills/add-api-route.md` - Using new models in API
