# UI — React Components — Checklist

## Definition of Done

### File Structure

- [ ] Component directory created: `src/components/{ComponentName}/`
- [ ] Component file: `{ComponentName}.jsx` (PascalCase)
- [ ] Styles file: `{component-name}.scss` (kebab-case)
- [ ] Test file: `{ComponentName}.test.jsx`

---

## Functional Requirements

- [ ] Component renders without errors
- [ ] All required props are handled correctly
- [ ] Optional props have sensible defaults
- [ ] Loading states are displayed appropriately
- [ ] Error states are handled gracefully
- [ ] Empty states are meaningful
- [ ] Component can be reused in different contexts

---

## React Best Practices

- [ ] Uses functional component (not class component)
- [ ] Hooks are called at top level (no conditionals)
- [ ] Hooks are in consistent order
- [ ] `useState` for local UI state
- [ ] `useEffect` has proper dependency arrays
- [ ] `useEffect` cleanup functions where needed (timers, subscriptions)
- [ ] `useCallback` for callbacks passed to children
- [ ] `useMemo` for expensive calculations
- [ ] `useRef` for DOM access or mutable values
- [ ] PropTypes defined for all props
- [ ] Default props provided where appropriate
- [ ] No prop drilling (uses context if needed)

---

## Code Quality

- [ ] Component file is 50-300 lines (not monolithic)
- [ ] Complex logic extracted into custom hooks
- [ ] Descriptive variable and function names
- [ ] No console.log statements (use proper logging)
- [ ] No commented-out code
- [ ] Imports organized (React, third-party, local)
- [ ] Single responsibility (component does one thing well)

---

## SCSS Styling

- [ ] BEM naming convention used
- [ ] Styles scoped to component (no global pollution)
- [ ] CSS custom properties for theme values
- [ ] Nesting kept shallow (max 2-3 levels)
- [ ] Responsive design implemented (mobile-first)
- [ ] Hover states defined for interactive elements
- [ ] Focus states defined for keyboard navigation
- [ ] Transitions smooth (0.2s - 0.3s)
- [ ] No hardcoded colors (use CSS variables)
- [ ] RTL support considered (`[dir='rtl']` if needed)

---

## Accessibility (WCAG AA)

### Semantic HTML

- [ ] Uses appropriate HTML elements (`<button>`, `<nav>`, `<header>`, etc.)
- [ ] Headings in logical order (`<h1>` → `<h2>` → `<h3>`)
- [ ] Lists use `<ul>`/`<ol>` + `<li>`
- [ ] Forms use `<label>` + `<input>` properly

### ARIA Attributes

- [ ] Interactive elements have proper `role` (if non-semantic)
- [ ] `aria-label` for icon-only buttons
- [ ] `aria-labelledby` for complex labels
- [ ] `aria-describedby` for error messages
- [ ] `aria-live` for dynamic content announcements
- [ ] `aria-expanded` for expandable elements
- [ ] `aria-invalid` for form field errors
- [ ] `aria-required` for required form fields
- [ ] `aria-hidden="true"` for decorative elements

### Keyboard Navigation

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus visible (outline or custom focus style)
- [ ] Enter/Space trigger actions on custom buttons
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys navigate menus/lists (where appropriate)
- [ ] Focus trapped in modals when open
- [ ] Focus returned to trigger element on close

### Color and Contrast

- [ ] Text contrast ratio ≥ 4.5:1 (normal text)
- [ ] Text contrast ratio ≥ 3:1 (large text, 18pt+)
- [ ] UI components contrast ratio ≥ 3:1
- [ ] Color not sole indicator of information
- [ ] Links distinguishable (underline or 3:1 contrast with surrounding text)

### Screen Readers

- [ ] Images have descriptive `alt` text
- [ ] Decorative images have `alt=""` or `role="presentation"`
- [ ] Form errors announced (`role="alert"` or `aria-live`)
- [ ] Loading states announced (`role="status"`, `aria-live="polite"`)
- [ ] Dynamic content changes announced
- [ ] Skip links provided (if layout component)

---

## Testing

### Unit Tests

- [ ] Component renders without crashing
- [ ] Renders with required props
- [ ] Renders with optional props
- [ ] Default props work correctly
- [ ] Loading state renders correctly
- [ ] Error state renders correctly
- [ ] Empty state renders correctly
- [ ] Event handlers called when triggered
- [ ] Callbacks receive correct arguments

### User Interaction Tests

- [ ] Click events work correctly
- [ ] Form submission works
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrows)
- [ ] Hover states apply correctly

### Accessibility Tests

- [ ] No accessibility violations (jest-axe or similar)
- [ ] Screen reader text present (sr-only elements)
- [ ] ARIA attributes correct
- [ ] Focus management tested

### Integration Tests

- [ ] Component works with parent components
- [ ] Context providers work correctly
- [ ] API calls triggered correctly
- [ ] State updates propagate

### Coverage

- [ ] Test coverage ≥ 80% for component file
- [ ] All branches covered (if/else)
- [ ] All event handlers covered

---

## Performance

- [ ] No unnecessary re-renders (use React DevTools Profiler)
- [ ] Expensive calculations memoized (`useMemo`)
- [ ] Callbacks memoized (`useCallback`) when passed to children
- [ ] Component wrapped in `React.memo` if pure
- [ ] Large lists virtualized (if > 100 items)
- [ ] Images lazy loaded (if below fold)
- [ ] Code split (if large component library)

---

## Responsive Design

- [ ] Works on mobile (320px width)
- [ ] Works on tablet (768px width)
- [ ] Works on desktop (1024px+ width)
- [ ] Touch targets ≥ 44x44px (mobile)
- [ ] Text readable without zoom
- [ ] No horizontal scroll on small screens
- [ ] Breakpoints use `min-width` (mobile-first)

---

## Browser Compatibility

- [ ] Works in Chrome (latest)
- [ ] Works in Firefox (latest)
- [ ] Works in Safari (latest)
- [ ] Works in Edge (latest)
- [ ] Graceful degradation for older browsers (if required)

---

## Documentation

- [ ] PropTypes documented with descriptions (if TypeScript, use JSDoc)
- [ ] Complex logic explained with comments
- [ ] Usage example in component documentation
- [ ] Storybook story created (if using Storybook)

---

## Security

- [ ] No XSS vulnerabilities (sanitize user input)
- [ ] No injection attacks (parameterize queries)
- [ ] `dangerouslySetInnerHTML` avoided (or sanitized with DOMPurify)
- [ ] External links have `rel="noopener noreferrer"`

---

## Checklist Summary

A component is complete when:

1. ✅ Renders correctly in all states (loading, error, empty, success)
2. ✅ Follows React best practices (hooks, props, state)
3. ✅ Uses BEM SCSS with CSS variables
4. ✅ Meets WCAG AA accessibility standards
5. ✅ Has comprehensive tests (≥80% coverage)
6. ✅ Performs well (no unnecessary re-renders)
7. ✅ Responsive across devices
8. ✅ Browser compatible
9. ✅ Documented and maintainable

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintained by**: Development Policy Library Project
