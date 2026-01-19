# Skill: Add a New React Page

**Goal**: Create a new page with routing, styling, and i18n

**Time**: ~10 minutes

---

## Example: Add a "Profile" page

### 1. Create the Page Component

Create `/apps/web/src/pages/Profile.jsx`:

```javascript
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';

function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setProfile(response.data.user);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <h1>{t('profile.title')}</h1>
        <p>{t('profile.email')}: {profile.email}</p>
        <p>{t('profile.role')}: {t(`roles.${profile.role}`)}</p>
      </div>
    </Layout>
  );
}

export default Profile;
```

### 2. Add Route

Edit `/apps/web/src/App.jsx`:

```javascript
import Profile from './pages/Profile';

// Add inside <Routes>:
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>
```

### 3. Add Translations

Edit `/apps/web/src/locales/he.json`:

```json
{
  "profile": {
    "title": "פרופיל",
    "email": "אימייל",
    "role": "תפקיד"
  }
}
```

Edit `/apps/web/src/locales/en.json`:

```json
{
  "profile": {
    "title": "Profile",
    "email": "Email",
    "role": "Role"
  }
}
```

### 4. Add Navigation Link

Edit `/apps/web/src/components/Layout.jsx`:

```javascript
<Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
  {t('nav.profile')}
</Link>
```

Don't forget to add `"profile": "פרופיל"` to `nav` in translations!

### 5. Add Styles (Optional)

If you need custom styles, add to `/apps/web/src/styles/main.scss`:

```scss
.profile {
  max-width: 600px;
  margin: 0 auto;

  .profile-card {
    background: white;
    padding: $spacing-xl;
    border-radius: 0.5rem;
  }
}
```

---

## RBAC Protection

To restrict page by role:

```javascript
<Route
  path="/admin-panel"
  element={
    <ProtectedRoute requiredRole="ADMIN">
      <AdminPanel />
    </ProtectedRoute>
  }
/>
```

---

## See Also

- `/docs/FRONTEND.md` - Frontend architecture
- `/skills/add-translation.md` - i18n best practices
- `/.cursorrules` - React coding standards
