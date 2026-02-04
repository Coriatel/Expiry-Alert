# Authentication & RBAC — Role-Based Access Control

## Authentication Patterns

### JWT (JSON Web Tokens)

#### Token Structure
```javascript
// ✅ DO: Use short-lived access tokens + long-lived refresh tokens
const ACCESS_TOKEN_EXPIRY = '15m';      // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';       // 7 days

// Access token payload (keep minimal)
const accessPayload = {
  userId: user.id,
  role: user.role,
  // Don't include sensitive data
};

// Refresh token payload
const refreshPayload = {
  userId: user.id,
  tokenId: generateTokenId(), // For token revocation
};
```

#### Token Generation
```javascript
import jwt from 'jsonwebtoken';

export const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenId: crypto.randomUUID(),
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};
```

#### Token Verification Middleware
```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';

export const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};
```

### Login Flow
```javascript
// controllers/auth.controller.js
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { generateTokens } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in database (for revocation)
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return access token
    res.json({
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw new AppError('No refresh token', 401);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in database (not revoked)
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: storedToken.user.id,
        role: storedToken.user.role,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.json({ data: { accessToken } });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
```

### Password Hashing
```javascript
import bcrypt from 'bcrypt';

// ✅ DO: Use bcrypt with proper cost factor
const SALT_ROUNDS = 10;

export const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// ❌ DON'T: Use low cost factor or store plain passwords
const SALT_ROUNDS = 5; // Too low!
const password = 'plain-password'; // Never store plain!
```

## RBAC (Role-Based Access Control)

### Role Definitions
```javascript
// constants/roles.js
export const ROLES = {
  ADMIN: 'ADMIN',
  MALE: 'MALE',
  FEMALE: 'FEMALE',
};

export const VISIBILITY = {
  PUBLIC: 'PUBLIC',
  MALE_ONLY: 'MALE_ONLY',
  FEMALE_ONLY: 'FEMALE_ONLY',
  ADMIN_ONLY: 'ADMIN_ONLY',
};

// Role hierarchy
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,   // Highest level
  [ROLES.MALE]: 1,
  [ROLES.FEMALE]: 1,
};

export const hasRole = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};
```

### Role Middleware
```javascript
// middleware/rbac.js
import { AppError } from '../utils/errors.js';
import { ROLES } from '../constants/roles.js';

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

// Usage in routes
router.delete('/:id', authenticate, requireRole([ROLES.ADMIN]), deleteUser);
```

### Content Visibility Filtering
```javascript
// middleware/filterContent.js
import { ROLES, VISIBILITY } from '../constants/roles.js';

export const filterContentByRole = (content, userRole) => {
  // Admin sees everything
  if (userRole === ROLES.ADMIN) {
    return content;
  }

  // Filter based on visibility
  return content.filter(item => {
    if (item.visibility === VISIBILITY.PUBLIC) return true;
    if (item.visibility === VISIBILITY.ADMIN_ONLY) return false;
    if (item.visibility === VISIBILITY.MALE_ONLY && userRole === ROLES.MALE) return true;
    if (item.visibility === VISIBILITY.FEMALE_ONLY && userRole === ROLES.FEMALE) return true;
    return false;
  });
};

// Usage in controller
export const getContent = async (req, res, next) => {
  try {
    const content = await prisma.content.findMany();
    const filtered = filterContentByRole(content, req.user.role);
    res.json({ data: filtered });
  } catch (error) {
    next(error);
  }
};
```

### Database-Level RBAC
```prisma
// prisma/schema.prisma
model Content {
  id         String     @id @default(cuid())
  title      String
  body       String
  visibility Visibility @default(PUBLIC)
  authorId   String
  author     User       @relation(fields: [authorId], references: [id])
  createdAt  DateTime   @default(now())
}

enum Visibility {
  PUBLIC
  MALE_ONLY
  FEMALE_ONLY
  ADMIN_ONLY
}
```

```javascript
// Query with visibility filter
const getVisibleContent = async (userRole) => {
  const whereClause = {
    OR: [
      { visibility: VISIBILITY.PUBLIC },
      ...(userRole === ROLES.ADMIN ? [
        { visibility: VISIBILITY.ADMIN_ONLY },
        { visibility: VISIBILITY.MALE_ONLY },
        { visibility: VISIBILITY.FEMALE_ONLY },
      ] : []),
      ...(userRole === ROLES.MALE ? [{ visibility: VISIBILITY.MALE_ONLY }] : []),
      ...(userRole === ROLES.FEMALE ? [{ visibility: VISIBILITY.FEMALE_ONLY }] : []),
    ],
  };

  return prisma.content.findMany({ where: whereClause });
};
```

## Frontend RBAC

### Protected Routes
```jsx
// components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}

// Usage in App.jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route
    path="/admin"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminDashboard />
      </ProtectedRoute>
    }
  />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
</Routes>
```

### Conditional Rendering
```jsx
// hooks/useAuth.js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);

  const hasRole = (requiredRole) => {
    return context.user?.role === requiredRole;
  };

  const canView = (visibility) => {
    if (!context.user) return visibility === 'PUBLIC';
    if (context.user.role === 'ADMIN') return true;
    if (visibility === 'PUBLIC') return true;
    if (visibility === 'MALE_ONLY' && context.user.role === 'MALE') return true;
    if (visibility === 'FEMALE_ONLY' && context.user.role === 'FEMALE') return true;
    return false;
  };

  return { ...context, hasRole, canView };
};

// Usage in component
function Dashboard() {
  const { user, hasRole, canView } = useAuth();

  return (
    <div>
      <h1>Welcome, {user.name}</h1>

      {hasRole('ADMIN') && (
        <button>Admin Settings</button>
      )}

      {canView('MALE_ONLY') && (
        <div>Male-only content</div>
      )}
    </div>
  );
}
```

## Security Best Practices

### Session Management
```javascript
// ✅ DO: Implement token revocation
export const revokeAllUserTokens = async (userId) => {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
};

// ✅ DO: Clean up expired tokens periodically
export const cleanupExpiredTokens = async () => {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
};

// Run cleanup job (e.g., with node-cron)
import cron from 'node-cron';

cron.schedule('0 0 * * *', cleanupExpiredTokens); // Daily at midnight
```

### Password Requirements
```javascript
// validation/auth.validation.js
import Joi from 'joi';

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .message('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  .required();

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: passwordSchema,
  role: Joi.string().valid('MALE', 'FEMALE').default('MALE'),
});
```

### Prevent Timing Attacks
```javascript
// ✅ DO: Use constant-time comparison for sensitive operations
import { timingSafeEqual } from 'crypto';

const comparePasswords = (password, hash) => {
  // Use bcrypt (already timing-safe)
  return bcrypt.compare(password, hash);
};

// ❌ DON'T: Use direct string comparison for passwords
if (password === storedPassword) { } // Vulnerable to timing attacks
```

## Anti-Patterns to Avoid

```javascript
// ❌ DON'T: Store tokens in localStorage (XSS vulnerable)
localStorage.setItem('token', accessToken);

// ✅ DO: Store access token in memory, refresh token in httpOnly cookie
const [accessToken, setAccessToken] = useState(null);

// ❌ DON'T: Send password in URL or query params
fetch(`/api/login?password=${password}`);

// ✅ DO: Send password in POST body
fetch('/api/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

// ❌ DON'T: Use role from client-side
const isAdmin = localStorage.getItem('role') === 'ADMIN'; // Can be manipulated!

// ✅ DO: Verify role on server-side for every request
router.get('/admin/users', authenticate, requireRole(['ADMIN']), getUsers);
```

---

**Related Skills**:
- `/skills/auth-rbac/` — Auth implementation guide
- `/skills/api-express/` — API patterns
- `/skills/prisma-postgres/` — Database operations

**See Also**:
- [050-api-express.md](./050-api-express.md)
- [070-prisma-postgres.md](./070-prisma-postgres.md)
- [100-security-secrets.md](./100-security-secrets.md)
