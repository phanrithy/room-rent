import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './EmptyState.jsx';
import { Skeleton } from './Skeleton.jsx';

export function DataTable({
  columns = [],
  data = [],
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  sortKey = null,
  sortOrder = 'asc',
  onSort = null,
  loading = false,
  emptyTitle,
  emptyDescription,
  onEmptyAction,
  emptyActionLabel,
  mobileRender = null,
}) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleHeaderClick = (col) => {
    if (!col.sortable || !onSort) return;
    const nextOrder = sortKey === col.key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(col.key, nextOrder);
  };

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <Skeleton height="h-10" />
        <Skeleton height="h-12" />
        <Skeleton height="h-12" />
        <Skeleton height="h-12" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg">
        <EmptyState
          title={emptyTitle || t('common.noData')}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile Stacked Card View (visible on < md) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {data.map((item, index) => {
          if (mobileRender) {
            return (
              <div key={item.id || index} className="bg-surface border border-border rounded-lg p-4 shadow-sm">
                {mobileRender(item)}
              </div>
            );
          }
          return (
            <div key={item.id || index} className="bg-surface border border-border rounded-lg p-4 shadow-sm space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                  <span className="text-content-muted text-xs font-medium">{col.label}</span>
                  <div className="text-content-primary font-medium text-right">
                    {col.render ? col.render(item) : item[col.key]}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (visible on >= md) */}
      <div className="hidden md:block overflow-x-auto bg-surface border border-border rounded-lg shadow-sm">
        <table className="w-full text-left text-sm text-content-primary">
          <thead className="bg-surface-subtle text-content-secondary uppercase text-xs tracking-wider border-b border-border font-semibold select-none">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col)}
                  className={`px-4 py-3.5 ${col.sortable ? 'cursor-pointer hover:bg-surface-hover' : ''} ${
                    col.className || ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable && sortKey === col.key && (
                      <span className="text-primary">
                        {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-surface-hover/60 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 whitespace-nowrap ${col.className || ''}`}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-2 py-2 text-sm text-content-secondary select-none">
          <div>
            {t('common.page')} <span className="font-semibold text-content-primary">{page}</span> {t('common.of')}{' '}
            <span className="font-semibold text-content-primary">{totalPages}</span> ({total} {t('common.total')})
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-2 rounded border border-border bg-surface text-content-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-hover min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-2 rounded border border-border bg-surface text-content-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-hover min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
