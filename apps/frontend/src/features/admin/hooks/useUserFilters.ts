import { useMemo, useState } from "react";
import type { SalesRep } from "@/types/user";

type TabType = "reps" | "applicants";

interface UseUserFiltersResult {
  tab: TabType;
  setTab: (tab: TabType) => void;
  search: string;
  setSearch: (search: string) => void;
  activeReps: SalesRep[];
  applicants: SalesRep[];
  currentList: SalesRep[];
  filteredList: SalesRep[];
}

/**
 * Custom hook for user filtering and tab management
 * @param users - Array of all users
 * @returns Filter state and controls
 */
export function useUserFilters(users: SalesRep[]): UseUserFiltersResult {
  const [tab, setTab] = useState<TabType>("reps");
  const [search, setSearch] = useState("");

  // Separate active/suspended users from pending applicants
  const activeReps = useMemo(
    () => users.filter((u) => u.status !== "inactive"),
    [users]
  );
  
  const applicants = useMemo(
    () => users.filter((u) => u.status === "inactive"),
    [users]
  );

  const currentList = tab === "reps" ? activeReps : applicants;

  // Use transition for non-blocking search
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return currentList;
    
    return currentList.filter((u) =>
      [u.firstName, u.lastName, u.email, u.phone ?? ""].some((v) =>
        v.toLowerCase().includes(q)
      )
    );
  }, [currentList, search]);

  return {
    tab,
    setTab,
    search,
    setSearch,
    activeReps,
    applicants,
    currentList,
    filteredList,
  };
}
