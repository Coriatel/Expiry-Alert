# RTL & Hebrew-First UI Policies

## Core Principle: Design RTL-First

**Always design and implement for RTL (right-to-left) as the default.** LTR (left-to-right) should be the adaptation, not the other way around.

## Hebrew Typography

### Font Selection
```scss
:root {
  // ✅ DO: Use fonts that support Hebrew properly
  --font-primary: 'Rubik', 'Heebo', 'Assistant', system-ui, sans-serif;

  // Common Hebrew-friendly fonts:
  // - Rubik (modern, clean)
  // - Heebo (versatile)
  // - Assistant (friendly)
  // - Alef (traditional)
  // - Open Sans Hebrew
}

body {
  font-family: var(--font-primary);
}
```

### Font Size and Line Height
```scss
// ✅ DO: Adjust for Hebrew readability
:root[dir="rtl"] {
  // Hebrew often needs slightly larger font size
  --font-size-base: 16px;
  --line-height-base: 1.6; // More breathing room for Hebrew
}

// Arabic might need even more
:root[lang="ar"] {
  --line-height-base: 1.7;
}
```

### Text Rendering
```scss
// ✅ DO: Optimize Hebrew text rendering
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

## RTL Layout Implementation

### Setting Document Direction
```html
<!-- ✅ DO: Set dir and lang on root element -->
<html dir="rtl" lang="he">
  <head>
    <meta charset="UTF-8">
    <title>אפליקציה שלי</title>
  </head>
  <body>
    <!-- Content -->
  </body>
</html>
```

```javascript
// ✅ DO: Set direction dynamically based on language
function App() {
  const { i18n } = useTranslation();
  const direction = i18n.language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [i18n.language, direction]);

  return <div>{/* App content */}</div>;
}
```

### RTL-Aware Styling

#### Using Logical Properties (Recommended)
```scss
// ✅ DO: Use logical properties for automatic RTL flipping
.card {
  margin-inline-start: 1rem;  // Left in LTR, Right in RTL
  margin-inline-end: 2rem;    // Right in LTR, Left in RTL
  padding-inline: 1rem;       // Horizontal padding
  border-inline-start: 2px solid blue; // Left border in LTR
}

// Maps to:
// LTR: margin-left: 1rem; margin-right: 2rem;
// RTL: margin-right: 1rem; margin-left: 2rem;
```

#### Manual RTL Overrides
```scss
// ✅ DO: Use [dir="rtl"] selector when logical properties aren't enough
.header {
  text-align: left;

  [dir="rtl"] & {
    text-align: right;
  }
}

// ✅ BETTER: Use logical values
.header {
  text-align: start; // Automatically left in LTR, right in RTL
}
```

#### Common RTL Adjustments
```scss
// Icons that should flip in RTL
.icon-arrow {
  transform: rotate(0deg);

  [dir="rtl"] & {
    transform: scaleX(-1); // Flip horizontally
  }
}

// Flexbox in RTL
.flex-container {
  display: flex;
  justify-content: flex-start; // Automatically flips

  // If you need explicit control:
  [dir="rtl"] & {
    flex-direction: row-reverse; // Only if needed
  }
}
```

## Handling Mixed Content (LTR in RTL)

### Isolating LTR Content
```jsx
// ✅ DO: Wrap LTR content in RTL context
function UserProfile({ user }) {
  return (
    <div className="profile">
      <h2>{user.name}</h2> {/* Hebrew */}

      {/* Email is LTR - isolate it */}
      <div dir="ltr" className="email">
        {user.email}
      </div>

      {/* Phone numbers, URLs, etc. */}
      <div dir="ltr" className="phone">
        {user.phone}
      </div>
    </div>
  );
}
```

### Unicode Bidirectional Markers
```javascript
// ✅ DO: Use bidi markers for inline mixed content
const LRM = '\u200E'; // Left-to-right mark
const RLM = '\u200F'; // Right-to-left mark

function formatEmail(email) {
  // Ensure email doesn't break RTL flow
  return `${RLM}${email}${RLM}`;
}

function UserGreeting({ name, email }) {
  return (
    <p>
      שלום {name}, הדוא״ל שלך: {LRM}{email}{LRM}
    </p>
  );
}
```

### CSS for Mixed Content
```scss
// ✅ DO: Style LTR islands in RTL context
.ltr-content {
  direction: ltr;
  text-align: left;
  unicode-bidi: embed; // Isolate bidi context
}

// For inline LTR
.inline-ltr {
  unicode-bidi: bidi-override;
  direction: ltr;
  display: inline-block;
}
```

## Tables in RTL

### Table Direction
```jsx
// ✅ DO: Let table inherit RTL automatically
function DataTable({ data }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>שם</th>      {/* Rightmost in RTL */}
          <th>דוא״ל</th>
          <th>תפקיד</th>    {/* Leftmost in RTL */}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td dir="ltr">{row.email}</td> {/* Isolate email */}
            <td>{row.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Table Styling
```scss
.data-table {
  width: 100%;

  th, td {
    padding-inline: 1rem; // Logical padding
    text-align: start;    // Right in RTL, left in LTR

    &.numeric {
      // Numbers should stay LTR
      direction: ltr;
      text-align: end; // Left-aligned in RTL context
    }
  }

  // Borders in RTL
  td {
    border-inline-start: 1px solid #e5e7eb;
  }
}
```

## Forms in RTL

### Form Layout
```jsx
// ✅ DO: Design forms for RTL
function LoginForm() {
  return (
    <form className="login-form">
      <div className="form-field">
        <label htmlFor="email">דוא״ל</label>
        <input
          id="email"
          type="email"
          dir="ltr" // Email input should be LTR
          placeholder="user@example.com"
        />
      </div>

      <div className="form-field">
        <label htmlFor="password">סיסמה</label>
        <input
          id="password"
          type="password"
        />
      </div>

      <button type="submit">התחבר</button>
    </form>
  );
}
```

### Form Styling
```scss
.form-field {
  margin-block-end: 1rem;

  label {
    display: block;
    margin-block-end: 0.5rem;
    text-align: start; // Right in RTL
  }

  input, select, textarea {
    width: 100%;
    padding-inline: 0.75rem; // Logical padding
    text-align: start;

    // Placeholder should inherit direction
    &::placeholder {
      text-align: start;
    }
  }

  // Icons in inputs
  &.with-icon input {
    padding-inline-start: 2.5rem; // Space for icon on the right in RTL
  }

  .icon {
    position: absolute;
    inset-inline-start: 0.75rem; // Right side in RTL
  }
}
```

## Icons and Images

### Flipping Icons
```scss
// ✅ DO: Flip directional icons
.icon-chevron-right,
.icon-arrow-forward,
.icon-next {
  [dir="rtl"] & {
    transform: scaleX(-1);
  }
}

// ✅ DON'T flip: Non-directional icons
.icon-user,
.icon-settings,
.icon-calendar {
  // These don't need flipping
}
```

### Image Positioning
```scss
.avatar {
  float: inline-start; // Right in RTL, left in LTR
  margin-inline-end: 1rem; // Space after avatar
}
```

## Navigation and Menus

### Horizontal Navigation
```jsx
// ✅ DO: Navigation automatically reverses in RTL
function Navigation() {
  return (
    <nav className="main-nav">
      <ul>
        <li><a href="/">בית</a></li>
        <li><a href="/about">אודות</a></li>
        <li><a href="/contact">צור קשר</a></li>
      </ul>
    </nav>
  );
}
```

```scss
.main-nav ul {
  display: flex;
  gap: 2rem;
  justify-content: flex-start; // Right in RTL

  li {
    // No need for direction overrides with flexbox
  }
}
```

### Dropdown Menus
```scss
.dropdown {
  position: relative;

  &__menu {
    position: absolute;
    top: 100%;
    inset-inline-start: 0; // Opens from right in RTL

    // If menu should align to the end:
    inset-inline-start: auto;
    inset-inline-end: 0; // Opens from left in RTL
  }
}
```

## Animations and Transitions

### Sliding Animations
```scss
// ✅ DO: Use logical properties or CSS variables
@keyframes slide-in {
  from {
    transform: translateX(var(--slide-direction, 100%));
  }
  to {
    transform: translateX(0);
  }
}

:root {
  --slide-direction: 100%; // From right in LTR
}

[dir="rtl"] {
  --slide-direction: -100%; // From left in RTL
}

// ✅ ALTERNATIVE: Separate animations
@keyframes slide-in-ltr {
  from { transform: translateX(100%); }
}

@keyframes slide-in-rtl {
  from { transform: translateX(-100%); }
}

.panel {
  animation: slide-in-ltr 0.3s;

  [dir="rtl"] & {
    animation: slide-in-rtl 0.3s;
  }
}
```

## Internationalization (i18n)

### Setup with react-i18next
```javascript
// i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: require('./locales/he.json') },
    en: { translation: require('./locales/en.json') },
  },
  lng: 'he', // Default to Hebrew
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

### Translation Files Structure
```json
// locales/he.json
{
  "common": {
    "submit": "שלח",
    "cancel": "ביטול",
    "save": "שמור",
    "delete": "מחק"
  },
  "auth": {
    "login": "התחברות",
    "register": "הרשמה",
    "email": "דוא״ל",
    "password": "סיסמה"
  },
  "errors": {
    "required": "שדה חובה",
    "invalid_email": "דוא״ל לא תקין"
  }
}
```

### Using Translations
```jsx
import { useTranslation } from 'react-i18next';

function LoginPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('auth.login')}</h1>
      <button>{t('common.submit')}</button>
    </div>
  );
}
```

## Testing RTL Layout

### Visual Checklist
- [ ] Text alignment is correct (right-aligned for Hebrew)
- [ ] Navigation menu items flow from right to left
- [ ] Icons (arrows, chevrons) are flipped appropriately
- [ ] Form labels and inputs are aligned correctly
- [ ] Tables read from right to left
- [ ] Margins and paddings are mirrored
- [ ] Floating elements are on the correct side
- [ ] Dropdown menus open in the correct direction
- [ ] Scroll bars appear on the left (browser default)
- [ ] Mixed LTR content (emails, URLs) is isolated properly

### Browser Testing
```javascript
// ✅ DO: Test direction switching dynamically
function TestDirectionSwitch() {
  const [dir, setDir] = useState('rtl');

  const toggleDirection = () => {
    const newDir = dir === 'rtl' ? 'ltr' : 'rtl';
    setDir(newDir);
    document.documentElement.dir = newDir;
  };

  return <button onClick={toggleDirection}>Toggle RTL/LTR</button>;
}
```

## Common RTL Pitfalls

### ❌ DON'T: Hardcode directional values
```scss
// ❌ BAD
.card {
  margin-left: 1rem;
  text-align: left;
  float: right;
}

// ✅ GOOD
.card {
  margin-inline-start: 1rem;
  text-align: start;
  float: inline-end;
}
```

### ❌ DON'T: Forget to isolate LTR content
```jsx
// ❌ BAD: Email breaks RTL flow
<p>הדוא״ל: user@example.com לקבלת עדכונים</p>

// ✅ GOOD: Isolate email
<p>
  הדוא״ל: <span dir="ltr">user@example.com</span> לקבלת עדכונים
</p>
```

### ❌ DON'T: Assume CSS frameworks handle RTL
```scss
// ❌ Many frameworks (Bootstrap, Tailwind) need RTL builds
// Check documentation for RTL support

// ✅ Use RTL-specific builds when available
@import 'bootstrap/dist/css/bootstrap.rtl.min.css';
```

---

**Related Skills**:
- `/skills/rtl-hebrew/` — RTL implementation guide
- `/skills/ui/` — UI component patterns
- `/skills/tables/` — RTL table implementation

**See Also**:
- [020-ui-react-scss-a11y.md](./020-ui-react-scss-a11y.md)
- [040-tables-forms.md](./040-tables-forms.md)

**Resources**:
- [RTL Styling 101](https://rtlstyling.com/)
- [CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [W3C: Structural markup and right-to-left text](https://www.w3.org/International/questions/qa-html-dir)
