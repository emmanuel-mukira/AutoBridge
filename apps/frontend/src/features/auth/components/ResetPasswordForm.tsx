import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { http } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { isPasswordStrong } from "@/lib/password-rules";

interface ResetPasswordFormProps {
  token: string;
  email: string;
}

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordStrong(password)) {
      setError("Password does not meet all strength requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await http.post("/api/auth/reset-password", {
        email,
        token,
        newPassword: password,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl backdrop-blur-sm">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto block w-fit" aria-label="brand">
              <span className="text-xl font-semibold">AutoBridge CRM</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Password Reset</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been reset successfully.
              </p>
            </div>
          </div>
          <Button asChild className="w-full" size="lg">
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl backdrop-blur-sm"
    >
      <div className="p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto block w-fit" aria-label="brand">
            <span className="text-xl font-semibold">AutoBridge CRM</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
            <p className="text-sm text-muted-foreground">
              Create a strong password for <strong className="text-foreground">{email}</strong>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-password" className="block text-sm font-medium">
              New Password
            </label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              required
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="block text-sm font-medium">
              Confirm Password
            </label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20" role="alert">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            disabled={loading || !isPasswordStrong(password) || password !== confirmPassword}
            size="lg"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </div>

      <div className="border-t border-border bg-muted/50 px-8 py-4">
        <p className="text-center text-xs text-muted-foreground">
          <Button asChild variant="link" className="h-auto p-0 text-xs">
            <Link to="/login">Back to login</Link>
          </Button>
        </p>
      </div>
    </form>
  );
}
