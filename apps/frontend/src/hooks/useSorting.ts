import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig<T> {
  field: keyof T | string;
  direction: SortDirection;
}

interface UseSortingReturn<T> {
  sortedData: T[];
  sortConfig: SortConfig<T> | null;
  handleSort: (field: keyof T | string) => void;
  getSortIcon: (field: keyof T | string) => "asc" | "desc" | null;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

const STATUS_ORDER: Record<string, number> = {
  "DRAFT": 1,
  "SENT": 2,
  "ACCEPTED": 3,
  "REJECTED": 4,
  "SUPERSEDED": 5,
  "PENDING": 1,
  "ACTIVE": 2,
  "SUSPENDED": 3,
};

export function useSorting<T>(data: T[]): UseSortingReturn<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const fieldPath = String(sortConfig.field);
      const aValue = getNestedValue(a, fieldPath);
      const bValue = getNestedValue(b, fieldPath);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (fieldPath === "status" && typeof aValue === "string" && typeof bValue === "string") {
        const aOrder = STATUS_ORDER[aValue] ?? 999;
        const bOrder = STATUS_ORDER[bValue] ?? 999;
        return sortConfig.direction === "asc" ? aOrder - bOrder : bOrder - aOrder;
      }

      if (fieldPath === "totalPrice" && typeof aValue === "string" && typeof bValue === "string") {
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === "asc"
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime()) && (aValue.includes("-") || aValue.includes("T"))) {
          return sortConfig.direction === "asc"
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }

        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aStr = String(aValue);
      const bStr = String(bValue);
      return sortConfig.direction === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [data, sortConfig]);

  const handleSort = useCallback((field: keyof T | string) => {
    setSortConfig((current) => {
      if (!current || current.field !== field) {
        return { field, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { field, direction: "desc" };
      }
      return null;
    });
  }, []);

  const getSortIcon = useCallback(
    (field: keyof T | string): "asc" | "desc" | null => {
      if (!sortConfig || sortConfig.field !== field) return null;
      return sortConfig.direction;
    },
    [sortConfig]
  );

  return {
    sortedData,
    sortConfig,
    handleSort,
    getSortIcon,
  };
}
