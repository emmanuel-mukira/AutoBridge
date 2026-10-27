import { useEffect, useState } from "react";
import { http } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { isPasswordStrong } from "@/lib/password-rules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InviteUser {
  firstName: string;
  lastName: string;
  email: string;
}

interface ValidateResponse {
  valid: boolean;
  user: InviteUser;
}

interface AcceptResponse {
  token: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
}

interface InviteAcceptFormProps {
  token: string | null;
  onSuccess: () => void;
  onNavigateLogin: () => void;
}

export function InviteAcceptForm({ token, onSuccess, onNavigateLogin }: InviteAcceptFormProps) {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [inviteUser, setInviteUser] = useState<InviteUser | null>(null);
  const [error, setError] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Validate token
  useEffect(() => {
    if (!token) {
      setError("No invite token provided");
      setValidating(false);
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await http.get<ValidateResponse>(
          `/api/auth/invite/validate?token=${encodeURIComponent(token)}`
        );
        if (res.data.valid && res.data.user) {
          setInviteUser(res.data.user);
        } else {
          setError("Invalid invite token");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to validate invite";
        setError(message);
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    void validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isPasswordStrong(password)) {
      setError("Password does not meet all strength requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("No invite token provided");
      return;
    }

    setSubmitting(true);

    try {
      await http.post<AcceptResponse>("/api/auth/invite/accept", {
        token,
        password,
        confirmPassword,
      });

      // Notify parent to redirect
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to accept invite";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || validating) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Validating invite...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !inviteUser) {
    const isAlreadyActive = error.toLowerCase().includes("already active");
    
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isAlreadyActive ? "Account Already Active" : "Invalid Invite"}
          </CardTitle>
          <CardDescription className={isAlreadyActive ? "" : "text-destructive"}>
            {isAlreadyActive 
              ? "This account is already active. You can log in with your existing password."
              : error
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onNavigateLogin} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Accept Invite</CardTitle>
        <CardDescription>
          Welcome, {inviteUser?.firstName} {inviteUser?.lastName}! Set your password to activate
          your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={inviteUser?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <PasswordInput
              id="password"
              placeholder="Enter a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !isPasswordStrong(password) || password !== confirmPassword}>
            {submitting ? "Activating Account..." : "Activate Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
