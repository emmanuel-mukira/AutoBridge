import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/useAuth";
import { InviteAcceptForm } from "@/features/auth/components/InviteAcceptForm";
import { Card, CardContent } from "@/components/ui/card";

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = searchParams.get("token");
  
  const [loggingOut, setLoggingOut] = useState(true);

  // Step 1: Logout current user if logged in
  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
      } catch {
        // Ignore logout errors
      } finally {
        setLoggingOut(false);
      }
    };
    void performLogout();
  }, [logout]);

  const handleSuccess = () => {
    // Do NOT auto-login - redirect to login page instead
    // This prevents cookie conflicts with other logged-in users (e.g., admin in another tab)
    navigate("/login", { 
      state: { 
        message: "Account activated! Please log in with your new password." 
      },
      replace: true,
    });
  };

  const handleNavigateLogin = () => {
    navigate("/login");
  };

  if (loggingOut) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Preparing invite...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <InviteAcceptForm 
        token={token} 
        onSuccess={handleSuccess} 
        onNavigateLogin={handleNavigateLogin} 
      />
    </main>
  );
}
