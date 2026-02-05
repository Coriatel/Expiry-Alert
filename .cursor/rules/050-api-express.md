# API — Express, REST, and Validation

## Express Server Setup

### Basic Server Structure
```javascript
// server.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

## RESTful API Design

### Resource Naming Conventions
```
✅ DO: Use plural nouns for collections
GET    /api/v1/users          → Get all users
POST   /api/v1/users          → Create user
GET    /api/v1/users/:id      → Get user by ID
PUT    /api/v1/users/:id      → Update user (full)
PATCH  /api/v1/users/:id      → Update user (partial)
DELETE /api/v1/users/:id      → Delete user

✅ DO: Use nested resources for relationships
GET    /api/v1/users/:id/posts          → Get user's posts
POST   /api/v1/users/:id/posts          → Create post for user
GET    /api/v1/users/:id/posts/:postId  → Get specific post

❌ DON'T: Use verbs in URLs
GET    /api/v1/getUsers       ❌
POST   /api/v1/createUser     ❌
DELETE /api/v1/deleteUser/:id ❌
```

### HTTP Status Codes
```javascript
// ✅ DO: Use appropriate status codes
// 2xx Success
200 OK               // GET, PUT, PATCH successful
201 Created          // POST successful
204 No Content       // DELETE successful, or no body to return

// 4xx Client Errors
400 Bad Request      // Invalid input
401 Unauthorized     // Not authenticated
403 Forbidden        // Authenticated but not authorized
404 Not Found        // Resource doesn't exist
409 Conflict         // Resource conflict (duplicate email, etc.)
422 Unprocessable Entity // Validation errors

// 5xx Server Errors
500 Internal Server Error // Unexpected server error
503 Service Unavailable   // Server temporarily down
```

## Routes Structure

### Route Organization
```
routes/
├── index.js          // Main router
├── users.routes.js
├── posts.routes.js
└── auth.routes.js
```

### Main Router (index.js)
```javascript
import { Router } from 'express';
import userRoutes from './users.routes.js';
import postRoutes from './posts.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/auth', authRoutes);

export default router;
```

### Resource Router (users.routes.js)
```javascript
import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller.js';
import { validateCreateUser, validateUpdateUser } from '../validation/users.validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Public routes
router.post('/', validateCreateUser, createUser);

// Protected routes (require authentication)
router.use(authenticate); // Apply to all routes below

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', validateUpdateUser, updateUser);
router.delete('/:id', requireRole(['ADMIN']), deleteUser);

export default router;
```

## Controllers

### Controller Pattern
```javascript
// controllers/users.controller.js
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';

export const getAllUsers = async (req, res, next) => {
  try {
    // Parse query parameters
    const { page = 1, limit = 10, search, role } = req.query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    // Fetch data with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          // Don't expose password!
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check email uniqueness if changing
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError('Email already in use', 409);
      }
    }

    // Update user
    const updated = await prisma.user.update({
      where: { id },
      data: { name, email, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Delete user
    await prisma.user.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

## Validation

### Using Joi for Validation
```javascript
// validation/users.validation.js
import Joi from 'joi';
import { validate } from '../middleware/validate.js';

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('ADMIN', 'MALE', 'FEMALE').default('MALE'),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  role: Joi.string().valid('ADMIN', 'MALE', 'FEMALE'),
}).min(1); // At least one field required

export const validateCreateUser = validate(createUserSchema);
export const validateUpdateUser = validate(updateUserSchema);
```

### Validation Middleware
```javascript
// middleware/validate.js
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(422).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};
```

## Error Handling

### Custom Error Class
```javascript
// utils/errors.js
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Error Handler Middleware
```javascript
// middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  // Log error (in production, use proper logger)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
  });

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: err.meta?.target,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found',
    });
  }

  // AppError
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Unknown error
  res.status(500).json({
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error',
  });
};
```

## Async Handler Wrapper
```javascript
// utils/asyncHandler.js
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage: Wrap async controllers
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany();
  res.json({ data: users });
});
```

## Response Formats

### Success Response
```javascript
// ✅ DO: Consistent response structure
{
  "data": { /* resource or array */ },
  "meta": { /* optional metadata */ }
}

// List with pagination
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```javascript
// ✅ DO: Consistent error structure
{
  "error": "Human-readable message",
  "details": [ /* optional validation errors */ ]
}

// Validation error example
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Email is required" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

## Security Best Practices

### Input Sanitization
```javascript
import validator from 'validator';
import xss from 'xss';

// ✅ DO: Sanitize user input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return xss(validator.trim(input));
};
```

### Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

// ✅ DO: Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);

// Stricter limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
});

app.use('/api/v1/auth/login', authLimiter);
```

### SQL Injection Prevention
```javascript
// ✅ DO: Use Prisma (parameterized queries)
const user = await prisma.user.findUnique({
  where: { email }, // Safe - Prisma handles escaping
});

// ❌ DON'T: Use raw SQL with string concatenation
const user = await prisma.$queryRaw(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ DO: If raw SQL is needed, use parameterized queries
const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
```

---

**Related Skills**:
- `/skills/api-express/` — API implementation guide
- `/skills/auth-rbac/` — Authentication and authorization
- `/skills/prisma-postgres/` — Database operations

**See Also**:
- [060-auth-rbac.md](./060-auth-rbac.md)
- [070-prisma-postgres.md](./070-prisma-postgres.md)
- [100-security-secrets.md](./100-security-secrets.md)
