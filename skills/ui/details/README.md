# UI — React Components with SCSS and Accessibility — Theory and Best Practices

## Table of Contents

1. [Overview](#overview)
2. [React Functional Components](#react-functional-components)
3. [React Hooks Deep Dive](#react-hooks-deep-dive)
4. [Component Architecture Patterns](#component-architecture-patterns)
5. [SCSS and Styling Best Practices](#scss-and-styling-best-practices)
6. [BEM Methodology](#bem-methodology)
7. [Accessibility Fundamentals](#accessibility-fundamentals)
8. [WCAG AA Compliance](#wcag-aa-compliance)
9. [Keyboard Navigation](#keyboard-navigation)
10. [Screen Reader Support](#screen-reader-support)
11. [Responsive Design](#responsive-design)
12. [Performance Optimization](#performance-optimization)
13. [State Management Strategies](#state-management-strategies)
14. [Testing Strategies](#testing-strategies)
15. [Common Patterns](#common-patterns)

---

## Overview

Modern React development emphasizes functional components, hooks, accessibility, and maintainable styling. This guide provides comprehensive theory and best practices for building production-quality React UIs.

**Core Principles:**
- **Functional over class**: Use hooks, not lifecycle methods
- **Accessibility first**: WCAG AA compliance is non-negotiable
- **Semantic HTML**: Use appropriate elements for meaning
- **Modular styles**: Component-scoped SCSS with BEM naming
- **Type safety**: PropTypes or TypeScript for all components
- **Testability**: Design for testability from the start

---

## React Functional Components

### Why Functional Components?

Functional components with hooks are now the standard in React. They offer:

1. **Simpler syntax**: No `this` binding, no constructor boilerplate
2. **Better reusability**: Custom hooks extract logic easily
3. **Easier testing**: Pure functions are easier to test
4. **Better performance**: Less overhead than class components
5. **Future-proof**: React team focuses on functional patterns

### Component Structure

A well-structured functional component follows this pattern:

```javascript
// 1. Imports
import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import './component-name.scss';

// 2. Component function
function ComponentName({ prop1, prop2, onAction }) {
  // 3. Hooks (always at top, same order)
  const [state, setState] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // 4. Memoized values
  const computedValue = useMemo(() => {
    return expensiveCalculation(state);
  }, [state]);

  // 5. Event handlers
  const handleClick = useCallback(() => {
    onAction?.(state);
  }, [onAction, state]);

  // 6. Conditional rendering logic
  if (loading) return <LoadingSpinner />;

  // 7. Main render
  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
}

// 8. PropTypes
ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
  onAction: PropTypes.func,
};

// 9. Default props
ComponentName.defaultProps = {
  prop2: 0,
  onAction: null,
};

// 10. Export
export default ComponentName;
```

### Rules of Hooks

React hooks must follow these rules:

1. **Call hooks at the top level**: Never in conditionals, loops, or nested functions
2. **Call hooks in the same order**: Ensures consistent state across renders
3. **Only call from React functions**: Components or custom hooks

**❌ Wrong:**
```javascript
function Component({ showExtra }) {
  const [name, setName] = useState('');

  if (showExtra) {
    const [extra, setExtra] = useState(''); // WRONG: Conditional hook
  }
}
```

**✅ Correct:**
```javascript
function Component({ showExtra }) {
  const [name, setName] = useState('');
  const [extra, setExtra] = useState('');

  // Use conditional rendering instead
  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} />
      {showExtra && <input value={extra} onChange={e => setExtra(e.target.value)} />}
    </div>
  );
}
```

---

## React Hooks Deep Dive

### useState

Manages local component state.

**Best Practices:**
- Use descriptive names: `isModalOpen`, `userList`, `formData`
- Initialize with correct type: `useState([])`, `useState({})`
- Use functional updates when new state depends on old state

```javascript
// ❌ Direct update (can cause race conditions)
setCount(count + 1);

// ✅ Functional update (safe)
setCount(prevCount => prevCount + 1);
```

**Complex state**: Use multiple `useState` calls or `useReducer` for related values.

```javascript
// ❌ One large state object
const [state, setState] = useState({
  name: '',
  email: '',
  loading: false,
  error: null,
});

// ✅ Separate concerns
const [formData, setFormData] = useState({ name: '', email: '' });
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

### useEffect

Handles side effects (data fetching, subscriptions, DOM manipulation).

**Dependency Array Rules:**
- **Empty `[]`**: Runs once on mount
- **No array**: Runs after every render (usually wrong)
- **`[dep1, dep2]`**: Runs when dependencies change

```javascript
// Mount/unmount only
useEffect(() => {
  console.log('Component mounted');
  return () => console.log('Component unmounted');
}, []);

// Runs when userId changes
useEffect(() => {
  fetchUser(userId);
}, [userId]);
```

**Cleanup**: Return a function to clean up subscriptions, timers, or event listeners.

```javascript
useEffect(() => {
  const timer = setTimeout(() => setShow(true), 1000);
  return () => clearTimeout(timer); // Cleanup
}, []);

useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### useMemo

Memoizes expensive calculations.

**Use when:**
- Calculation is computationally expensive
- Result is used in render or as a dependency
- Prevents unnecessary re-calculations

```javascript
const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name));
}, [users]);
```

**Don't overuse**: Memoization has overhead. Profile before optimizing.

### useCallback

Memoizes callback functions.

**Use when:**
- Passing callback to child components (prevents re-renders)
- Using callback in useEffect dependencies

```javascript
const handleSubmit = useCallback((formData) => {
  submitToAPI(formData).then(setResult);
}, []); // No dependencies = same function reference

// Child component won't re-render unnecessarily
<ChildComponent onSubmit={handleSubmit} />
```

### useRef

Creates a mutable reference that persists across renders.

**Use cases:**
1. Accessing DOM elements
2. Storing mutable values that don't trigger re-renders
3. Storing previous values

```javascript
// DOM access
const inputRef = useRef(null);
useEffect(() => {
  inputRef.current.focus();
}, []);

<input ref={inputRef} />

// Previous value
const prevCountRef = useRef();
useEffect(() => {
  prevCountRef.current = count;
});
const prevCount = prevCountRef.current;
```

### Custom Hooks

Extract reusable logic into custom hooks.

**Naming**: Start with `use` (e.g., `useFetch`, `useDebounce`)

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const response = await fetch(url);
        const result = await response.json();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true; // Prevent state updates after unmount
    };
  }, [url]);

  return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{user.name}</div>;
}
```

---

## Component Architecture Patterns

### Presentational vs Container Components

**Presentational (Dumb) Components:**
- Focus on how things look
- Receive data via props
- No state management (or minimal UI state)
- Highly reusable

```javascript
function Button({ label, onClick, variant = 'primary' }) {
  return (
    <button className={`button button--${variant}`} onClick={onClick}>
      {label}
    </button>
  );
}
```

**Container (Smart) Components:**
- Focus on how things work
- Manage state and side effects
- Fetch data, handle business logic
- Compose presentational components

```javascript
function UserListContainer() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  return <UserList users={users} loading={loading} />;
}
```

### Compound Components

Components that work together to form a cohesive API.

```javascript
function Tabs({ children }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="tabs">
      {React.Children.map(children, (child, index) =>
        React.cloneElement(child, {
          isActive: index === activeTab,
          onClick: () => setActiveTab(index),
        })
      )}
    </div>
  );
}

function Tab({ label, isActive, onClick, children }) {
  return (
    <div className={`tab ${isActive ? 'tab--active' : ''}`}>
      <button onClick={onClick}>{label}</button>
      {isActive && <div className="tab__content">{children}</div>}
    </div>
  );
}

// Usage
<Tabs>
  <Tab label="Profile">Profile content</Tab>
  <Tab label="Settings">Settings content</Tab>
</Tabs>
```

### Render Props

Share code using a prop whose value is a function.

```javascript
function DataProvider({ url, render }) {
  const { data, loading, error } = useFetch(url);
  return render({ data, loading, error });
}

// Usage
<DataProvider
  url="/api/users"
  render={({ data, loading, error }) => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error</div>;
    return <UserList users={data} />;
  }}
/>
```

---

## SCSS and Styling Best Practices

### Component-Scoped Styles

Each component should have its own SCSS file.

**File structure:**
```
components/
├── Button/
│   ├── Button.jsx
│   └── button.scss
├── Card/
│   ├── Card.jsx
│   └── card.scss
```

**Import in component:**
```javascript
import './button.scss';
```

### CSS Variables for Theming

Use CSS custom properties for dynamic theming.

```scss
// _variables.scss
:root {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --spacing-unit: 0.25rem;
  --font-size-base: 16px;
  --border-radius: 0.375rem;

  // Dark mode
  @media (prefers-color-scheme: dark) {
    --color-primary: #60a5fa;
    --color-background: #1f2937;
  }
}

// Component usage
.button {
  background-color: var(--color-primary);
  padding: calc(var(--spacing-unit) * 2);
  border-radius: var(--border-radius);
}
```

### Nesting Strategy

Keep nesting shallow (max 2-3 levels).

**❌ Too deep:**
```scss
.card {
  .card__header {
    .card__title {
      .card__icon {
        // Too nested
      }
    }
  }
}
```

**✅ Flattened:**
```scss
.card {
  &__header { }
  &__title { }
  &__icon { }
}
```

### Mixins for Reusability

```scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@mixin button-base {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:focus {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
}

.button {
  @include button-base;
  @include flex-center;
  background-color: var(--color-primary);
  color: white;
}
```

---

## BEM Methodology

BEM (Block Element Modifier) provides a clear naming convention.

### Structure

```
.block { }           // Component
.block__element { }  // Part of component
.block--modifier { } // Variation of component
```

### Real-World Example

```scss
// Block
.user-card {
  padding: 1rem;
  background: white;

  // Elements
  &__avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }

  &__name {
    font-weight: 600;
  }

  &__email {
    color: #6b7280;
  }

  // Modifiers
  &--featured {
    border: 2px solid gold;
  }

  &--compact {
    padding: 0.5rem;

    .user-card__avatar {
      width: 32px;
      height: 32px;
    }
  }
}
```

**HTML:**
```jsx
<div className="user-card user-card--featured">
  <img src="..." className="user-card__avatar" />
  <h3 className="user-card__name">Alice</h3>
  <p className="user-card__email">alice@example.com</p>
</div>
```

---

## Accessibility Fundamentals

### Why Accessibility Matters

1. **Legal compliance**: ADA, Section 508, WCAG requirements
2. **Inclusive design**: 15% of world population has disabilities
3. **Better UX for all**: Keyboard navigation, clear labels benefit everyone
4. **SEO benefits**: Semantic HTML improves search rankings

### WCAG Levels

- **Level A**: Minimum (basic accessibility)
- **Level AA**: Mid-range (target for most sites) ← **Our standard**
- **Level AAA**: Highest (gold standard, difficult to achieve)

---

## WCAG AA Compliance

### Color Contrast

**Ratios required:**
- Normal text (< 18pt): 4.5:1
- Large text (≥ 18pt or 14pt bold): 3:1
- UI components and graphics: 3:1

**Tools:**
- Chrome DevTools (Lighthouse)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

```scss
// ❌ Insufficient contrast (2.5:1)
.button {
  background: #93c5fd; // Light blue
  color: #ffffff; // White
}

// ✅ Sufficient contrast (4.6:1)
.button {
  background: #3b82f6; // Darker blue
  color: #ffffff; // White
}
```

### Semantic HTML

Use elements that convey meaning.

**❌ Non-semantic:**
```jsx
<div onClick={handleClick}>Click me</div>
<div className="heading">Page Title</div>
<div className="list">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

**✅ Semantic:**
```jsx
<button onClick={handleClick}>Click me</button>
<h1>Page Title</h1>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

### ARIA Attributes

Use ARIA when HTML semantics aren't enough.

**Common ARIA attributes:**
- `role`: Defines element type (button, dialog, alert)
- `aria-label`: Provides accessible name
- `aria-labelledby`: References another element for label
- `aria-describedby`: Provides additional description
- `aria-live`: Announces dynamic content changes
- `aria-expanded`: Indicates expandable state
- `aria-hidden`: Hides from screen readers

```jsx
// Icon button (no text)
<button aria-label="Close dialog" onClick={onClose}>
  <CloseIcon />
</button>

// Modal dialog
<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Confirm Deletion</h2>
  <p>Are you sure?</p>
</div>

// Live region for dynamic content
<div role="status" aria-live="polite">
  {statusMessage}
</div>
```

---

## Keyboard Navigation

### Focus Management

All interactive elements must be keyboard accessible.

**Default focusable elements:**
- `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`

**Making non-interactive elements focusable:**
```jsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Custom Button
</div>
```

**Focus styles:**
```scss
.button {
  &:focus {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  // Don't remove outline without replacement!
  // &:focus { outline: none; } ← NEVER do this
}
```

### Keyboard Event Handling

```javascript
function Dropdown({ options, onSelect }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ': // Space
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Dropdown UI */}
    </div>
  );
}
```

### Focus Trapping in Modals

Keep focus within modal when open.

```javascript
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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }

    // Trap Tab key
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="modal"
    >
      {children}
    </div>
  );
}
```

---

## Screen Reader Support

### Alternative Text for Images

```jsx
// Informative image
<img src="logo.png" alt="Company Name Logo" />

// Decorative image
<img src="decoration.png" alt="" role="presentation" />

// Complex image (chart, diagram)
<img
  src="sales-chart.png"
  alt="Sales chart showing 20% increase in Q4"
  aria-describedby="chart-description"
/>
<div id="chart-description" className="sr-only">
  Detailed sales data: Q1: $100k, Q2: $120k, Q3: $115k, Q4: $138k
</div>
```

### Screen Reader Only Text

```scss
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

```jsx
<button>
  <TrashIcon />
  <span className="sr-only">Delete user</span>
</button>
```

### Live Regions

Announce dynamic content changes.

```jsx
function SearchResults({ query, results, loading }) {
  return (
    <div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {loading && 'Searching...'}
        {!loading && `Found ${results.length} results for "${query}"`}
      </div>
      <ul>
        {results.map(result => <li key={result.id}>{result.name}</li>)}
      </ul>
    </div>
  );
}
```

---

## Responsive Design

### Mobile-First Approach

Start with mobile styles, add complexity for larger screens.

```scss
.card {
  // Mobile (default)
  padding: 1rem;
  font-size: 0.875rem;

  // Tablet
  @media (min-width: 768px) {
    padding: 1.5rem;
    font-size: 1rem;
  }

  // Desktop
  @media (min-width: 1024px) {
    padding: 2rem;
    font-size: 1.125rem;
  }
}
```

### Breakpoints

Standard breakpoints:
```scss
$breakpoint-sm: 640px;  // Mobile landscape
$breakpoint-md: 768px;  // Tablet
$breakpoint-lg: 1024px; // Desktop
$breakpoint-xl: 1280px; // Large desktop
```

### Responsive Utilities

```scss
// Hide on mobile
.hide-mobile {
  @media (max-width: 767px) {
    display: none;
  }
}

// Show only on mobile
.show-mobile {
  @media (min-width: 768px) {
    display: none;
  }
}
```

---

## Performance Optimization

### React.memo

Prevent unnecessary re-renders of functional components.

```javascript
const UserCard = React.memo(function UserCard({ user }) {
  return <div>{user.name}</div>;
});

// Custom comparison
const UserCard = React.memo(
  function UserCard({ user }) {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return prevProps.user.id === nextProps.user.id;
  }
);
```

### Code Splitting

```javascript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Virtual Lists

For long lists, render only visible items.

```javascript
import { FixedSizeList } from 'react-window';

function UserList({ users }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <UserCard user={users[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={users.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## State Management Strategies

### Local State (useState)

Use for component-specific UI state.

```javascript
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // ... component logic
}
```

### Lifting State Up

Share state between components via common parent.

```javascript
function Parent() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <>
      <UserList onSelectUser={setSelectedUser} />
      <UserDetails user={selectedUser} />
    </>
  );
}
```

### Context API

Share state across component tree without prop drilling.

```javascript
const UserContext = createContext();

function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (credentials) => {
    const userData = await api.login(credentials);
    setUser(userData);
  };

  const logout = () => setUser(null);

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

// Usage
function Profile() {
  const { user, logout } = useContext(UserContext);
  return <div>{user.name} <button onClick={logout}>Logout</button></div>;
}
```

### useReducer

For complex state logic.

```javascript
const initialState = { count: 0, step: 1 };

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'setStep':
      return { ...state, step: action.payload };
    case 'reset':
      return initialState;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  );
}
```

---

## Testing Strategies

### Unit Tests with React Testing Library

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('renders user profile', async () => {
  render(<UserProfile userId={1} />);

  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});

test('handles user interaction', async () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Accessibility Testing

```javascript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component has no accessibility violations', async () => {
  const { container } = render(<UserCard userId={1} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Common Patterns

See [examples.md](./examples.md) for detailed code examples.

**Patterns covered:**
1. Data fetching with loading/error states
2. Form handling with validation
3. Modal dialogs with focus management
4. Dropdown menus with keyboard navigation
5. Infinite scroll / pagination
6. Drag and drop
7. Toast notifications
8. Dark mode toggle

---

## Conclusion

Building accessible, performant React components requires:
- Functional components with hooks
- Semantic HTML and ARIA
- BEM-structured SCSS
- Keyboard navigation
- Comprehensive testing

Follow these principles to create production-quality UIs.

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintained by**: Development Policy Library Project
