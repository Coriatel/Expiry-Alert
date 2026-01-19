# Tables & Forms — Patterns and Best Practices

## Data Tables

### Basic Table Structure
```jsx
import { useState, useMemo } from 'react';

function DataTable({ data, columns }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState('');
  const pageSize = 10;

  // Filtering
  const filteredData = useMemo(() => {
    if (!filterText) return data;
    return data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(filterText.toLowerCase())
      )
    );
  }, [data, filterText]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="data-table-container">
      {/* Search/Filter */}
      <input
        type="text"
        placeholder="חיפוש..."
        value={filterText}
        onChange={e => {
          setFilterText(e.target.value);
          setCurrentPage(1); // Reset to first page
        }}
        className="table-search"
      />

      {/* Table */}
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>
                <button
                  onClick={() => handleSort(col.key)}
                  className="sort-button"
                  aria-label={`מיין לפי ${col.label}`}
                >
                  {col.label}
                  {sortConfig.key === col.key && (
                    <span className="sort-icon">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-state">
                לא נמצאו תוצאות
              </td>
            </tr>
          ) : (
            paginatedData.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map(col => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            הקודם
          </button>

          <span className="page-info">
            עמוד {currentPage} מתוך {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
}

// Usage
const columns = [
  { key: 'name', label: 'שם' },
  { key: 'email', label: 'דוא״ל', render: row => <span dir="ltr">{row.email}</span> },
  { key: 'role', label: 'תפקיד' },
  {
    key: 'actions',
    label: 'פעולות',
    render: row => (
      <div className="action-buttons">
        <button onClick={() => handleEdit(row)}>ערוך</button>
        <button onClick={() => handleDelete(row)}>מחק</button>
      </div>
    ),
  },
];
```

### Table Styling (RTL-Aware)
```scss
.data-table-container {
  width: 100%;
  overflow-x: auto;

  .table-search {
    width: 100%;
    max-width: 300px;
    margin-block-end: 1rem;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-surface);

  th, td {
    padding: 0.75rem 1rem;
    text-align: start;
    border-block-end: 1px solid var(--color-border);
  }

  th {
    background-color: var(--color-surface-variant);
    font-weight: 600;

    .sort-button {
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;

      &:hover {
        color: var(--color-primary);
      }
    }

    .sort-icon {
      margin-inline-start: auto;
    }
  }

  tbody tr {
    &:hover {
      background-color: var(--color-hover);
    }
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-block-start: 1rem;

  button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      background-color: var(--color-hover);
    }
  }

  .page-info {
    color: var(--color-text-secondary);
  }
}
```

### Loading State
```jsx
function DataTableWithLoading({ data, loading, error, columns }) {
  if (loading) {
    return (
      <div className="table-loading" role="status" aria-live="polite">
        <div className="spinner" />
        <p>טוען נתונים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-error" role="alert">
        <p>שגיאה בטעינת הנתונים: {error.message}</p>
        <button onClick={handleRetry}>נסה שוב</button>
      </div>
    );
  }

  return <DataTable data={data} columns={columns} />;
}
```

### Advanced Features

#### Multi-Column Sorting
```javascript
const [sortConfig, setSortConfig] = useState([]);

const handleSort = (key, additive = false) => {
  if (additive) {
    // Add to sort stack
    setSortConfig(prev => {
      const exists = prev.find(s => s.key === key);
      if (exists) {
        // Toggle direction
        return prev.map(s =>
          s.key === key
            ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
            : s
        );
      }
      return [...prev, { key, direction: 'asc' }];
    });
  } else {
    // Single column sort
    setSortConfig([{ key, direction: 'asc' }]);
  }
};
```

#### Column Visibility Toggle
```javascript
const [visibleColumns, setVisibleColumns] = useState(
  columns.map(col => col.key)
);

const toggleColumn = (key) => {
  setVisibleColumns(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );
};

// In render:
const activeColumns = columns.filter(col => visibleColumns.includes(col.key));
```

## Forms

### Form with Validation
```jsx
import { useState } from 'react';

function ContactForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (values) => {
    const newErrors = {};

    if (!values.name.trim()) {
      newErrors.name = 'שם הוא שדה חובה';
    }

    if (!values.email.trim()) {
      newErrors.email = 'דוא״ל הוא שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      newErrors.email = 'דוא״ל לא תקין';
    }

    if (!values.message.trim()) {
      newErrors.message = 'הודעה היא שדה חובה';
    } else if (values.message.length < 10) {
      newErrors.message = 'ההודעה חייבת להכיל לפחות 10 תווים';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate field on blur
    const fieldErrors = validate(formData);
    if (fieldErrors[name]) {
      setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      message: true,
    });

    // Validate
    const newErrors = validate(formData);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return; // Don't submit if there are errors
    }

    // Submit
    setSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({ name: '', email: '', message: '' });
      setTouched({});
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form" noValidate>
      {/* Name Field */}
      <div className="form-field">
        <label htmlFor="name">
          שם <span className="required">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-required="true"
          aria-invalid={touched.name && errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {touched.name && errors.name && (
          <span id="name-error" className="error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      {/* Email Field */}
      <div className="form-field">
        <label htmlFor="email">
          דוא״ל <span className="required">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-required="true"
          aria-invalid={touched.email && errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {touched.email && errors.email && (
          <span id="email-error" className="error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      {/* Message Field */}
      <div className="form-field">
        <label htmlFor="message">
          הודעה <span className="required">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-required="true"
          aria-invalid={touched.message && errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        {touched.message && errors.message && (
          <span id="message-error" className="error" role="alert">
            {errors.message}
          </span>
        )}
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="form-error" role="alert">
          {errors.submit}
        </div>
      )}

      {/* Submit Button */}
      <button type="submit" disabled={submitting}>
        {submitting ? 'שולח...' : 'שלח'}
      </button>
    </form>
  );
}
```

### Form Styling
```scss
.form-field {
  margin-block-end: 1.5rem;

  label {
    display: block;
    margin-block-end: 0.5rem;
    font-weight: 500;

    .required {
      color: var(--color-error);
    }
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    font-size: 1rem;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &[aria-invalid="true"] {
      border-color: var(--color-error);

      &:focus {
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
      }
    }

    &:disabled {
      background-color: var(--color-surface-variant);
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  .error {
    display: block;
    margin-block-start: 0.25rem;
    color: var(--color-error);
    font-size: 0.875rem;
  }
}

.form-error {
  padding: 0.75rem;
  margin-block-end: 1rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--border-radius);
  color: var(--color-error);
}
```

### Common Form Patterns

#### Select Dropdown
```jsx
<div className="form-field">
  <label htmlFor="role">תפקיד</label>
  <select
    id="role"
    name="role"
    value={formData.role}
    onChange={handleChange}
  >
    <option value="">-- בחר תפקיד --</option>
    <option value="admin">מנהל</option>
    <option value="user">משתמש</option>
  </select>
</div>
```

#### Checkboxes
```jsx
<div className="form-field">
  <label>
    <input
      type="checkbox"
      name="subscribe"
      checked={formData.subscribe}
      onChange={e => setFormData(prev => ({
        ...prev,
        subscribe: e.target.checked,
      }))}
    />
    אני מעוניין לקבל עדכונים בדוא״ל
  </label>
</div>
```

#### Radio Buttons
```jsx
<fieldset className="form-field">
  <legend>מין</legend>
  <label>
    <input
      type="radio"
      name="gender"
      value="male"
      checked={formData.gender === 'male'}
      onChange={handleChange}
    />
    זכר
  </label>
  <label>
    <input
      type="radio"
      name="gender"
      value="female"
      checked={formData.gender === 'female'}
      onChange={handleChange}
    />
    נקבה
  </label>
</fieldset>
```

## Empty States

```jsx
// ✅ DO: Provide helpful empty states
function EmptyTable() {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">📋</div>
      <h3 className="empty-state__title">אין נתונים להצגה</h3>
      <p className="empty-state__description">
        התחל על ידי הוספת הרשומה הראשונה
      </p>
      <button onClick={handleCreate} className="empty-state__action">
        הוסף רשומה
      </button>
    </div>
  );
}
```

## Accessibility Requirements

### Tables
- ✅ Use `<table>`, `<thead>`, `<tbody>`, `<th>`, `<tr>`, `<td>` semantic elements
- ✅ Add `scope="col"` to `<th>` elements
- ✅ Use `aria-sort` for sortable columns
- ✅ Provide `aria-label` for action buttons
- ✅ Announce pagination changes with `aria-live`

### Forms
- ✅ Associate labels with inputs using `htmlFor` and `id`
- ✅ Use `aria-required` for required fields
- ✅ Use `aria-invalid` for fields with errors
- ✅ Use `aria-describedby` to link error messages
- ✅ Use `role="alert"` for error messages
- ✅ Disable submit button while processing
- ✅ Provide clear error messages

---

**Related Skills**:
- `/skills/tables/` — Table implementation guide
- `/skills/ui/` — UI component patterns
- `/skills/rtl-hebrew/` — RTL considerations

**See Also**:
- [020-ui-react-scss-a11y.md](./020-ui-react-scss-a11y.md)
- [030-rtl-hebrew.md](./030-rtl-hebrew.md)
