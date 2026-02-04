# UI — React, SCSS, and Accessibility

## React Patterns

### Functional Components with Hooks
```javascript
// ✅ DO: Functional components
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}

// ❌ DON'T: Class components (unless legacy)
class UserProfile extends React.Component {
  // Avoid for new code
}
```

### Common Hooks Usage

#### useState
```javascript
// ✅ DO: Descriptive state names
const [isModalOpen, setIsModalOpen] = useState(false);
const [formData, setFormData] = useState({ name: '', email: '' });

// ❌ DON'T: Generic names
const [state, setState] = useState(false);
```

#### useEffect
```javascript
// ✅ DO: Specify dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ✅ DO: Cleanup side effects
useEffect(() => {
  const timer = setTimeout(() => setShow(true), 1000);
  return () => clearTimeout(timer);
}, []);

// ❌ DON'T: Missing dependencies (or empty array when should have deps)
useEffect(() => {
  fetchData(userId);
}, []); // ❌ Missing userId!
```

#### useMemo and useCallback
```javascript
// ✅ DO: Memoize expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.price - b.price);
}, [items]);

// ✅ DO: Memoize callbacks passed to children
const handleClick = useCallback(() => {
  doSomething(userId);
}, [userId]);
```

### Custom Hooks
```javascript
// ✅ DO: Extract reusable logic into custom hooks
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchInput() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch);
    }
  }, [debouncedSearch]);
}
```

### Component Structure

#### Recommended File Structure
```
components/
├── Button/
│   ├── Button.jsx
│   ├── Button.test.jsx
│   └── button.scss
├── UserCard/
│   ├── UserCard.jsx
│   ├── UserCard.test.jsx
│   └── user-card.scss
└── Layout/
    ├── Layout.jsx
    └── layout.scss
```

#### Component Template
```javascript
import PropTypes from 'prop-types';
import './component-name.scss';

function ComponentName({ prop1, prop2, onAction }) {
  // Hooks
  const [state, setState] = useState(null);

  // Event handlers
  const handleClick = () => {
    onAction?.();
  };

  // Render
  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
}

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
  onAction: PropTypes.func,
};

ComponentName.defaultProps = {
  prop2: 0,
};

export default ComponentName;
```

## SCSS Best Practices

### BEM Naming Convention (Recommended)
```scss
// Block
.user-card {
  padding: 1rem;

  // Element
  &__avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }

  &__name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  // Modifier
  &--highlighted {
    background-color: var(--color-highlight);
  }
}
```

### Variables and Theming
```scss
// ✅ DO: Use CSS custom properties for theming
:root {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-error: #ef4444;
  --spacing-unit: 0.25rem;
  --border-radius: 0.375rem;
}

.button {
  background-color: var(--color-primary);
  padding: calc(var(--spacing-unit) * 2);
  border-radius: var(--border-radius);
}
```

### Nesting (Keep Shallow)
```scss
// ✅ DO: Max 2-3 levels
.card {
  &__header {
    &__title {
      // This is getting deep - consider flattening
    }
  }
}

// ✅ BETTER: Flatten
.card {
  &__header {
    // ...
  }

  &__header-title {
    // ...
  }
}
```

### Responsive Design
```scss
// ✅ DO: Mobile-first approach
.container {
  padding: 1rem;

  // Tablet
  @media (min-width: 768px) {
    padding: 2rem;
  }

  // Desktop
  @media (min-width: 1024px) {
    padding: 3rem;
  }
}
```

### Mixins for Reusable Patterns
```scss
// ✅ DO: Create mixins for common patterns
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.button {
  @include flex-center;
}

.title {
  @include truncate-text;
}
```

## Accessibility (a11y)

### Semantic HTML
```jsx
// ✅ DO: Use semantic elements
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Title</h1>
    <p>Content</p>
  </article>
</main>

<footer>
  <p>&copy; 2025</p>
</footer>

// ❌ DON'T: Use divs for everything
<div className="header">
  <div className="nav">
    <div className="link">Home</div>
  </div>
</div>
```

### ARIA Labels and Roles
```jsx
// ✅ DO: Add aria-label for icon-only buttons
<button aria-label="Close dialog">
  <CloseIcon />
</button>

// ✅ DO: Use aria-labelledby for complex labels
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
</div>

// ✅ DO: Mark decorative images
<img src="decoration.png" alt="" role="presentation" />
```

### Keyboard Navigation
```jsx
// ✅ DO: Ensure all interactive elements are keyboard accessible
function Dropdown({ options, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'ArrowDown') setSelectedIndex(i => Math.min(i + 1, options.length - 1));
    if (e.key === 'ArrowUp') setSelectedIndex(i => Math.max(i - 1, 0));
    if (e.key === 'Enter') {
      onSelect(options[selectedIndex]);
      setIsOpen(false);
    }
  };

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ... */}
    </div>
  );
}
```

### Focus Management
```jsx
// ✅ DO: Manage focus for modals and dialogs
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
```

### Color Contrast
```scss
// ✅ DO: Ensure WCAG AA contrast (4.5:1 for text)
.button {
  background-color: #2563eb; // Blue
  color: #ffffff; // White (passes contrast check)
}

// ❌ DON'T: Low contrast
.button {
  background-color: #dbeafe; // Light blue
  color: #ffffff; // White (fails contrast check)
}
```

### Form Accessibility
```jsx
// ✅ DO: Associate labels with inputs
<div className="form-field">
  <label htmlFor="email-input">Email Address</label>
  <input
    id="email-input"
    type="email"
    aria-required="true"
    aria-describedby="email-error"
  />
  <span id="email-error" role="alert">
    {error}
  </span>
</div>
```

## Loading and Error States

### Loading States
```jsx
// ✅ DO: Show loading indicators
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  if (loading) {
    return (
      <div className="loading" role="status" aria-live="polite">
        <span>Loading users...</span>
      </div>
    );
  }

  return <div>{users.map(user => <UserCard key={user.id} {...user} />)}</div>;
}
```

### Error States
```jsx
// ✅ DO: Display user-friendly error messages
function UserProfile({ userId }) {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <div className="error" role="alert">
        <h2>Unable to Load Profile</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
}
```

### Empty States
```jsx
// ✅ DO: Handle empty data gracefully
function ItemList({ items }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>No items found</p>
        <button onClick={handleCreate}>Create First Item</button>
      </div>
    );
  }
}
```

## Performance Optimization

### React.memo
```javascript
// ✅ DO: Memoize expensive components
const UserCard = React.memo(function UserCard({ user }) {
  return <div>{user.name}</div>;
});

// Only re-render if userId changes
const MemoizedCard = React.memo(UserCard, (prev, next) => {
  return prev.user.id === next.user.id;
});
```

### Lazy Loading
```javascript
// ✅ DO: Code-split large routes
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

## Anti-Patterns to Avoid

```jsx
// ❌ DON'T: Inline function definitions in JSX (causes re-renders)
<button onClick={() => handleClick(id)}>Click</button>

// ✅ DO: Use useCallback or define outside render
const handleClick = useCallback(() => doSomething(id), [id]);
<button onClick={handleClick}>Click</button>
```

```jsx
// ❌ DON'T: Mutate state directly
const [items, setItems] = useState([]);
items.push(newItem); // NO!

// ✅ DO: Create new array
setItems([...items, newItem]);
```

---

**Related Skills**:
- `/skills/ui/` — UI component implementation guide
- `/skills/tables/` — Table component patterns
- `/skills/rtl-hebrew/` — RTL UI implementation

**See Also**:
- [030-rtl-hebrew.md](./030-rtl-hebrew.md)
- [040-tables-forms.md](./040-tables-forms.md)
