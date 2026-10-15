import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { http } from '@/lib/http';
import { queryClient } from '@/lib/query-client';
import { useLeadsStore } from '@/features/leads/store/leadsStore';
import { useQuotationsStore } from '@/features/quotations/store/quotationsStore';
import { autheliaService } from './auth/autheliaService';

// ============================================================================
// UI STORE
// ============================================================================
// Manages global UI state like sidebar visibility and theme preferences.
// Uses 'persist' middleware to save state to localStorage.

interface UIState {
  isSidebarOpen: boolean;
  theme: 'light' | 'dark';
  actions: {
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    setTheme: (theme: 'light' | 'dark') => void;
  };
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        isSidebarOpen: true,
        theme: 'light',
        actions: {
          toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
          setSidebarOpen: (open) => set({ isSidebarOpen: open }),
          setTheme: (theme) => set({ theme }),
        },
      }),
      {
        name: 'ui-storage', // key in localStorage
        partialize: (state) => ({ 
            isSidebarOpen: state.isSidebarOpen,
            theme: state.theme 
        }), // Only persist these fields
      }
    ),
    { name: 'UI Store' }
  )
);

// Helper hook to access UI actions directly
export const useUIActions = () => useUIStore((state) => state.actions);


// ============================================================================
// AUTH STORE
// ============================================================================
// Manages authentication state, user session, and auth-related actions.
// Replaces the traditional React Context approach for better performance and debugging.

export interface AuthUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  groups: string[];
  companyId: number;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // New state for custom auth flow
  authMode: 'sso' | 'custom';
  otpToken: string | null;
  actions: {
    // Existing SSO methods
    login: () => void;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
    setUser: (user: AuthUser | null) => void;
    // New custom auth methods
    loginWithCredentials: (username: string, password: string) => Promise<void>;
    requestOTP: (token: string) => Promise<void>;
    validateOTP: (token: string, code: string) => Promise<void>;
    setAuthMode: (mode: 'sso' | 'custom') => void;
    clearError: () => void;
  };
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start loading to check session on mount
      error: null,
      authMode: 'sso', // Default to SSO redirect flow
      otpToken: null,

      actions: {
        /**
         * Triggers re-authentication via Authelia.
         * In production, Traefik intercepts unauthenticated requests and
         * automatically redirects to the Authelia portal — no hardcoded URL needed.
         * Reloading the page triggers that Traefik → Authelia redirect flow.
         */
        login: () => {
          const autheliaUrl = import.meta.env.VITE_AUTHELIA_URL as string | undefined;
          if (autheliaUrl) {
            window.location.href = `${autheliaUrl}?rd=${encodeURIComponent(window.location.origin)}`;
          } else {
            window.location.reload();
          }
        },

        /**
         * Clears local state then redirects to Authelia logout endpoint.
         * VITE_AUTHELIA_URL must be set (e.g. https://auth.yourdomain.com).
         * Authelia invalidates the session cookie server-side on logout.
         */
        logout: async () => {
          queryClient.clear();
          useLeadsStore.getState().reset();
          useQuotationsStore.getState().reset();
          const draftKeys = Object.keys(localStorage).filter(
            (key) => key.startsWith('form-draft-'),
          );
          draftKeys.forEach((key) => localStorage.removeItem(key));
          set({ user: null, isAuthenticated: false, error: null });
          const autheliaUrl = import.meta.env.VITE_AUTHELIA_URL as string | undefined;
          window.location.href = autheliaUrl ? `${autheliaUrl}/logout` : '/';
        },

        /**
         * Checks the current Authelia session on app load by fetching /api/user/me.
         * Authelia injects Remote-* headers — if the request succeeds, the session is valid.
         * If it returns 401, Authelia has no session → redirect to login.
         */
        checkSession: async () => {
          set({ isLoading: true });
          try {
            const res = await http.get<{ user: AuthUser }>('/api/user/me');
            set({ user: res.data.user, isAuthenticated: true, isLoading: false });
          } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        },

        setUser: (user) => set({ user, isAuthenticated: !!user }),

        /**
         * Set authentication mode (SSO redirect vs custom API)
         */
        setAuthMode: (mode: 'sso' | 'custom') => set({ authMode: mode }),

        /**
         * Clear error state
         */
        clearError: () => set({ error: null }),

        /**
         * Custom login with username/password (no SSO redirect)
         */
        loginWithCredentials: async (username: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await autheliaService.loginFirstFactor({ username, password });
            
            if (response.status === 'OK' && response.data && typeof response.data === 'object' && 'token' in response.data) {
              // First factor successful, store token for OTP
              set({ otpToken: String(response.data.token), isLoading: false });
            } else {
              set({ error: 'Invalid username or password', isLoading: false });
            }
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Login failed';
            set({ error: errorMessage, isLoading: false });
          }
        },

        /**
         * Request OTP code via email
         */
        requestOTP: async (token: string) => {
          set({ isLoading: true, error: null });
          try {
            await autheliaService.requestOTP(token);
            set({ isLoading: false });
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
            set({ error: errorMessage, isLoading: false });
          }
        },

        /**
         * Validate OTP code and complete authentication
         */
        validateOTP: async (token: string, code: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await autheliaService.validateOTP({ token, code });
            
            if (response.status === 'OK') {
              // Get user info and set authenticated state
              const userInfo = await autheliaService.getUserInfo();
              
              // Map Authelia user info to our AuthUser format
              const authUser: AuthUser = {
                id: 0, // Will be resolved by backend
                email: userInfo.email,
                groups: userInfo.groups,
                companyId: 0, // Will be resolved by backend
                firstName: userInfo.displayName.split(' ')[0],
                lastName: userInfo.displayName.split(' ')[1] || '',
              };

              set({ 
                user: authUser, 
                isAuthenticated: true, 
                isLoading: false, 
                otpToken: null,
                error: null 
              });
            } else {
              set({ error: 'Invalid verification code', isLoading: false });
            }
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'OTP validation failed';
            set({ error: errorMessage, isLoading: false });
          }
        },
      },
    }),
    { name: 'Auth Store' }
  )
);

// Helper hook to access Auth actions directly
export const useAuthActions = () => useAuthStore((state) => state.actions);
