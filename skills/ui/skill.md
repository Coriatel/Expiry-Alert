# UI — React Component Implementation with SCSS and Accessibility

## Purpose

This skill guides you through creating accessible React components with SCSS styling, following modern best practices for functional components, hooks, semantic HTML, and WCAG AA accessibility standards.

## When to Use This Skill

Use when:
- Creating a new React component (UI element, page, or layout)
- Building accessible, keyboard-navigable interfaces
- Implementing responsive designs with SCSS
- Adding interactive elements with proper state management

Do NOT use when:
- Working with class components (legacy codebases only)
- Building non-React UIs (Vue, Angular, etc.)
- Creating headless/API-only components

## Required Inputs

1. **Component Name**: PascalCase name (e.g., "UserCard", "NavigationMenu")
2. **Component Type**: Presentational, Container, or Page
3. **Props**: List of expected props with types (optional: use PropTypes or TypeScript)
4. **State Requirements**: Does it need local state, effects, or context?

**Defaults:**
- Component location: `src/components/{ComponentName}/`
- Styling: SCSS with BEM naming
- Accessibility: WCAG AA compliance

## Steps

### 1. Create Component Directory Structure

```bash
mkdir -p src/components/UserCard
touch src/components/UserCard/UserCard.jsx
touch src/components/UserCard/user-card.scss
touch src/components/UserCard/UserCard.test.jsx
```

**Note**: Use kebab-case for SCSS files, PascalCase for component files.

### 2. Create Base Component File

Create `src/components/UserCard/UserCard.jsx`:

```javascript
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './user-card.scss';

function UserCard({ userId, onUserClick }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleClick = () => {
    if (user && onUserClick) {
      onUserClick(user);
    }
  };

  if (loading) {
    return (
      <div className="user-card user-card--loading" role="status" aria-live="polite">
        <span className="user-card__loading-text">Loading user...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-card user-card--error" role="alert">
        <p className="user-card__error-message">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-card user-card--empty">
        <p>No user data available</p>
      </div>
    );
  }

  return (
    <article
      className="user-card"
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      role="button"
      tabIndex={0}
      aria-label={`User card for ${user.name}`}
    >
      <img
        src={user.avatar || '/default-avatar.png'}
        alt={`${user.name}'s avatar`}
        className="user-card__avatar"
      />
      <div className="user-card__content">
        <h3 className="user-card__name">{user.name}</h3>
        <p className="user-card__email">{user.email}</p>
        {user.role && (
          <span className="user-card__badge" aria-label={`Role: ${user.role}`}>
            {user.role}
          </span>
        )}
      </div>
    </article>
  );
}

UserCard.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onUserClick: PropTypes.func,
};

UserCard.defaultProps = {
  onUserClick: null,
};

export default UserCard;
```

### 3. Create SCSS Styling with BEM

Create `src/components/UserCard/user-card.scss`:

```scss
.user-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background-color: var(--color-background, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--border-radius, 0.5rem);
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  // Hover and focus states for accessibility
  &:hover {
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: 2px solid var(--color-focus, #3b82f6);
    outline-offset: 2px;
  }

  // Avatar element
  &__avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  // Content container
  &__content {
    flex: 1;
    min-width: 0; // Prevent overflow
  }

  // Name element
  &__name {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary, #111827);
  }

  // Email element
  &__email {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary, #6b7280);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // Badge modifier
  &__badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    color: var(--color-badge-text, #ffffff);
    background-color: var(--color-badge-bg, #3b82f6);
    border-radius: 9999px;
  }

  // Loading state modifier
  &--loading {
    justify-content: center;
    align-items: center;
    min-height: 120px;
    cursor: default;
  }

  &__loading-text {
    color: var(--color-text-secondary, #6b7280);
    font-style: italic;
  }

  // Error state modifier
  &--error {
    border-color: var(--color-error, #ef4444);
    background-color: var(--color-error-background, #fef2f2);
  }

  &__error-message {
    margin: 0;
    color: var(--color-error, #ef4444);
    font-weight: 500;
  }

  // Empty state modifier
  &--empty {
    opacity: 0.6;
    cursor: default;
  }

  // Responsive adjustments
  @media (max-width: 640px) {
    flex-direction: column;
    text-align: center;

    &__avatar {
      margin: 0 auto;
    }

    &__email {
      white-space: normal;
    }
  }

  // RTL support
  [dir='rtl'] & {
    text-align: right;
  }
}
```

### 4. Create Component Tests

Create `src/components/UserCard/UserCard.test.jsx`:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserCard from './UserCard';

describe('UserCard', () => {
  const mockUser = {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: '/avatars/alice.jpg',
    role: 'Admin',
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<UserCard userId={1} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading user/i)).toBeInTheDocument();
  });

  test('renders user data after fetch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    });

    render(<UserCard userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  test('renders error state on fetch failure', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    render(<UserCard userId={1} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  test('calls onUserClick when clicked', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    });

    const handleClick = jest.fn();
    render(<UserCard userId={1} onUserClick={handleClick} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const card = screen.getByRole('button');
    await userEvent.click(card);

    expect(handleClick).toHaveBeenCalledWith(mockUser);
  });

  test('is keyboard accessible', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    });

    const handleClick = jest.fn();
    render(<UserCard userId={1} onUserClick={handleClick} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledWith(mockUser);
  });

  test('has proper ARIA labels', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    });

    render(<UserCard userId={1} />);

    await waitFor(() => {
      const card = screen.getByLabelText(/user card for alice johnson/i);
      expect(card).toBeInTheDocument();
    });
  });
});
```

### 5. Import and Use Component

In your parent component or page (e.g., `src/pages/Users.jsx`):

```javascript
import UserCard from '../components/UserCard/UserCard';

function Users() {
  const handleUserClick = (user) => {
    console.log('User clicked:', user);
    // Navigate to user details, open modal, etc.
  };

  return (
    <div className="users-page">
      <h1>Team Members</h1>
      <div className="user-grid">
        <UserCard userId={1} onUserClick={handleUserClick} />
        <UserCard userId={2} onUserClick={handleUserClick} />
        <UserCard userId={3} onUserClick={handleUserClick} />
      </div>
    </div>
  );
}

export default Users;
```

### 6. Add Global CSS Variables (if not already defined)

Update `src/styles/variables.scss` or `src/index.scss`:

```scss
:root {
  // Colors
  --color-primary: #3b82f6;
  --color-background: #ffffff;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-error: #ef4444;
  --color-error-background: #fef2f2;
  --color-focus: #3b82f6;
  --color-badge-bg: #3b82f6;
  --color-badge-text: #ffffff;

  // Spacing
  --border-radius: 0.5rem;

  // Dark mode (optional)
  @media (prefers-color-scheme: dark) {
    --color-background: #1f2937;
    --color-border: #374151;
    --color-text-primary: #f9fafb;
    --color-text-secondary: #d1d5db;
  }
}
```

### 7. Run Component Tests

```bash
npm test -- UserCard.test.jsx
```

Expected output:
```
PASS  src/components/UserCard/UserCard.test.jsx
  UserCard
    ✓ renders loading state initially (45ms)
    ✓ renders user data after fetch (123ms)
    ✓ renders error state on fetch failure (98ms)
    ✓ calls onUserClick when clicked (156ms)
    ✓ is keyboard accessible (142ms)
    ✓ has proper ARIA labels (134ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

## Expected Outputs

After completing these steps, you will have:

1. **Component Directory**: `src/components/UserCard/`
2. **Component File**: `UserCard.jsx` (functional component with hooks)
3. **Styles**: `user-card.scss` (BEM naming, responsive, accessible)
4. **Tests**: `UserCard.test.jsx` (unit tests with accessibility checks)
5. **Integration**: Component imported and used in parent component

## Validation

### 1. Visual Check

Run the development server:
```bash
npm run dev
```

Navigate to the page using the component and verify:
- Component renders correctly
- Hover states work
- Responsive design adapts to mobile
- Dark mode works (if implemented)

### 2. Accessibility Check

Use browser DevTools (Lighthouse):
```bash
# Open DevTools → Lighthouse → Accessibility
```

Expected score: 90+ (WCAG AA compliance)

### 3. Keyboard Navigation

Test keyboard accessibility:
- Tab to component: Should show focus outline
- Press Enter: Should trigger onClick
- Screen reader: Should announce ARIA labels

### 4. Test Coverage

```bash
npm test -- --coverage UserCard.test.jsx
```

Expected coverage: 80%+ for component file

## Related Skills

- `/skills/tables/` — Sortable, filterable data tables
- `/skills/rtl-hebrew/` — RTL layout and Hebrew text
- `/skills/testing-e2e/` — End-to-end component testing
- `/skills/api-express/` — API endpoints for data fetching

## See Also

- [Cursor Rule: UI Patterns](../../.cursor/rules/020-ui-react-scss-a11y.md)
- [Cursor Rule: Code Style](../../.cursor/rules/010-code-style-js.md)
- [Details: React Best Practices](./details/README.md)
- [Details: Component Examples](./details/examples.md)
- [Details: Accessibility Checklist](./details/checklist.md)
- [Details: Common Mistakes](./details/anti-patterns.md)
- [React Documentation](https://react.dev/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

---

**Last Updated**: 2025-12-31
**React Version**: 18.2+
**Node Version**: 18+
**Maintained by**: Development Policy Library Project
