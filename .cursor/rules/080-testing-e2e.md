# Testing — Unit, Integration, and E2E

## Testing Strategy

### Test Pyramid
```
        /\
       /  \  E2E Tests (Few - Critical flows)
      /____\
     /      \  Integration Tests (Some - API endpoints)
    /________\
   /          \  Unit Tests (Many - Business logic)
  /____________\
```

### What to Test
- **Unit Tests**: Pure functions, utilities, business logic
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Critical user flows (auth, CRUD operations)

### What NOT to Test
- Third-party libraries
- Framework code
- Simple getters/setters
- Auto-generated code

## Unit Testing with Vitest

### Setup
```javascript
// vite.config.js (or vitest.config.js)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for React components
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.js',
        '**/*.spec.js',
      ],
    },
  },
});
```

### Basic Test Structure
```javascript
// utils/dateUtils.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { formatDate, isValidDate } from './dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date as DD/MM/YYYY', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('15/01/2024');
    });

    it('should handle invalid dates', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate('2024-01-15')).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate('invalid')).toBe(false);
    });
  });
});
```

### Testing Async Functions
```javascript
import { describe, it, expect, vi } from 'vitest';
import { fetchUser, getUserName } from './api';

describe('API functions', () => {
  it('should fetch user data', async () => {
    const user = await fetchUser('123');

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
  });

  it('should throw error for invalid user ID', async () => {
    await expect(fetchUser('invalid')).rejects.toThrow('User not found');
  });
});
```

### Mocking
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserById } from './users.service';
import { prisma } from '../lib/prisma';

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('users.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get user by ID', async () => {
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);

    const user = await getUserById('123');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
    });
    expect(user).toEqual(mockUser);
  });

  it('should throw error if user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(getUserById('999')).rejects.toThrow('User not found');
  });
});
```

### Testing React Components
```javascript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click Me</Button>);

    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    fireEvent.click(screen.getByText('Click Me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click Me</Button>);

    expect(screen.getByText('Click Me')).toBeDisabled();
  });
});
```

## Integration Testing

### API Endpoint Testing
```javascript
// tests/integration/users.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import { prisma } from '../../src/lib/prisma';

describe('Users API', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear data before each test
    await prisma.user.deleteMany();

    // Create test user and get auth token
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = response.body.data.accessToken;
    testUser = response.body.data.user;
  });

  describe('GET /api/v1/users', () => {
    it('should return list of users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/v1/users')
        .expect(401);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.name).toBe(testUser.name);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/v1/users/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(newUser)
        .expect(201);

      expect(response.body.data.name).toBe(newUser.name);
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data.password).toBeUndefined(); // Don't expose password
    });

    it('should return 422 for invalid input', async () => {
      await request(app)
        .post('/api/v1/users')
        .send({ name: 'No Email' })
        .expect(422);
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post('/api/v1/users')
        .send({
          name: 'Duplicate',
          email: testUser.email, // Already exists
          password: 'password123',
        })
        .expect(409);
    });
  });
});
```

## E2E Testing with Playwright

### Setup
```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Example
```javascript
// e2e/auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should register new user', async ({ page }) => {
    // Navigate to register page
    await page.click('text=הרשמה');

    // Fill form
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user is logged in
    await expect(page.locator('text=ברוך הבא, Test User')).toBeVisible();
  });

  test('should login with existing user', async ({ page }) => {
    // Navigate to login page
    await page.click('text=התחברות');

    // Fill form
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=התחברות');

    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('[role="alert"]')).toContainText('פרטי התחברות שגויים');
  });

  test('should logout', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.click('text=יציאה');

    // Verify redirect to home
    await expect(page).toHaveURL('/');

    // Verify auth cookie is cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'refreshToken');
    expect(authCookie).toBeUndefined();
  });
});
```

### Testing RBAC
```javascript
// e2e/rbac.spec.js
import { test, expect } from '@playwright/test';

test.describe('RBAC - Admin', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
  });

  test('should see admin panel', async ({ page }) => {
    await expect(page.locator('text=לוח ניהול')).toBeVisible();
  });

  test('should see all content', async ({ page }) => {
    await page.goto('/content');

    // Admin sees PUBLIC, MALE_ONLY, FEMALE_ONLY, ADMIN_ONLY
    await expect(page.locator('text=תוכן ציבורי')).toBeVisible();
    await expect(page.locator('text=תוכן למנהלים בלבד')).toBeVisible();
  });
});

test.describe('RBAC - Regular User', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/login');
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
  });

  test('should NOT see admin panel', async ({ page }) => {
    await expect(page.locator('text=לוח ניהול')).not.toBeVisible();
  });

  test('should only see allowed content', async ({ page }) => {
    await page.goto('/content');

    // Regular user sees only PUBLIC content
    await expect(page.locator('text=תוכן ציבורי')).toBeVisible();
    await expect(page.locator('text=תוכן למנהלים בלבד')).not.toBeVisible();
  });
});
```

## Coverage Goals

### Recommended Coverage Thresholds
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
});
```

### What to Prioritize
1. **Critical Business Logic**: 95%+ coverage
2. **API Endpoints**: 90%+ coverage
3. **Utilities**: 85%+ coverage
4. **UI Components**: 70%+ coverage (focus on logic, not styling)

## Running Tests

```bash
# Unit tests
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e            # Run E2E tests
npm run test:e2e:headed     # Run in headed mode (see browser)
npm run test:e2e:debug      # Debug mode
```

## Best Practices

### ✅ DO
- Write tests before fixing bugs (TDD for bug fixes)
- Test edge cases and error conditions
- Use descriptive test names (should/when/given)
- Mock external dependencies (APIs, databases)
- Clean up test data after tests
- Use test fixtures for common data
- Run tests in CI/CD pipeline

### ❌ DON'T
- Don't test implementation details
- Don't write tests that depend on other tests
- Don't use production database for tests
- Don't skip error cases
- Don't test third-party libraries
- Don't write tests just for coverage numbers

---

**Related Skills**:
- `/skills/testing-e2e/` — Testing implementation guide
- `/skills/api-express/` — API testing patterns
- `/skills/ui/` — Component testing

**See Also**:
- [050-api-express.md](./050-api-express.md)
- [020-ui-react-scss-a11y.md](./020-ui-react-scss-a11y.md)
