import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { http, setCsrfToken } from "@/lib/http";
import { queryClient } from "@/lib/query-client";
import type { DisplayCurrency } from "@/lib/currency";

interface UIState {
  isSidebarOpen: boolean;
  theme: "light" | "dark";
  displayCurrency: DisplayCurrency;
  actions: {
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    setTheme: (theme: "light" | "dark") => void;
    setDisplayCurrency: (currency: DisplayCurrency) => void;
  };
}

export const useUIStore = create<UIState>()(devtools(persist((set) => ({
  isSidebarOpen: true,
  theme: "light",
  displayCurrency: "KES",
  actions: {
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (open) => set({ isSidebarOpen: open }),
    setTheme: (theme) => set({ theme }),
    setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
  },
}), { name: "ui-storage", partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen, theme: state.theme, displayCurrency: state.displayCurrency }) }), { name: "UI Store" }));

export const useUIActions = () => useUIStore((state) => state.actions);

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "SALES_REP";
  groups: string[];
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  actions: {
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
  };
}

type SessionResponse = { user: AuthUser; csrfToken: string };

export const useAuthStore = create<AuthState>()(devtools((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  actions: {
    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await http.post<SessionResponse>("/api/auth/login", { email, password });
        setCsrfToken(response.data.csrfToken);
        set({ user: response.data.user, isAuthenticated: true, isLoading: false });
        return true;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : "Login failed", isLoading: false });
        return false;
      }
    },
    logout: async () => {
      await http.post("/api/auth/logout");
      setCsrfToken(null);
      queryClient.clear();
      set({ user: null, isAuthenticated: false, error: null });
    },
    checkSession: async () => {
      set({ isLoading: true });
      try {
        const response = await http.get<SessionResponse>("/api/auth/me");
        setCsrfToken(response.data.csrfToken);
        set({ user: response.data.user, isAuthenticated: true, isLoading: false });
      } catch {
        setCsrfToken(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },
  },
}), { name: "Auth Store" }));

export const useAuthActions = () => useAuthStore((state) => state.actions);
