import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { Pencil, Trash2, Archive, CheckSquare, Square } from 'lucide-react';
import type { Reagent } from '@/types';
import { Button } from '@/components/ui/Button';
import { getDaysUntilExpiry, getExpiryStatus, getStatusColor, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ReagentTableProps {
  reagents: Reagent[];
  onEdit: (reagent: Reagent) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
}

const columnHelper = createColumnHelper<Reagent>();

export function ReagentTable({
  reagents,
  onEdit,
  onDelete,
  onArchive,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: ReagentTableProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'expiry_date', desc: false },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => (
          <button onClick={onSelectAll} className="flex items-center">
            {selectedIds.length === reagents.length && reagents.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <button onClick={() => onToggleSelect(row.original.id)} className="flex items-center">
            {selectedIds.includes(row.original.id) ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ),
        size: 40,
      }),
      columnHelper.accessor('name', {
        header: t('table.name'),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('category', {
        header: t('table.category'),
        cell: (info) => t(`category.${info.getValue()}`),
      }),
      columnHelper.accessor('expiry_date', {
        header: t('table.expiryDate'),
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.display({
        id: 'days_until_expiry',
        header: t('table.daysUntilExpiry'),
        cell: ({ row }) => {
          const days = getDaysUntilExpiry(row.original.expiry_date);
          const status = getExpiryStatus(row.original.expiry_date);

          return (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                getStatusColor(status)
              )}
            >
              {days < 0
                ? t('status.expired')
                : days === 0
                ? t('status.expiresToday')
                : days === 1
                ? t('status.expiresInOneDay')
                : t('status.expiresIn', { days })}
            </span>
          );
        },
      }),
      columnHelper.accessor('lot_number', {
        header: t('table.lotNumber'),
        cell: (info) => info.getValue() || '-',
      }),
      columnHelper.accessor('notes', {
        header: t('table.notes'),
        cell: (info) => (
          <div className="max-w-xs truncate" title={info.getValue() || ''}>
            {info.getValue() || '-'}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: t('table.actions'),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(row.original)}
              title={t('actions.edit')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onArchive(row.original.id)}
              title={t('actions.archive')}
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.original.id)}
              title={t('actions.delete')}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
        size: 120,
      }),
    ],
    [t, selectedIds, reagents.length, onToggleSelect, onSelectAll, onEdit, onArchive, onDelete]
  );

  const table = useReactTable({
    data: reagents,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (reagents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('dashboard.noReagents')}
      </div>
    );
  }

  return (
    <div className="table-container overflow-auto max-h-[600px] border rounded-lg">
      <table className="w-full">
        <thead className="bg-muted sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-start text-sm font-medium border-b"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={cn(
                        header.column.getCanSort() && 'cursor-pointer select-none',
                        'flex items-center gap-2'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span>{header.column.getIsSorted() === 'desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const status = getExpiryStatus(row.original.expiry_date);
            return (
              <tr
                key={row.id}
                className={cn(
                  'border-b hover:bg-muted/50',
                  status === 'expired' && 'bg-red-50',
                  status === 'expiring-soon' && 'bg-orange-50',
                  status === 'expiring-week' && 'bg-yellow-50'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
