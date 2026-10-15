import { useMemo, useState } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationResult<T> {
  paged: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Custom hook for pagination logic
 * @param items - Array of items to paginate
 * @param options - Pagination options (initialPage, initialPageSize)
 * @returns Pagination state and controls
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { initialPage = 1, initialPageSize = 5 } = options;
  
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / pageSize)),
    [items.length, pageSize]
  );

  return {
    paged,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  };
}
