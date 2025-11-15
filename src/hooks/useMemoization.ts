import { useMemo, useCallback } from 'react';

/**
 * Memoize expensive filtering operations
 */
export function useMemoizedFilter<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  deps: any[] = []
) {
  return useMemo(() => {
    return items.filter(filterFn);
  }, [items, ...deps]);
}

/**
 * Memoize expensive sorting operations
 */
export function useMemoizedSort<T>(
  items: T[],
  compareFn: (a: T, b: T) => number,
  deps: any[] = []
) {
  return useMemo(() => {
    return [...items].sort(compareFn);
  }, [items, ...deps]);
}

/**
 * Memoize grouped data transformations
 */
export function useMemoizedGroupBy<T>(
  items: T[],
  keyFn: (item: T) => string,
  deps: any[] = []
): Record<string, T[]> {
  return useMemo(() => {
    return items.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }, [items, ...deps]);
}

/**
 * Cache function results with LRU cache
 */
export function createMemoizer<T extends (...args: any[]) => any>(
  fn: T,
  cacheSize: number = 100
) {
  const cache = new Map<string, ReturnType<T>>();
  const keys: string[] = [];

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    keys.push(key);

    // Remove oldest entry if cache is full
    if (keys.length > cacheSize) {
      const oldestKey = keys.shift()!;
      cache.delete(oldestKey);
    }

    return result;
  };
}

/**
 * Paginate large datasets
 */
export function usePagination<T>(
  items: T[],
  itemsPerPage: number = 10
) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

// Import React for usePagination
import React from 'react';
