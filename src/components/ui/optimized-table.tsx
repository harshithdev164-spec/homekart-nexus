import React, { useMemo, useState, useCallback } from 'react';
import { useVirtualList } from '@/hooks/useIntersectionObserver';
import { useMemoizedSort, useMemoizedFilter } from '@/hooks/useMemoization';

interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface OptimizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  containerHeight?: number;
  onRowClick?: (row: T) => void;
  className?: string;
  enableVirtualization?: boolean;
}

export function OptimizedTable<T extends { id: string | number }>({
  data,
  columns,
  rowHeight = 60,
  containerHeight = 600,
  onRowClick,
  className = '',
  enableVirtualization = true,
}: OptimizedTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  
  const [filterConfig, setFilterConfig] = useState<Record<string, string>>({});

  // Memoized filtered data
  const filteredData = useMemoizedFilter(
    data,
    (item) => {
      return Object.entries(filterConfig).every(([key, value]) => {
        if (!value) return true;
        const itemValue = String(item[key as keyof T] || '').toLowerCase();
        return itemValue.includes(value.toLowerCase());
      });
    },
    [data, filterConfig]
  );

  // Memoized sorted data
  const sortedData = useMemoizedSort(
    filteredData,
    (a, b) => {
      if (!sortConfig.key) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue > bValue ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    },
    [filteredData, sortConfig]
  );

  // Virtual list for performance
  const virtualList = enableVirtualization
    ? useVirtualList(sortedData, rowHeight, containerHeight)
    : null;

  const displayData = enableVirtualization ? virtualList!.visibleItems : sortedData;

  const handleSort = useCallback((key: keyof T) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleFilter = useCallback((key: string, value: string) => {
    setFilterConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className={`overflow-hidden rounded-lg border ${className}`}>
      {/* Table Header */}
      <div className="bg-muted/50 border-b">
        <div className="flex">
          {columns.map((column) => (
            <div
              key={String(column.key)}
              className="px-4 py-3 font-medium text-sm"
              style={{ width: column.width || `${100 / columns.length}%` }}
            >
              <div className="flex flex-col gap-2">
                <div
                  className={`flex items-center gap-2 ${
                    column.sortable ? 'cursor-pointer hover:text-primary' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.header}
                  {column.sortable && sortConfig.key === column.key && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
                {column.filterable && (
                  <input
                    type="text"
                    placeholder="Filter..."
                    className="px-2 py-1 text-xs border rounded"
                    onChange={(e) => handleFilter(String(column.key), e.target.value)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={enableVirtualization ? virtualList!.handleScroll : undefined}
      >
        <div
          style={{
            height: enableVirtualization ? virtualList!.totalHeight : 'auto',
            position: 'relative',
          }}
        >
          <div
            style={{
              transform: enableVirtualization
                ? `translateY(${virtualList!.offsetY}px)`
                : undefined,
            }}
          >
            {displayData.map((row) => (
              <div
                key={row.id}
                className="flex border-b hover:bg-muted/50 cursor-pointer transition-colors"
                style={{ height: rowHeight }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <div
                    key={String(column.key)}
                    className="px-4 py-3 flex items-center text-sm"
                    style={{ width: column.width || `${100 / columns.length}%` }}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] || '')}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/30 px-4 py-2 text-sm text-muted-foreground border-t">
        Showing {displayData.length} of {data.length} rows
        {Object.keys(filterConfig).some((k) => filterConfig[k]) && ' (filtered)'}
      </div>
    </div>
  );
}
