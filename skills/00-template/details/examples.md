# Skill Template — Examples

This file demonstrates how to structure the `examples.md` file for any skill. Each example should be complete, realistic, and copy/paste ready.

---

## Table of Contents

1. [Example 1: Simple Skill (Basic CRUD)](#example-1-simple-skill-basic-crud)
2. [Example 2: Medium Complexity (API with Auth)](#example-2-medium-complexity-api-with-auth)
3. [Example 3: Complex Skill (Full-Stack Feature)](#example-3-complex-skill-full-stack-feature)
4. [Example 4: Configuration Skill (Tool Setup)](#example-4-configuration-skill-tool-setup)
5. [Example 5: Workflow Skill (Deployment)](#example-5-workflow-skill-deployment)
6. [Example 6: Testing Skill (E2E Test Suite)](#example-6-testing-skill-e2e-test-suite)
7. [Example 7: Refactoring Skill (Code Improvement)](#example-7-refactoring-skill-code-improvement)
8. [Example 8: Migration Skill (Version Upgrade)](#example-8-migration-skill-version-upgrade)

---

## Example 1: Simple Skill (Basic CRUD)

### Context

Creating a simple skill for adding a basic CRUD API endpoint. This is the minimal viable skill structure.

### Skill Name

`add-crud-endpoint`

### skill.md Structure

```markdown
# Add CRUD Endpoint

## Purpose

Create a basic CRUD (Create, Read, Update, Delete) API endpoint with Express and Prisma.

## When to Use This Skill

Use when:
- Adding a new resource to an existing API
- Implementing standard REST operations
- Working with Prisma ORM

Do NOT use when:
- Building complex business logic (needs custom skill)
- Implementing GraphQL (different patterns)

## Required Inputs

1. **Resource Name**: Singular noun (e.g., "Product", "Order")
2. **Fields**: List of field names and types (defaults to: id, name, createdAt)

## Steps

### 1. Create Prisma Model

Add to `prisma/schema.prisma`:

```prisma
model Product {
  id        Int      @id @default(autoincrement())
  name      String
  price     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Run Migration

```bash
npx prisma migrate dev --name add_product_model
```

### 3. Create Routes File

Create `src/routes/products.js`:

```javascript
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const product = await prisma.product.create({
      data: req.body,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: 'Invalid product data' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
```

### 4. Register Routes

In `src/server.js`, add:

```javascript
const productRoutes = require('./routes/products');

app.use('/api/products', productRoutes);
```

## Expected Outputs

- Prisma model: `prisma/schema.prisma` (Product model added)
- Migration: `prisma/migrations/{timestamp}_add_product_model/`
- Routes file: `src/routes/products.js`
- Updated server: `src/server.js`

## Validation

1. Test GET all:
   ```bash
   curl http://localhost:3000/api/products
   ```

2. Test POST:
   ```bash
   curl -X POST http://localhost:3000/api/products \
     -H "Content-Type: application/json" \
     -d '{"name":"Widget","price":19.99}'
   ```

## Related Skills

- `/skills/prisma-postgres/` — Database modeling
- `/skills/api-express/` — Advanced API patterns

## See Also

- [API Express Rule](../../.cursor/rules/050-api-express.md)
```

### Explanation

This example shows:
- **Minimal but complete**: Only essential steps
- **Full code blocks**: No snippets or "..."
- **Clear validation**: How to test it works
- **Sensible scope**: CRUD only, not auth or validation

---

## Example 2: Medium Complexity (API with Auth)

### Context

Adding authentication and authorization to an API endpoint.

### Skill Structure Highlight

```markdown
### 3. Create Auth Middleware

Create `src/middleware/authenticate.js`:

```javascript
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authenticate;
```

### 4. Create Authorization Middleware

Create `src/middleware/authorize.js`:

```javascript
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

module.exports = authorize;
```

### 5. Apply Middleware to Routes

Update `src/routes/products.js`:

```javascript
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// Public route (no auth)
router.get('/', async (req, res) => { /* ... */ });
router.get('/:id', async (req, res) => { /* ... */ });

// Protected routes (authentication required)
router.post('/', authenticate, async (req, res) => { /* ... */ });

// Admin-only routes (authorization required)
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => { /* ... */ });
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => { /* ... */ });
```

## Validation

Test with authentication:

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token')

# Use token
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN"
```
```

### Explanation

This shows:
- **Middleware pattern**: Reusable auth logic
- **Progressive complexity**: Public → Authenticated → Authorized
- **Realistic testing**: How to test with JWT tokens

---

## Example 3: Complex Skill (Full-Stack Feature)

### Context

A skill that spans frontend and backend for a complete feature.

### Skill Structure Highlight

```markdown
## Steps

### 1. Backend: Create API Endpoint

[... as in previous examples ...]

### 2. Backend: Add Validation

Create `src/validators/productValidator.js`:

```javascript
const { body, validationResult } = require('express-validator');

const productValidationRules = [
  body('name').isString().isLength({ min: 3, max: 100 }),
  body('price').isFloat({ min: 0 }),
  body('description').optional().isString().isLength({ max: 500 }),
];

function validateProduct(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = { productValidationRules, validateProduct };
```

### 3. Frontend: Create API Service

Create `src/services/api/productService.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const productService = {
  async getAll() {
    const response = await axios.get(`${API_BASE_URL}/products`);
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/products/${id}`);
    return response.data;
  },

  async create(productData) {
    const response = await axios.post(`${API_BASE_URL}/products`, productData);
    return response.data;
  },

  async update(id, productData) {
    const response = await axios.put(`${API_BASE_URL}/products/${id}`, productData);
    return response.data;
  },

  async delete(id) {
    await axios.delete(`${API_BASE_URL}/products/${id}`);
  },
};
```

### 4. Frontend: Create React Component

Create `src/components/ProductList/ProductList.jsx`:

```javascript
import { useState, useEffect } from 'react';
import { productService } from '../../services/api/productService';
import './product-list.scss';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return;

    try {
      await productService.delete(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete product');
    }
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="product-list">
      <h1>Products</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>${product.price.toFixed(2)}</td>
              <td>
                <button onClick={() => handleDelete(product.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductList;
```

### 5. Frontend: Add Styles

Create `src/components/ProductList/product-list.scss`:

```scss
.product-list {
  padding: 2rem;

  h1 {
    margin-bottom: 1.5rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background-color: #f9fafb;
      font-weight: 600;
    }
  }

  button {
    padding: 0.5rem 1rem;
    background-color: #ef4444;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;

    &:hover {
      background-color: #dc2626;
    }
  }
}

.loading, .error {
  padding: 2rem;
  text-align: center;
}
```
```

### Explanation

This demonstrates:
- **Full-stack coverage**: Backend + Frontend
- **Service layer**: Separation of concerns
- **Complete component**: State, effects, handlers, JSX, styles
- **Real-world patterns**: Loading states, error handling

---

## Example 4: Configuration Skill (Tool Setup)

### Context

Setting up a tool or service (e.g., ESLint, Prettier, CI/CD).

### Skill Structure Highlight

```markdown
# Set Up ESLint and Prettier

## Steps

### 1. Install Dependencies

```bash
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier
npm install -D @eslint/js eslint-plugin-react eslint-plugin-react-hooks
```

### 2. Create ESLint Configuration

Create `.eslintrc.js`:

```javascript
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Must be last
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'react/prop-types': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

### 3. Create Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### 4. Add NPM Scripts

Update `package.json`:

```json
{
  "scripts": {
    "lint": "eslint src --ext .js,.jsx",
    "lint:fix": "eslint src --ext .js,.jsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,json,css,scss,md}\""
  }
}
```

### 5. Create Ignore Files

Create `.eslintignore`:

```
node_modules
dist
build
coverage
*.config.js
```

Create `.prettierignore`:

```
node_modules
dist
build
coverage
package-lock.json
```

## Validation

```bash
npm run lint
npm run format
```

Expected: No errors, files formatted consistently.
```

### Explanation

Shows:
- **Configuration files**: Complete, production-ready
- **Integration**: ESLint + Prettier working together
- **Scripts**: Convenient commands
- **Ignore files**: Avoid linting generated code

---

## Example 5: Workflow Skill (Deployment)

### Context

A skill for a multi-step process like deployment.

### Skill Structure Highlight

```markdown
# Deploy to Production (VPS)

## Steps

### 1. Pre-Flight Checks

```bash
# Ensure on main branch with latest changes
git checkout main
git pull origin main

# Ensure tests pass
npm test

# Ensure build succeeds
npm run build
```

### 2. Connect to VPS

```bash
ssh user@your-vps-ip

# Or if using SSH key:
ssh -i ~/.ssh/your-key.pem user@your-vps-ip
```

### 3. Pull Latest Code

On the VPS:

```bash
cd /var/www/your-app
git pull origin main
```

### 4. Install Dependencies

```bash
npm ci --production
```

### 5. Run Database Migrations

```bash
npx prisma migrate deploy
```

### 6. Build Application

```bash
npm run build
```

### 7. Restart Application

```bash
pm2 restart your-app

# Or if using systemd:
sudo systemctl restart your-app
```

### 8. Verify Deployment

```bash
# Check application status
pm2 status

# Check logs
pm2 logs your-app --lines 50

# Test health endpoint
curl https://your-domain.com/health
```

## Validation

1. Application is running: `pm2 status` shows "online"
2. Health endpoint returns 200: `curl https://your-domain.com/health`
3. Recent logs show no errors: `pm2 logs your-app`
```

### Explanation

Demonstrates:
- **Sequential workflow**: Order matters
- **Safety checks**: Pre-flight validation
- **Server commands**: SSH, systemd, PM2
- **Verification**: Multiple validation points

---

## Example 6: Testing Skill (E2E Test Suite)

### Context

Creating comprehensive tests for a feature.

### Skill Structure Highlight

```markdown
# Add E2E Tests for User Authentication

## Steps

### 1. Create Test File

Create `e2e/auth.spec.js`:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should register new user', async ({ page }) => {
    await page.click('text=Sign Up');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button:has-text("Create Account")');

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.click('text=Sign In');
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=Sign In');
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    await expect(page.locator('.error')).toHaveText('Invalid email or password');
  });

  test('should logout user', async ({ page }) => {
    // Login first
    await page.click('text=Sign In');
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Then logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=Logout');

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Sign In')).toBeVisible();
  });
});
```

## Validation

Run tests:

```bash
npx playwright test e2e/auth.spec.js
```

Expected output:
```
Running 4 tests using 1 worker

  ✓ should register new user (2.3s)
  ✓ should login existing user (1.8s)
  ✓ should show error for invalid credentials (1.5s)
  ✓ should logout user (2.1s)

  4 passed (7.7s)
```
```

### Explanation

Shows:
- **Complete test suite**: Multiple scenarios
- **Best practices**: beforeEach, descriptive names
- **Assertions**: Proper expectations
- **Realistic**: Actual user flows

---

## Example 7: Refactoring Skill (Code Improvement)

### Context

Improving existing code quality.

### Skill Structure

```markdown
# Refactor Class Component to Functional Component

## Steps

### 1. Identify Target Component

Locate the class component to refactor (e.g., `src/components/UserProfile.jsx`).

### 2. Convert Class to Function

**Before (Class Component):**

```javascript
import React, { Component } from 'react';

class UserProfile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      loading: true,
    };
  }

  componentDidMount() {
    this.fetchUser();
  }

  fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${this.props.userId}`);
      const user = await response.json();
      this.setState({ user, loading: false });
    } catch (err) {
      console.error(err);
      this.setState({ loading: false });
    }
  };

  render() {
    const { user, loading } = this.state;

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>User not found</div>;

    return (
      <div className="user-profile">
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </div>
    );
  }
}

export default UserProfile;
```

**After (Functional Component):**

```javascript
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/users/${userId}`);
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

export default UserProfile;
```

### 3. Update Tests

Update `src/components/UserProfile.test.jsx`:

```javascript
// Change enzyme shallow to React Testing Library
import { render, screen, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';

test('renders user profile', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ name: 'Alice', email: 'alice@example.com' }),
    })
  );

  render(<UserProfile userId={1} />);

  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });
});
```

## Validation

```bash
npm test -- UserProfile.test.jsx
```

Expected: All tests pass with updated implementation.
```

### Explanation

Demonstrates:
- **Before/after**: Clear comparison
- **Modern patterns**: Hooks, functional components
- **Test updates**: Keep tests in sync

---

## Example 8: Migration Skill (Version Upgrade)

### Context

Upgrading a major dependency version.

### Skill Structure

```markdown
# Upgrade React 17 to React 18

## Steps

### 1. Update Dependencies

Update `package.json`:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

### 2. Install Updated Packages

```bash
npm install
```

### 3. Update Root Rendering

**Before (React 17):**

```javascript
// src/index.js
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```

**After (React 18):**

```javascript
// src/index.js
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

### 4. Update Test Setup

Update `src/setupTests.js`:

```javascript
import { createRoot } from 'react-dom/client';

// Configure React 18 testing
global.IS_REACT_18 = true;
```

### 5. Handle Breaking Changes

Update components using removed APIs:

```javascript
// If using ReactDOM.render in tests:
import { render } from '@testing-library/react';
// Already uses React 18 API internally

// If using deprecated ReactDOM.unmountComponentAtNode:
// Before:
ReactDOM.unmountComponentAtNode(container);

// After:
root.unmount();
```

## Validation

1. Run development server:
   ```bash
   npm run dev
   ```
   Expected: No console warnings about deprecated APIs

2. Run tests:
   ```bash
   npm test
   ```
   Expected: All tests pass

3. Check for warnings:
   ```bash
   npm run build
   ```
   Expected: No React 17 deprecation warnings
```

### Explanation

Shows:
- **Version upgrade**: Dependencies, code, tests
- **Breaking changes**: How to handle them
- **Validation**: Ensure nothing broke

---

## Conclusion

These examples demonstrate:
1. **Range of complexity**: Simple to complex
2. **Variety of skills**: CRUD, auth, testing, deployment, refactoring
3. **Complete code**: Copy/paste ready
4. **Real-world patterns**: Production-quality examples

Use these as templates when creating your own skill examples.

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintained by**: Development Policy Library Project
