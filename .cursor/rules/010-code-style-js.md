# Code Style — JavaScript/ES6+

## Language Selection

### JavaScript ONLY (Default)
- Use modern JavaScript (ES6+) for all code
- **NO TypeScript** unless explicitly required by project
- Use `.js` or `.jsx` extensions (React components)

### When TypeScript IS Required
If your project uses TypeScript:
- Use `.ts` or `.tsx` extensions
- Follow similar patterns adapted to TypeScript
- See project-specific overrides

## Modern ES6+ Features

### Prefer Modern Syntax
```javascript
// ✅ DO: Use const/let
const user = { name: 'Alice' };
let count = 0;

// ❌ DON'T: Use var
var user = { name: 'Alice' };
```

```javascript
// ✅ DO: Arrow functions
const add = (a, b) => a + b;

// ✅ ALSO OK: Named functions for clarity
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

```javascript
// ✅ DO: Destructuring
const { name, email } = user;
const [first, second, ...rest] = items;

// ✅ DO: Spread operator
const newUser = { ...user, role: 'admin' };
const allItems = [...items, newItem];
```

```javascript
// ✅ DO: Template literals
const message = `Hello, ${user.name}!`;

// ❌ DON'T: String concatenation
const message = 'Hello, ' + user.name + '!';
```

```javascript
// ✅ DO: Async/await
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// ❌ DON'T: Promise chains for simple flows
function fetchUser(id) {
  return fetch(`/api/users/${id}`)
    .then(response => response.json());
}
```

### Optional Chaining and Nullish Coalescing
```javascript
// ✅ DO: Optional chaining
const userName = user?.profile?.name;

// ✅ DO: Nullish coalescing
const displayName = userName ?? 'Guest';

// ❌ DON'T: Nested ternaries for null checks
const userName = user ? (user.profile ? user.profile.name : null) : null;
```

## Code Formatting

### Use Prettier (Recommended)
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

### Indentation and Spacing
- **2 spaces** for indentation (not tabs)
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line arrays/objects

### Line Length
- Maximum **100 characters** per line
- Break long lines logically

## Naming Conventions

### Variables and Functions
```javascript
// ✅ DO: camelCase for variables and functions
const userName = 'Alice';
function getUserById(id) { }

// ❌ DON'T: snake_case or PascalCase for variables
const user_name = 'Alice';
const UserName = 'Alice';
```

### Constants
```javascript
// ✅ DO: UPPER_SNAKE_CASE for true constants
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_COUNT = 3;

// ✅ ALSO OK: Regular camelCase for config objects
const apiConfig = {
  baseUrl: 'https://api.example.com',
  timeout: 5000,
};
```

### Classes and Components
```javascript
// ✅ DO: PascalCase for classes and React components
class UserService { }
function UserProfile() { }
```

### File Naming
- **React Components**: PascalCase — `UserProfile.jsx`
- **Utilities**: camelCase — `dateUtils.js`
- **Constants**: UPPER_SNAKE_CASE (if file exports only constants) — `API_ROUTES.js`
- **Styles**: kebab-case — `user-profile.scss`
- **Tests**: Match source file — `dateUtils.test.js`

## Comparison and Equality

```javascript
// ✅ DO: Strict equality
if (status === 'active') { }
if (count !== 0) { }

// ❌ DON'T: Loose equality
if (status == 'active') { }
```

## Imports and Exports

### ES6 Modules
```javascript
// ✅ DO: Named exports for utilities
export const formatDate = (date) => { };
export const parseDate = (str) => { };

// ✅ DO: Default export for components
export default function UserProfile() { }

// ✅ DO: Import destructuring
import { formatDate, parseDate } from './utils/dateUtils';
import UserProfile from './components/UserProfile';
```

### Import Order (Recommended)
```javascript
// 1. External dependencies
import React from 'react';
import { formatDistance } from 'date-fns';

// 2. Internal modules (absolute paths)
import { api } from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';

// 3. Relative imports
import Button from '../components/Button';
import './styles.scss';
```

## Error Handling

### Use Try-Catch for Async
```javascript
// ✅ DO: Wrap async operations
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error; // Re-throw if caller needs to handle
  }
}
```

### Throw Meaningful Errors
```javascript
// ✅ DO: Descriptive error messages
if (!userId) {
  throw new Error('User ID is required');
}

// ❌ DON'T: Generic errors
throw new Error('Invalid input');
```

## Comments and Documentation

### When to Comment
```javascript
// ✅ DO: Comment complex logic
// Calculate prorated amount based on days used in billing cycle
const proratedAmount = (totalAmount * daysUsed) / daysInCycle;

// ✅ DO: Document non-obvious decisions
// Using setTimeout instead of setInterval to prevent overlapping requests
setTimeout(pollStatus, POLL_INTERVAL);
```

### When NOT to Comment
```javascript
// ❌ DON'T: Comment obvious code
// Set the user name
const userName = user.name;

// ❌ DON'T: Leave commented-out code
// const oldFunction = () => { ... };
```

### JSDoc for Public APIs (Optional)
```javascript
/**
 * Fetches user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object>} User object
 * @throws {Error} If user not found
 */
async function getUserById(id) {
  // ...
}
```

## Type Checking (Without TypeScript)

### Use PropTypes for React
```javascript
import PropTypes from 'prop-types';

function UserCard({ name, email, role }) {
  return <div>{name}</div>;
}

UserCard.propTypes = {
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  role: PropTypes.oneOf(['admin', 'user']),
};
```

### Runtime Validation
```javascript
// ✅ DO: Validate at boundaries (API, user input)
function setUserAge(age) {
  if (typeof age !== 'number' || age < 0) {
    throw new Error('Age must be a positive number');
  }
  // ...
}
```

## Anti-Patterns to Avoid

```javascript
// ❌ DON'T: Mutate props or state directly
props.user.name = 'Alice'; // NO!
this.state.count = 5; // NO!

// ✅ DO: Create new objects/arrays
const updatedUser = { ...user, name: 'Alice' };
setState({ count: 5 });
```

```javascript
// ❌ DON'T: Nested callbacks (callback hell)
fetchUser(id, (user) => {
  fetchPosts(user.id, (posts) => {
    fetchComments(posts[0].id, (comments) => {
      // ...
    });
  });
});

// ✅ DO: Use async/await
const user = await fetchUser(id);
const posts = await fetchPosts(user.id);
const comments = await fetchComments(posts[0].id);
```

```javascript
// ❌ DON'T: Magic numbers
if (status === 2) { }

// ✅ DO: Named constants
const STATUS_ACTIVE = 2;
if (status === STATUS_ACTIVE) { }
```

## ESLint Configuration

### Recommended Base
```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  rules: {
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
```

## AI Assistant Instructions

When working with JavaScript code:
1. Always use modern ES6+ syntax
2. Prefer `const` over `let`, never use `var`
3. Use strict equality (`===`, `!==`)
4. Add PropTypes for React components
5. Use descriptive variable names (not `x`, `temp`, `data`)
6. Follow the file naming conventions
7. Add JSDoc for complex functions

---

**Related Skills**:
- `/skills/ui/` — React component patterns
- `/skills/api-express/` — Backend JavaScript patterns

**See Also**:
- [020-ui-react-scss-a11y.md](./020-ui-react-scss-a11y.md)
- [050-api-express.md](./050-api-express.md)
