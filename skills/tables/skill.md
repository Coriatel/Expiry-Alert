# Tables — Sortable, Filterable, Paginated Data Tables

## Purpose

This skill guides you through creating production-ready data tables with sorting, filtering, pagination, and accessibility. Covers React implementation with reusable hooks, SCSS styling, and WCAG AA compliance.

## When to Use This Skill

Use when:
- Displaying tabular data with many rows (> 20 items)
- Users need to sort, filter, or search through data
- Implementing admin panels, dashboards, or data management UIs
- Building accessible, keyboard-navigable tables

Do NOT use when:
- Displaying simple lists (use `<ul>` or cards instead)
- Data has complex nested structures (consider tree view)
- Real-time data requires virtual scrolling (use react-window)

## Required Inputs

1. **Data Source**: Array of objects or API endpoint
2. **Columns Definition**: Array specifying keys, labels, types, and rendering
3. **Features**: Which features to enable (sort, filter, pagination, search)

**Defaults:**
- Sort: Client-side, single column
- Filter: Text search across all columns
- Pagination: 20 items per page
- Styling: BEM with SCSS

## Steps

### 1. Create Table Component Structure

```bash
mkdir -p src/components/DataTable
touch src/components/DataTable/DataTable.jsx
touch src/components/DataTable/data-table.scss
touch src/components/DataTable/useTableState.js
touch src/components/DataTable/DataTable.test.jsx
```

### 2. Create Custom Hook for Table State

Create `src/components/DataTable/useTableState.js`:

```javascript
import { useState, useMemo } from 'react';

export function useTableState(data, columns) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});

  // Apply search
  const searchedData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((row) =>
      columns.some((column) => {
        const value = row[column.key];
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Apply column filters
  const filteredData = useMemo(() => {
    return searchedData.filter((row) => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        const rowValue = row[key];
        return String(rowValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    });
  }, [searchedData, filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page
  };

  const handleFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return {
    paginatedData,
    sortConfig,
    currentPage,
    pageSize,
    totalPages,
    totalRows: sortedData.length,
    searchTerm,
    filters,
    handleSort,
    handleSearch,
    handleFilter,
    handlePageChange,
    setPageSize,
  };
}
```

### 3. Create DataTable Component

Create `src/components/DataTable/DataTable.jsx`:

```javascript
import PropTypes from 'prop-types';
import { useTableState } from './useTableState';
import './data-table.scss';

function DataTable({
  data,
  columns,
  enableSort = true,
  enableSearch = true,
  enablePagination = true,
  enableColumnFilters = false,
  initialPageSize = 20,
  onRowClick,
}) {
  const {
    paginatedData,
    sortConfig,
    currentPage,
    pageSize,
    totalPages,
    totalRows,
    searchTerm,
    filters,
    handleSort,
    handleSearch,
    handleFilter,
    handlePageChange,
    setPageSize,
  } = useTableState(data, columns);

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="data-table-container">
      {/* Search Bar */}
      {enableSearch && (
        <div className="data-table__search">
          <label htmlFor="table-search" className="sr-only">
            Search table
          </label>
          <input
            type="text"
            id="table-search"
            className="data-table__search-input"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search table data"
          />
          <span className="data-table__search-results" role="status" aria-live="polite">
            {totalRows} {totalRows === 1 ? 'result' : 'results'}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="data-table__scroll">
        <table className="data-table" role="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="data-table__header-cell">
                  {enableSort && column.sortable !== false ? (
                    <button
                      type="button"
                      className="data-table__sort-button"
                      onClick={() => handleSort(column.key)}
                      aria-label={`Sort by ${column.label}`}
                      aria-sort={
                        sortConfig.key === column.key
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      {column.label}
                      <span className="data-table__sort-indicator" aria-hidden="true">
                        {getSortIndicator(column.key)}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}

                  {/* Column Filter */}
                  {enableColumnFilters && column.filterable !== false && (
                    <input
                      type="text"
                      className="data-table__column-filter"
                      placeholder="Filter..."
                      value={filters[column.key] || ''}
                      onChange={(e) => handleFilter(column.key, e.target.value)}
                      aria-label={`Filter ${column.label}`}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="data-table__empty">
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className={`data-table__row ${onRowClick ? 'data-table__row--clickable' : ''}`}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="data-table__cell">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="data-table__pagination">
          <div className="data-table__pagination-info">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalRows)} of {totalRows}
          </div>

          <div className="data-table__pagination-controls">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="data-table__pagination-button"
            >
              ← Previous
            </button>

            <span className="data-table__pagination-pages">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="data-table__pagination-button"
            >
              Next →
            </button>
          </div>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="data-table__page-size-select"
            aria-label="Items per page"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      )}
    </div>
  );
}

DataTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      sortable: PropTypes.bool,
      filterable: PropTypes.bool,
      render: PropTypes.func,
    })
  ).isRequired,
  enableSort: PropTypes.bool,
  enableSearch: PropTypes.bool,
  enablePagination: PropTypes.bool,
  enableColumnFilters: PropTypes.bool,
  initialPageSize: PropTypes.number,
  onRowClick: PropTypes.func,
};

export default DataTable;
```

### 4. Create SCSS Styles

Create `src/components/DataTable/data-table.scss`:

```scss
.data-table-container {
  width: 100%;

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
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-background, #ffffff);

  &__search {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: var(--color-gray-50, #f9fafb);
    border-radius: var(--border-radius, 0.375rem);
  }

  &__search-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: var(--border-radius, 0.375rem);

    &:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }

  &__search-results {
    font-size: 0.875rem;
    color: var(--color-text-secondary, #6b7280);
  }

  &__scroll {
    overflow-x: auto;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--border-radius, 0.375rem);
  }

  &__header-cell {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    background-color: var(--color-gray-50, #f9fafb);
    border-bottom: 2px solid var(--color-border, #e5e7eb);
    white-space: nowrap;
  }

  &__sort-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;

    &:hover {
      color: var(--color-primary, #3b82f6);
    }

    &:focus {
      outline: 2px solid var(--color-focus, #3b82f6);
      outline-offset: 2px;
    }
  }

  &__sort-indicator {
    font-size: 0.875rem;
    color: var(--color-primary, #3b82f6);
  }

  &__column-filter {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: var(--border-radius, 0.375rem);

    &:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
    }
  }

  &__row {
    border-bottom: 1px solid var(--color-border, #e5e7eb);

    &:hover {
      background-color: var(--color-gray-50, #f9fafb);
    }

    &--clickable {
      cursor: pointer;

      &:focus {
        outline: 2px solid var(--color-focus, #3b82f6);
        outline-offset: -2px;
      }
    }
  }

  &__cell {
    padding: 0.75rem 1rem;
  }

  &__empty {
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary, #6b7280);
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
    padding: 1rem;
    background-color: var(--color-gray-50, #f9fafb);
    border-radius: var(--border-radius, 0.375rem);
    flex-wrap: wrap;
  }

  &__pagination-info {
    font-size: 0.875rem;
    color: var(--color-text-secondary, #6b7280);
  }

  &__pagination-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__pagination-button {
    padding: 0.5rem 1rem;
    font-family: inherit;
    font-size: 0.875rem;
    background-color: white;
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: var(--border-radius, 0.375rem);
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: var(--color-gray-50, #f9fafb);
    }

    &:focus {
      outline: 2px solid var(--color-focus, #3b82f6);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__pagination-pages {
    font-size: 0.875rem;
    font-weight: 500;
  }

  &__page-size-select {
    padding: 0.5rem;
    font-family: inherit;
    font-size: 0.875rem;
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: var(--border-radius, 0.375rem);

    &:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
    }
  }

  // Responsive
  @media (max-width: 640px) {
    &__pagination {
      flex-direction: column;
      align-items: stretch;
    }

    &__pagination-info,
    &__pagination-pages {
      text-align: center;
    }
  }
}
```

### 5. Use DataTable Component

Example usage:

```javascript
import DataTable from './components/DataTable/DataTable';

function UsersPage() {
  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value) => (
        <span className={`badge badge--${value.toLowerCase()}`}>{value}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  const handleRowClick = (user) => {
    console.log('User clicked:', user);
    // Navigate to user details, open modal, etc.
  };

  return (
    <div>
      <h1>Users</h1>
      <DataTable
        data={users}
        columns={columns}
        enableSort
        enableSearch
        enablePagination
        onRowClick={handleRowClick}
      />
    </div>
  );
}
```

## Expected Outputs

1. **Component Files**: DataTable.jsx, useTableState.js, data-table.scss
2. **Features**: Sorting, searching, pagination, column filters (optional)
3. **Accessibility**: WCAG AA compliant, keyboard navigable
4. **Performance**: Optimized with useMemo for large datasets

## Validation

1. **Test sorting**: Click column headers to sort ascending/descending
2. **Test search**: Type in search box, verify results update
3. **Test pagination**: Navigate pages, change page size
4. **Test keyboard**: Tab through controls, Enter to sort/navigate
5. **Test screen reader**: Ensure aria-labels announce changes

Run tests:
```bash
npm test -- DataTable.test.jsx
```

## Related Skills

- `/skills/ui/` — Base React component patterns
- `/skills/api-express/` — Backend API for table data
- `/skills/prisma-postgres/` — Database queries with pagination
- `/skills/testing-e2e/` — E2E tests for table interactions

## See Also

- [Cursor Rule: Tables](../../.cursor/rules/040-tables-forms.md)
- [Cursor Rule: UI](../../.cursor/rules/020-ui-react-scss-a11y.md)
- [Details: Table Theory](./details/README.md)
- [Details: Examples](./details/examples.md)
- [Details: Checklist](./details/checklist.md)
- [Details: Anti-Patterns](./details/anti-patterns.md)

---

**Last Updated**: 2025-12-31
**React Version**: 18.2+
**Maintained by**: Development Policy Library Project
