# Skill: Testing

**Goal**: Write unit and E2E tests for new features

**Time**: ~15 minutes

---

## Unit Testing (Vitest)

### API Unit Test Example

Create `/apps/api/tests/auth.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/config/prisma';

describe('Auth API', () => {
  beforeAll(async () => {
    // Setup: Create test user
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
    await prisma.$disconnect();
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
  });
});
```

Run: `npm test --workspace=apps/api`

### React Component Test Example

Create `/apps/web/tests/Login.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../src/pages/Login';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

describe('Login Component', () => {
  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/אימייל/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/סיסמה/i)).toBeInTheDocument();
  });

  it('submits form with email and password', async () => {
    const { login } = useAuth();

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/אימייל/i), {
      target: { value: 'test@example.com' },
    });

    fireEvent.change(screen.getByLabelText(/סיסמה/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /כניסה/i }));

    expect(login).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
```

Run: `npm test --workspace=apps/web`

---

## E2E Testing (Playwright)

### E2E Test Example

Create `/e2e/tests/content.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Content Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/אימייל/i).fill('admin@crm.local');
    await page.getByLabel(/סיסמה/i).fill('Admin123!');
    await page.getByRole('button', { name: /כניסה/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create new content', async ({ page }) => {
    await page.goto('/content/new');

    await page.getByLabel(/כותרת/i).fill('E2E Test Content');
    await page.getByLabel(/תיאור/i).fill('Created by E2E test');
    await page.getByLabel(/תוכן/i).fill('This is test content body');

    await page.getByRole('button', { name: /יצירה/i }).click();

    await expect(page).toHaveURL('/content');
    await expect(page.getByText('E2E Test Content')).toBeVisible();
  });

  test('should respect RBAC', async ({ page }) => {
    // Logout and login as male user
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /התנתקות/i }).click();

    await page.goto('/login');
    await page.getByLabel(/אימייל/i).fill('male@crm.local');
    await page.getByLabel(/סיסמה/i).fill('Male123!');
    await page.getByRole('button', { name: /כניסה/i }).click();

    // Should NOT see Users link (admin only)
    await expect(page.getByRole('link', { name: /משתמשים/i })).not.toBeVisible();
  });
});
```

Run: `npm run test:e2e`

---

## Test Coverage

Generate coverage report:

```bash
# API
npm test --workspace=apps/api -- --coverage

# Web
npm test --workspace=apps/web -- --coverage
```

Aim for 70%+ coverage on critical paths.

---

## Testing Best Practices

1. **Arrange-Act-Assert** pattern
2. **Test user behavior**, not implementation
3. **Mock external dependencies** (APIs, databases)
4. **Use descriptive test names**
5. **Clean up test data** in afterEach/afterAll

---

## See Also

- Vitest Docs: https://vitest.dev
- Playwright Docs: https://playwright.dev
- Testing Library: https://testing-library.com
