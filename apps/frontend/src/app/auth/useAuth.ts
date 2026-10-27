import { useAuthStore } from "../store";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const actions = useAuthStore((state) => state.actions);
  return { user, isAuthenticated, isLoading, error, login: actions.login, logout: actions.logout, checkSession: actions.checkSession };
}
