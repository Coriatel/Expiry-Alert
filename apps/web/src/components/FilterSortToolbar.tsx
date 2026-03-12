import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, LayoutGrid, LayoutList, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { ExpiryStatus } from '@/types';

interface FilterSortToolbarProps {
  statusFilter: ExpiryStatus | 'all';
  onStatusFilterChange: (value: ExpiryStatus | 'all') => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  sortField: string;
  onSortFieldChange: (value: string) => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (value: 'asc' | 'desc') => void;
  viewMode: 'table' | 'cards';
  onViewModeChange: (value: 'table' | 'cards') => void;
}

export function FilterSortToolbar({
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  viewMode,
  onViewModeChange,
}: FilterSortToolbarProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filterControls = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status filter */}
      <Select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as ExpiryStatus | 'all')}
        className="w-auto min-w-[120px] h-9 text-sm"
      >
        <option value="all">{t('filters.status')}: {t('filters.all')}</option>
        <option value="expired">{t('filters.expired')}</option>
        <option value="expiring-soon">{t('filters.expiringSoon')}</option>
        <option value="expiring-week">{t('filters.expiringWeek')}</option>
        <option value="ok">{t('filters.ok')}</option>
      </Select>

      {/* Category filter */}
      <Select
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        className="w-auto min-w-[120px] h-9 text-sm"
      >
        <option value="all">{t('filters.category')}: {t('filters.all')}</option>
        <option value="reagents">{t('category.reagents')}</option>
        <option value="beads">{t('category.beads')}</option>
      </Select>

      {/* Sort */}
      <div className="flex items-center gap-1">
        <Select
          value={sortField}
          onChange={(e) => onSortFieldChange(e.target.value)}
          className="w-auto min-w-[130px] h-9 text-sm"
        >
          <option value="expiry_date">{t('filters.expiryDate')}</option>
          <option value="name">{t('filters.name')}</option>
          <option value="days_until_expiry">{t('filters.daysLeft')}</option>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
          className="h-9 w-9 p-0"
          title={sortDirection === 'asc' ? '↑' : '↓'}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="print:hidden filter-toolbar">
      <div className="flex items-center justify-between gap-2">
        {/* On mobile: filter toggle button + view toggle */}
        {isMobile ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="h-9"
            >
              <Filter className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t('filters.title')}
              {mobileOpen ? (
                <ChevronUp className="h-3 w-3 ltr:ml-1 rtl:mr-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ltr:ml-1 rtl:mr-1" />
              )}
            </Button>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange('table')}
                className="h-9 w-9 p-0"
                title={t('dashboard.viewTable')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange('cards')}
                className="h-9 w-9 p-0"
                title={t('dashboard.viewCards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {filterControls}
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange('table')}
                className="h-9 w-9 p-0"
                title={t('dashboard.viewTable')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange('cards')}
                className="h-9 w-9 p-0"
                title={t('dashboard.viewCards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Mobile expanded filters */}
      {isMobile && mobileOpen && (
        <div className="mt-2 pt-2 border-t">
          {filterControls}
        </div>
      )}
    </div>
  );
}
