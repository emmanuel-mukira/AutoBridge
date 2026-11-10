import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useListPagination } from "../src/hooks/useListPagination.ts";

// Exercise empty, exact-page and multi-page lists without a browser or test dependency.
for (const count of [0, 1, 5, 6, 23]) {
  const items = Array.from({ length: count }, (_, id) => id);
  function CheckPagination() {
    const result = useListPagination(items);
    assert.deepEqual(result.visibleItems, items.slice(0, 5));
    assert.equal(result.pagination.totalCount, count);
    assert.equal(result.pagination.totalPages, Math.max(1, Math.ceil(count / 5)));
    assert.equal(result.pagination.page, 1);
    assert.equal(result.pagination.pageSize, 5);
    return null;
  }
  renderToStaticMarkup(createElement(CheckPagination));
}
console.log("PASS: list pagination defaults and page counts (5 cases)");
