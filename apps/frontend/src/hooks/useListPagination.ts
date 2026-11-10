import { useState } from "react";

/** For complete API arrays only; server-paged lists keep their own query state. */
export function useListPagination<T>(items: readonly T[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  return {
    visibleItems: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    pagination: {
      page: currentPage, pageSize, totalPages, totalCount: items.length,
      onPageChange: setPage,
      onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
    },
  };
}
