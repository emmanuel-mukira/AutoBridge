import { create } from "zustand";
import type { FilterCondition } from "@/lib/filtering/types";

interface FilterStore {
  filters: Record<string, FilterCondition[]>;
  setFilters: (key: string, conditions: FilterCondition[]) => void;
  addFilter: (key: string, condition: FilterCondition) => void;
  removeFilter: (key: string, field: string) => void;
  clearFilters: (key: string) => void;
  getFilters: (key: string) => FilterCondition[];
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  filters: {},
  
  setFilters: (key: string, conditions: FilterCondition[]) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: conditions,
      },
    }));
  },
  
  addFilter: (key: string, condition: FilterCondition) => {
    set((state) => {
      const existing = state.filters[key] || [];
      const filtered = existing.filter((c) => c.field !== condition.field);
      return {
        filters: {
          ...state.filters,
          [key]: [...filtered, condition],
        },
      };
    });
  },
  
  removeFilter: (key: string, field: string) => {
    set((state) => {
      const existing = state.filters[key] || [];
      return {
        filters: {
          ...state.filters,
          [key]: existing.filter((c) => c.field !== field),
        },
      };
    });
  },
  
  clearFilters: (key: string) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: [],
      },
    }));
  },
  
  getFilters: (key: string) => {
    return get().filters[key] || [];
  },
}));
