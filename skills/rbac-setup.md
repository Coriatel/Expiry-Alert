# Skill: RBAC Setup

**Goal**: Implement role-based access control for features

**Time**: ~10 minutes

---

## Understanding RBAC

This platform has 3 roles:
- **ADMIN** - Full access to everything
- **MALE** - Access to male-specific + public content
- **FEMALE** - Access to female-specific + public content

Content visibility levels:
- **PUBLIC** - All authenticated users
- **MALE_ONLY** - Male + Admin
- **FEMALE_ONLY** - Female + Admin
- **ADMIN_ONLY** - Admin only

---

## API Protection

### Require Specific Role

```javascript
const { requireRole } = require('../middleware/rbac');

// Only admins can access
router.get('/admin-stats', requireRole('ADMIN'), controller.getStats);

// Multiple roles allowed
router.get('/gender-content', requireRole('MALE', 'FEMALE'), controller.getContent);
```

### Filter Content by Visibility

```javascript
const { filterContentByRole } = require('../middleware/rbac');

router.use(filterContentByRole);

router.get('/', async (req, res) => {
  const content = await prisma.content.findMany({
    where: req.visibilityWhere, // Auto-filters by role
  });

  res.json({ content });
});
```

### Manual Permission Check

```javascript
const { checkContentAccess } = require('../middleware/rbac');

const canAccess = checkContentAccess(content, req.user.role);
if (!canAccess) {
  return res.status(403).json({ error: 'Access denied' });
}
```

---

## Frontend Protection

### Route Protection

```javascript
import ProtectedRoute from './guards/ProtectedRoute';

<Route
  path="/admin"
  element={
    <ProtectedRoute requiredRole="ADMIN">
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

### Conditional Rendering

```javascript
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user } = useAuth();

  return (
    <nav>
      <Link to="/content">Content</Link>

      {user.role === 'ADMIN' && (
        <Link to="/users">Users</Link>
      )}

      {(user.role === 'MALE' || user.role === 'ADMIN') && (
        <Link to="/male-section">Male Section</Link>
      )}
    </nav>
  );
}
```

---

## Example: New Role-Based Feature

Let's add a "Reports" section (Admin only):

### 1. API Route

```javascript
// routes/report.routes.js
const { requireAdmin } = require('../middleware/rbac');

router.get('/', requireAdmin, reportController.getReports);
```

### 2. React Page

```javascript
// App.jsx
<Route
  path="/reports"
  element={
    <ProtectedRoute requiredRole="ADMIN">
      <Reports />
    </ProtectedRoute>
  }
/>
```

### 3. Navigation

```javascript
// Layout.jsx
{user?.role === 'ADMIN' && (
  <Link to="/reports">{t('nav.reports')}</Link>
)}
```

---

## Testing RBAC

1. Log in as different users:
   - `admin@crm.local` / `Admin123!`
   - `male@crm.local` / `Male123!`
   - `female@crm.local` / `Female123!`

2. Verify access controls work:
   - Admin sees everything
   - Male sees male + public content
   - Female sees female + public content

3. Try accessing restricted routes directly (should get 403)

---

## Security Checklist

- ✅ API routes protected with middleware
- ✅ Frontend routes use ProtectedRoute
- ✅ Sensitive UI elements conditionally rendered
- ✅ Database queries filter by visibility
- ✅ Tested with all user roles

---

## See Also

- `/apps/api/src/middleware/rbac.js` - RBAC implementation
- `/apps/web/src/guards/ProtectedRoute.jsx` - Route guard
- `/docs/SECURITY.md` - Security best practices
