# UI — React Components — Anti-Patterns

## Anti-Pattern 1: Using Class Components

### ❌ DON'T: Use class components for new code

```javascript
class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      loading: true,
    };
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    this.fetchUser();
  }

  fetchUser = async () => {
    // ...
  };

  handleClick() {
    // ...
  }

  render() {
    return <div>{this.state.user?.name}</div>;
  }
}
```

### ✅ DO: Use functional components with hooks

```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const data = await fetch(`/api/users/${userId}`).then((r) => r.json());
      setUser(data);
      setLoading(false);
    }
    fetchUser();
  }, [userId]);

  const handleClick = useCallback(() => {
    // ...
  }, []);

  return <div>{user?.name}</div>;
}
```

**Why**: Functional components are simpler, more performant, and align with modern React patterns.

---

## Anti-Pattern 2: Breaking Rules of Hooks

### ❌ DON'T: Call hooks conditionally

```javascript
function Component({ showExtra }) {
  const [name, setName] = useState('');

  if (showExtra) {
    const [email, setEmail] = useState(''); // ❌ Conditional hook!
  }

  return <div>{name}</div>;
}
```

### ✅ DO: Call hooks unconditionally at top level

```javascript
function Component({ showExtra }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // ✅ Always called

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      {showExtra && <input value={email} onChange={(e) => setEmail(e.target.value)} />}
    </div>
  );
}
```

**Why**: Hooks must be called in the same order every render for React to track state correctly.

---

## Anti-Pattern 3: Missing Dependency Arrays

### ❌ DON'T: Omit dependencies from useEffect

```javascript
function Component({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, []); // ❌ Missing userId dependency!

  return <div>{user?.name}</div>;
}
```

### ✅ DO: Include all dependencies

```javascript
function Component({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // ✅ Includes userId

  return <div>{user?.name}</div>;
}
```

**Why**: Missing dependencies cause stale closures and bugs. Use ESLint's `exhaustive-deps` rule.

---

## Anti-Pattern 4: Directly Mutating State

### ❌ DON'T: Mutate state directly

```javascript
function TodoList() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    todos.push({ id: Date.now(), text }); // ❌ Direct mutation!
    setTodos(todos);
  };

  return <div>{/* ... */}</div>;
}
```

### ✅ DO: Create new state objects

```javascript
function TodoList() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    setTodos([...todos, { id: Date.now(), text }]); // ✅ New array
  };

  return <div>{/* ... */}</div>;
}
```

**Why**: React relies on reference equality to detect changes. Mutations break this.

---

## Anti-Pattern 5: Non-Semantic HTML

### ❌ DON'T: Use divs for everything

```jsx
<div onClick={handleClick}>Click me</div>
<div className="heading">Page Title</div>
<div className="link" onClick={navigate}>
  Go to page
</div>
```

### ✅ DO: Use semantic elements

```jsx
<button onClick={handleClick}>Click me</button>
<h1>Page Title</h1>
<a href="/page" onClick={navigate}>
  Go to page
</a>
```

**Why**: Semantic HTML provides meaning, improves SEO, and enhances accessibility.

---

## Anti-Pattern 6: Missing ARIA Labels

### ❌ DON'T: Create inaccessible icon buttons

```jsx
<button onClick={onClose}>
  <CloseIcon />
</button>
```

### ✅ DO: Add aria-label for screen readers

```jsx
<button onClick={onClose} aria-label="Close dialog">
  <CloseIcon />
</button>
```

**Why**: Screen readers need text alternatives for icon-only buttons.

---

## Anti-Pattern 7: Poor Focus Management

### ❌ DON'T: Remove focus outlines without replacement

```scss
button:focus {
  outline: none; // ❌ Removes keyboard navigation indicator!
}
```

### ✅ DO: Provide custom focus styles

```scss
button:focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

// Or use :focus-visible for mouse vs keyboard
button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

**Why**: Keyboard users rely on focus indicators to navigate. Removing them breaks accessibility.

---

## Anti-Pattern 8: Insufficient Color Contrast

### ❌ DON'T: Use low-contrast text

```scss
.text {
  color: #999; // Light gray
  background: #fff; // White
  // Contrast ratio: 2.85:1 ❌ Fails WCAG AA (needs 4.5:1)
}
```

### ✅ DO: Ensure 4.5:1 contrast for text

```scss
.text {
  color: #666; // Darker gray
  background: #fff; // White
  // Contrast ratio: 5.74:1 ✅ Passes WCAG AA
}
```

**Why**: Low contrast makes text unreadable for users with visual impairments.

---

## Anti-Pattern 9: Inline Function Definitions in JSX

### ❌ DON'T: Define functions inline (causes re-renders)

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <Child onClick={() => setCount(count + 1)} />
      {/* ❌ New function created every render */}
    </div>
  );
}

const Child = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Click</button>;
});
```

### ✅ DO: Use useCallback

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []); // ✅ Stable function reference

  return (
    <div>
      <Child onClick={handleClick} />
    </div>
  );
}

const Child = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Click</button>;
});
```

**Why**: Inline functions create new references every render, breaking React.memo and causing unnecessary re-renders.

---

## Anti-Pattern 10: Not Handling Loading and Error States

### ❌ DON'T: Show nothing while loading or on error

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>; // ❌ Shows nothing while loading or on error
}
```

### ✅ DO: Handle all states explicitly

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div role="status">Loading...</div>;
  if (error) return <div role="alert">Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return <div>{user.name}</div>;
}
```

**Why**: Users need feedback during loading and errors. Blank screens are frustrating.

---

## Anti-Pattern 11: Hardcoded Styles

### ❌ DON'T: Hardcode colors and values

```scss
.button {
  background-color: #3b82f6; // ❌ Hardcoded
  padding: 12px; // ❌ Hardcoded
  border-radius: 6px; // ❌ Hardcoded
}
```

### ✅ DO: Use CSS custom properties

```scss
.button {
  background-color: var(--color-primary);
  padding: calc(var(--spacing-unit) * 3);
  border-radius: var(--border-radius);
}
```

**Why**: CSS variables enable theming, dark mode, and consistent design system values.

---

## Anti-Pattern 12: Deep SCSS Nesting

### ❌ DON'T: Nest deeply (hard to override, large CSS output)

```scss
.card {
  .card-header {
    .card-title {
      .card-icon {
        .icon-svg {
          // ❌ 5 levels deep!
        }
      }
    }
  }
}
```

### ✅ DO: Keep nesting shallow with BEM

```scss
.card {
  &__header {
  }
  &__title {
  }
  &__icon {
  }
  &__icon-svg {
  }
}
```

**Why**: Deep nesting increases specificity, makes styles harder to override, and bloats CSS output.

---

## Anti-Pattern 13: Not Cleaning Up useEffect

### ❌ DON'T: Forget cleanup functions

```javascript
function Timer() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000);
    // ❌ No cleanup! Interval continues after unmount
  }, []);

  return <div>{time}</div>;
}
```

### ✅ DO: Return cleanup function

```javascript
function Timer() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval); // ✅ Cleanup
  }, []);

  return <div>{time}</div>;
}
```

**Why**: Without cleanup, timers, subscriptions, and event listeners leak, causing memory leaks and bugs.

---

## Anti-Pattern 14: Prop Drilling

### ❌ DON'T: Pass props through many levels

```jsx
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }) {
  return <Header user={user} setUser={setUser} />;
}

function Header({ user, setUser }) {
  return <UserMenu user={user} setUser={setUser} />;
}

function UserMenu({ user, setUser }) {
  // Finally use it here
  return <div>{user.name}</div>;
}
```

### ✅ DO: Use Context API

```jsx
const UserContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Layout />
    </UserContext.Provider>
  );
}

function UserMenu() {
  const { user } = useContext(UserContext); // ✅ Direct access
  return <div>{user.name}</div>;
}
```

**Why**: Prop drilling makes code verbose, fragile, and hard to refactor.

---

## Anti-Pattern 15: Not Trapping Focus in Modals

### ❌ DON'T: Allow Tab to escape modal

```jsx
function Modal({ isOpen, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">{children}</div>
    </div>
  );
  // ❌ Tab key can focus elements behind modal
}
```

### ✅ DO: Trap focus within modal

```jsx
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
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

      if (e.key === 'Escape') {
        onClose();
      }
    };

    modalRef.current?.addEventListener('keydown', handleKeyDown);
    return () => modalRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="modal" role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

**Why**: Keyboard users should not be able to Tab to elements behind a modal.

---

## Conclusion

Avoid these anti-patterns by:

1. ✅ Use functional components with hooks
2. ✅ Follow hooks rules (top-level, same order)
3. ✅ Include all dependencies in useEffect
4. ✅ Never mutate state directly
5. ✅ Use semantic HTML
6. ✅ Add ARIA labels for accessibility
7. ✅ Maintain focus indicators
8. ✅ Ensure sufficient color contrast
9. ✅ Memoize callbacks (useCallback)
10. ✅ Handle loading, error, and empty states
11. ✅ Use CSS custom properties
12. ✅ Keep SCSS nesting shallow
13. ✅ Clean up effects (timers, subscriptions)
14. ✅ Use Context instead of prop drilling
15. ✅ Trap focus in modals

Following these practices creates accessible, performant, maintainable React components.

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintained by**: Development Policy Library Project
