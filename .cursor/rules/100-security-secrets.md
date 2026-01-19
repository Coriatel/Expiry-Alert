# Security & Secrets — Best Practices

## Environment Variables

### Storage
```bash
# ✅ DO: Store secrets in .env files
# .env (NEVER commit this file!)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_ACCESS_SECRET="your-super-secret-key-change-this-in-production"
JWT_REFRESH_SECRET="another-secret-key-for-refresh-tokens"
API_KEY="sk_live_abc123xyz"

# ❌ DON'T: Hardcode secrets in code
const apiKey = "sk_live_abc123xyz"; // NO!
const dbUrl = "postgresql://user:password@localhost:5432/dbname"; // NO!
```

### Loading Environment Variables
```javascript
// ✅ DO: Use dotenv for development
import 'dotenv/config';

// Or explicitly load
import dotenv from 'dotenv';
dotenv.config();

// Access environment variables
const dbUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_ACCESS_SECRET;

// ✅ DO: Validate required environment variables on startup
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}
```

### .env.example Template
```bash
# .env.example (commit this file)
# Copy to .env and fill in actual values

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-secret-here"

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

# External APIs
SENDGRID_API_KEY="your-key-here"
STRIPE_SECRET_KEY="sk_test_..."
```

### .gitignore for Secrets
```gitignore
# Environment variables
.env
.env.local
.env.development
.env.production
.env.test

# Credentials
credentials.json
secrets.json
*.pem
*.key
*.crt

# SSH keys
id_rsa
id_rsa.pub
*.ppk
```

## Password Security

### Hashing
```javascript
import bcrypt from 'bcrypt';

// ✅ DO: Use bcrypt with proper salt rounds
const SALT_ROUNDS = 10; // Good balance of security and performance

export const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// ❌ DON'T: Store passwords in plain text
const user = {
  password: 'mypassword123', // NO!
};

// ❌ DON'T: Use weak hashing
import crypto from 'crypto';
const hash = crypto.createHash('md5').update(password).digest('hex'); // NO!
```

### Password Requirements
```javascript
// ✅ DO: Enforce strong password requirements
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return {
      valid: false,
      error: 'Password must contain uppercase, lowercase, and number',
    };
  }

  return { valid: true };
};
```

## JWT Security

### Token Generation
```javascript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ✅ DO: Use strong secrets
const JWT_SECRET = process.env.JWT_ACCESS_SECRET; // At least 256 bits

// Generate secret securely (one-time)
const generateSecret = () => {
  return crypto.randomBytes(32).toString('base64');
};

// ✅ DO: Use short expiration for access tokens
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m', // Short-lived
    algorithm: 'HS256',
  });
};

// ✅ DO: Include minimal payload
const payload = {
  userId: user.id,
  role: user.role,
  // Don't include sensitive data (passwords, SSN, etc.)
};

// ❌ DON'T: Use weak secrets
const JWT_SECRET = 'secret'; // NO! Too weak

// ❌ DON'T: Use long expiration
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); // NO!

// ❌ DON'T: Include sensitive data
const payload = {
  userId: user.id,
  password: user.password, // NO!
  creditCard: user.creditCard, // NO!
};
```

### Token Verification
```javascript
// ✅ DO: Verify and handle errors
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401);
    }
    throw error;
  }
};
```

## Input Validation & Sanitization

### Validation
```javascript
import Joi from 'joi';
import validator from 'validator';

// ✅ DO: Validate all user input
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  age: Joi.number().integer().min(0).max(150),
});

const { error, value } = userSchema.validate(req.body);

// ✅ DO: Sanitize string input
import xss from 'xss';

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remove XSS
  let clean = xss(input);

  // Trim whitespace
  clean = validator.trim(clean);

  return clean;
};

// ❌ DON'T: Trust user input
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`; // SQL injection!
```

### SQL Injection Prevention
```javascript
// ✅ DO: Use Prisma (parameterized queries)
const user = await prisma.user.findUnique({
  where: { email: userEmail }, // Safe - Prisma handles escaping
});

// ✅ DO: If using raw SQL, use parameterized queries
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userEmail}
`; // Safe - parameterized

// ❌ DON'T: Concatenate user input into SQL
const user = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${userEmail}'`
); // VULNERABLE!
```

### XSS Prevention
```javascript
// ✅ DO: Sanitize HTML content
import DOMPurify from 'isomorphic-dompurify';

const cleanHtml = DOMPurify.sanitize(userInput);

// ✅ DO: Use React's automatic escaping
function UserProfile({ name }) {
  return <h1>{name}</h1>; // React automatically escapes
}

// ❌ DON'T: Use dangerouslySetInnerHTML with user input
function UserProfile({ bio }) {
  return <div dangerouslySetInnerHTML={{ __html: bio }} />; // VULNERABLE!
}

// ✅ BETTER: Sanitize first
function UserProfile({ bio }) {
  const cleanBio = DOMPurify.sanitize(bio);
  return <div dangerouslySetInnerHTML={{ __html: cleanBio }} />;
}
```

## HTTPS & Secure Cookies

### HTTPS in Production
```javascript
// ✅ DO: Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### Secure Cookies
```javascript
// ✅ DO: Set secure cookie options
res.cookie('refreshToken', token, {
  httpOnly: true,           // Prevent JS access (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  sameSite: 'strict',       // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

// ❌ DON'T: Store tokens in localStorage (XSS vulnerable)
localStorage.setItem('token', accessToken); // NO!

// ❌ DON'T: Use insecure cookies
res.cookie('token', token); // NO! No security options
```

## CORS (Cross-Origin Resource Sharing)

### Configuration
```javascript
import cors from 'cors';

// ✅ DO: Restrict CORS to trusted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'https://yourdomain.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ❌ DON'T: Allow all origins in production
app.use(cors()); // NO! Allows all origins
app.use(cors({ origin: '*' })); // NO!
```

## Rate Limiting

### Implementation
```javascript
import rateLimit from 'express-rate-limit';

// ✅ DO: Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ✅ DO: Stricter limits for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
});

app.use('/api/v1/auth/login', authLimiter);
```

## Security Headers

### Helmet.js
```javascript
import helmet from 'helmet';

// ✅ DO: Use Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
```

## Logging & Monitoring

### Safe Logging
```javascript
// ✅ DO: Log important events (without sensitive data)
logger.info('User logged in', {
  userId: user.id,
  ip: req.ip,
  userAgent: req.get('user-agent'),
});

logger.error('Login failed', {
  email: req.body.email, // OK to log (it's username)
  ip: req.ip,
  reason: 'invalid_password',
});

// ❌ DON'T: Log sensitive data
logger.info('Login attempt', {
  email: req.body.email,
  password: req.body.password, // NO! Never log passwords
  creditCard: user.creditCard, // NO!
});

// ✅ DO: Redact sensitive data
const redactSensitiveData = (data) => {
  const redacted = { ...data };

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      redacted[key] = '[REDACTED]';
    }
  }

  return redacted;
};
```

## Dependency Security

### Auditing
```bash
# ✅ DO: Regularly audit dependencies
npm audit
npm audit fix

# Check for outdated packages
npm outdated

# Use tools like Snyk
npx snyk test
```

### Updates
```javascript
// ✅ DO: Keep dependencies updated
// package.json
{
  "dependencies": {
    "express": "^4.18.2",  // ^ allows minor/patch updates
    "prisma": "~5.0.0"     // ~ allows patch updates only
  }
}

// ❌ DON'T: Use wildcard versions
{
  "dependencies": {
    "express": "*"         // NO! Unpredictable
  }
}
```

## Error Handling

### Secure Error Messages
```javascript
// ✅ DO: Send generic errors in production
const errorHandler = (err, req, res, next) => {
  console.error(err); // Log full error server-side

  const statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'production') {
    // Don't expose stack traces in production
    res.status(statusCode).json({
      error: err.message || 'Internal server error',
    });
  } else {
    // Detailed errors in development
    res.status(statusCode).json({
      error: err.message,
      stack: err.stack,
    });
  }
};

// ❌ DON'T: Expose sensitive error details
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,        // NO! Reveals code structure
    query: req.query,        // NO! May contain sensitive data
    body: req.body,          // NO! May contain passwords
  });
});
```

## Checklist

### Pre-Deployment Security Checklist
- [ ] All secrets are in environment variables (not hardcoded)
- [ ] `.env` files are in `.gitignore`
- [ ] Passwords are hashed with bcrypt
- [ ] JWT secrets are strong (256+ bits)
- [ ] HTTPS is enforced in production
- [ ] Cookies are httpOnly, secure, and sameSite
- [ ] CORS is restricted to trusted origins
- [ ] Rate limiting is enabled
- [ ] Security headers are set (Helmet.js)
- [ ] Input validation is on all endpoints
- [ ] SQL injection protection (Prisma/parameterized queries)
- [ ] XSS protection (sanitize user input)
- [ ] Dependencies are up to date (`npm audit`)
- [ ] Error messages don't expose sensitive data
- [ ] Logging doesn't include passwords/tokens
- [ ] RBAC is properly implemented
- [ ] File uploads are validated and sanitized (if applicable)
- [ ] API documentation doesn't expose sensitive endpoints

---

## Hosting Provider Compliance (Hostinger & Similar)

When deploying to VPS hosting (Hostinger, DigitalOcean, Linode, etc.):

### Never Commit Secrets to VPS
```bash
# ❌ DON'T: Store secrets in git on VPS
git add .env  # NO! Even in private repos

# ✅ DO: Use .env files that are gitignored
echo ".env" >> .gitignore
git add .gitignore
```

### VPS-Specific Security Requirements
```bash
# ✅ DO: Secure wp-config.php (if WordPress)
sudo chmod 440 /var/www/html/wp-config.php

# ✅ DO: Verify no secrets in web-accessible files
sudo grep -r "password\|secret\|api_key" /var/www/html/ --exclude-dir=node_modules

# ❌ DON'T: Echo secrets in terminal/logs
echo $DATABASE_PASSWORD  # NO! Visible in shell history
```

### Hostinger ToS Compliance Notes

**CRITICAL**: Hosting providers like Hostinger enforce strict anti-abuse policies. Your code and operations must:
- ✅ Never include malware, backdoors, or shells (even for testing)
- ✅ Never use offensive security tools (port scanners, brute forcers)
- ✅ Never bypass security controls or tamper with logs
- ✅ Use defensive security only (fail2ban, firewalls, malware scanning)

**See**: [110-hostinger-vps-compliance.md](./110-hostinger-vps-compliance.md) for complete compliance requirements.

**AI Agent Note**: When operating on Hostinger VPS, follow [AI Agent Safety Protocol](/docs/ops/HOSTINGER_AI_AGENT_SAFETY.md).

---

**Related Skills**:
- `/skills/auth-rbac/` — Authentication security
- `/skills/api-express/` — API security patterns
- `/skills/terminal-ssh-vps/` — Safe SSH operations
- `/skills/hostinger-vps-ops/` — Hostinger VPS operations & compliance

**See Also**:
- [060-auth-rbac.md](./060-auth-rbac.md)
- [050-api-express.md](./050-api-express.md)
- [090-git-workflow.md](./090-git-workflow.md)
- [110-hostinger-vps-compliance.md](./110-hostinger-vps-compliance.md)

**Resources**:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Terminal & SSH Policy](/docs/ops/TERMINAL_SSH_POLICY.md)
- [Hostinger VPS Runbook](/docs/ops/HOSTINGER_VPS_RUNBOOK.md)
