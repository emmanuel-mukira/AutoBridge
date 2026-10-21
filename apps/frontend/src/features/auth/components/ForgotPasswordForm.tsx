import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { http } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await http.post("/api/auth/forgot-password", { email });
    } catch {
      // Silently handle — always show success to prevent account enumeration
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl backdrop-blur-sm">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto block w-fit" aria-label="brand">
              <span className="text-xl font-semibold">AutoBridge CRM</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong className="text-foreground">{email}</strong>, a password reset link has been sent.
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 border border-green-200 dark:border-green-900" role="status">
            <p className="text-sm text-green-800 dark:text-green-400">
              The link expires in <strong>1 hour</strong>. Check your spam folder if you don't see it.
            </p>
          </div>
          <Button asChild className="w-full" size="lg" variant="outline">
            <Link to="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl backdrop-blur-sm"
    >
      <div className="p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto block w-fit" aria-label="brand">
            <span className="text-xl font-semibold">AutoBridge CRM</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
            <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <Input
              type="email"
              required
              name="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            size="lg"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </div>
      </div>

      <div className="border-t border-border bg-muted/50 px-8 py-4">
        <p className="text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Button asChild variant="link" className="h-auto p-0 text-sm font-semibold">
            <Link to="/login">Back to login</Link>
          </Button>
        </p>
      </div>
    </form>
  );
}
