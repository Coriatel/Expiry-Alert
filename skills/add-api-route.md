# Skill: Add a New API Route

**Goal**: Create a new REST API endpoint with validation and RBAC

**Time**: ~15 minutes

---

## Example: Add a "Comments" feature

### 1. Create the Prisma Model

Edit `/prisma/postgres/schema.prisma`:

```prisma
model Comment {
  id        String   @id @default(uuid())
  text      String
  contentId String   @map("content_id")
  authorId  String   @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")

  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)
  author  User    @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("comments")
}
```

Don't forget to add the relation to Content and User models!

Run migration:
```bash
npm run db:migrate --workspace=apps/api
```

### 2. Create Validation Schema

Create `/apps/api/src/validation/comment.validation.js`:

```javascript
const Joi = require('joi');

const createCommentSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
  contentId: Joi.string().uuid().required(),
});

module.exports = { createCommentSchema };
```

### 3. Create Controller

Create `/apps/api/src/controllers/comment.controller.js`:

```javascript
const { prisma } = require('../config/prisma');

const createComment = async (req, res, next) => {
  try {
    const { text, contentId } = req.validatedBody;

    const comment = await prisma.comment.create({
      data: {
        text,
        contentId,
        authorId: req.user.id,
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
};

module.exports = { createComment };
```

### 4. Create Routes

Create `/apps/api/src/routes/comment.routes.js`:

```javascript
const express = require('express');
const commentController = require('../controllers/comment.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createCommentSchema } = require('../validation/comment.validation');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createCommentSchema), commentController.createComment);

module.exports = router;
```

### 5. Register Routes

Edit `/apps/api/src/routes/index.js`:

```javascript
const commentRoutes = require('./comment.routes');

// Add to router:
router.use('/comments', commentRoutes);
```

### 6. Test the API

```bash
curl -X POST http://localhost:3001/api/v1/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Great post!", "contentId": "..."}'
```

---

## RBAC Protection

To restrict access by role:

```javascript
const { requireRole } = require('../middleware/rbac');

router.delete('/:id', requireRole('ADMIN'), commentController.deleteComment);
```

---

## See Also

- `/docs/API.md` - API design patterns
- `/skills/database-migration.md` - Database changes
- `/skills/rbac-setup.md` - RBAC implementation
