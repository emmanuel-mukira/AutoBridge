import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/auth/useAuth";

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * GuestRoute component that redirects to dashboard if user is already authenticated.
 * Used for login, signup, and other guest-only pages.
 */
export default function GuestRoute({ children }: GuestRouteProps) {
  const { user } = useAuth();

  // Already authenticated - redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Not authenticated - show the page
  return <>{children}</>;
}
