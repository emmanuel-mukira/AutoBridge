import { useState } from "react";
import { useAuth } from "@/app/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/tazamatech-logo.webp";

interface LoginFormProps {
  onSuccess?: () => void;
  successMessage?: string;
}

/**
 * LoginForm — Authelia SSO flow with custom API option.
 * 
 * Two modes:
 * 1. SSO: Traditional redirect to Authelia portal (default)
 * 2. Custom: Direct API calls with email 2FA
 */
export function LoginForm({ successMessage }: LoginFormProps) {
  const { login, authMode, setAuthMode, loginWithCredentials, requestOTP, otpToken, isLoading, error, clearError } = useAuth();
  const [showCustomLogin, setShowCustomLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await loginWithCredentials(credentials.username, credentials.password);
    
    // If login successful and we have OTP token, request OTP
    if (otpToken) {
      await requestOTP(otpToken);
      // Navigate to OTP screen or show OTP input
      // This would be handled by the parent component
    }
  };

  return (
    <div className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl backdrop-blur-sm">
      <div className="p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto block w-fit" aria-label="brand">
            <img
              src={logo}
              alt="TazamaTech CRM"
              className="mx-auto h-12 w-auto object-contain"
              style={{ imageRendering: "crisp-edges" }}
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              {showCustomLogin ? "Enter your credentials" : "Sign in with your TazamaTech SSO account"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {successMessage && (
            <div
              className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 border border-green-200 dark:border-green-900"
              role="status"
            >
              <p className="text-sm text-green-800 dark:text-green-400">
                {successMessage}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!showCustomLogin ? (
            // SSO Login Mode
            <>
              <Button
                type="button"
                onClick={login}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in with SSO"
                )}
              </Button>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomLogin(true)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Sign in with username and password
                </Button>
              </div>
            </>
          ) : (
            // Custom Login Mode
            <form onSubmit={handleCustomLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomLogin(false)}
                >
                  Back to SSO login
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-muted/50 px-8 py-4">
        <p className="text-center text-xs text-muted-foreground">
          {showCustomLogin 
            ? "Sign in with email 2FA verification" 
            : "Authentication is managed by your organisation's SSO provider."
          }
        </p>
      </div>
    </div>
  );
}
