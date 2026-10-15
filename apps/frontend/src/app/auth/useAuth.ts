import { useAuthStore } from "../store";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const authMode = useAuthStore((state) => state.authMode);
  const otpToken = useAuthStore((state) => state.otpToken);
  const actions = useAuthStore((state) => state.actions);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    authMode,
    otpToken,
    login: actions.login,
    logout: actions.logout,
    checkSession: actions.checkSession,
    // New custom auth methods
    loginWithCredentials: actions.loginWithCredentials,
    requestOTP: actions.requestOTP,
    validateOTP: actions.validateOTP,
    setAuthMode: actions.setAuthMode,
    clearError: actions.clearError,
  };
}
