import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/auth/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute component that redirects to login if user is not authenticated.
 * Optionally requires admin role.
 */
export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Still checking session - show nothing to prevent flash of redirect
  if (isLoading) {
    return null;
  }

  // Send unauthenticated users to the application login page.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but requires admin role
  if (requireAdmin && !user.groups.includes("admin")) {
    return <Navigate to="/" replace />;
  }

  // Authenticated and authorized
  return <>{children}</>;
}
