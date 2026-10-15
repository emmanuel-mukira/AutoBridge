import { useState, type FormEvent, type ChangeEvent, useRef, useEffect, useCallback } from "react";
import { http } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/app/store";
import type { AuthUser } from "@/app/store";
import logo from "@/assets/tazamatech-logo.webp";

interface MfaVerifyFormProps {
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}

interface MfaVerifyResponse {
  message: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    groups: string[];
    companyId: number;
  };
}

const RESEND_COOLDOWN_SECONDS = 60;

export function MfaVerifyForm({ email, onSuccess, onBack }: MfaVerifyFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setUser = useAuthStore((state) => state.actions.setUser);

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCountdown]);

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await http.post<MfaVerifyResponse>("/api/auth/mfa/verify", {
        email,
        code,
      });
      const user: AuthUser = {
        id: res.data.user.id,
        firstName: res.data.user.firstName,
        lastName: res.data.user.lastName,
        email: res.data.user.email,
        groups: res.data.user.groups,
        companyId: res.data.user.companyId,
      };
      setUser(user);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setError(null);
    setResendMessage(null);
    try {
      await http.post("/api/auth/mfa/send", { email });
      setResendMessage("A new code has been sent to your email.");
      startCountdown();
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <form
      onSubmit={handleVerify}
      className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl backdrop-blur-sm"
    >
      <div className="p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto block w-fit" aria-label="brand">
            <img src={logo} alt="TazamaTech CRM" className="mx-auto h-12 w-auto object-contain" style={{ imageRendering: 'crisp-edges' }} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Verify your identity</h1>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="mfa-code" className="block text-sm font-medium">
              Verification Code
            </label>
            <Input
              ref={inputRef}
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              required
            />
          </div>

          {resendMessage && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 border border-green-200 dark:border-green-900" role="status">
              <p className="text-sm text-green-800 dark:text-green-400">{resendMessage}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20" role="alert">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            disabled={loading || code.length !== 6}
            size="lg"
          >
            {loading ? "Verifying..." : "Verify Code"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleResend}
              disabled={resending || countdown > 0}
            >
              {resending
                ? "Sending..."
                : countdown > 0
                ? `Resend code (${countdown}s)`
                : "Resend code"}
            </Button>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={onBack}
            >
              Back to login
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-muted/50 px-8 py-4">
        <p className="text-center text-xs text-muted-foreground">
          The code expires in 10 minutes. Check your spam folder if you don't see it.
        </p>
      </div>
    </form>
  );
}
