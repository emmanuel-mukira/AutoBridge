import { useMemo } from "react";
import { applyFilters } from "@/lib/filtering/filterUtils";
import type { FilterCondition } from "@/lib/filtering/types";

export function useClientFiltering<T>(data: T[], conditions: FilterCondition[]): T[] {
  return useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!conditions || conditions.length === 0) return data;
    
    return applyFilters(data, conditions);
  }, [data, conditions]);
}
