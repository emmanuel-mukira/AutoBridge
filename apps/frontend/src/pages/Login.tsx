import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/useAuth";
import { AuthFrame } from "@/features/auth/components/AuthFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";

export default function Login() {
  const { isAuthenticated, isLoading, error, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { if (isAuthenticated) navigate("/dashboard", { replace: true }); }, [isAuthenticated, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await login(email, password)) navigate("/dashboard", { replace: true });
  }

  return (
    <AuthFrame><form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-xl sm:p-8"><div><p className="text-sm font-semibold text-primary lg:hidden">AutoBridge</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Welcome back</h1><p className="mt-2 text-sm text-muted-foreground">Sign in with your approved company account.</p></div>{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><PasswordInput id="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><Button type="submit" disabled={isLoading} className="w-full" size="lg">{isLoading ? "Signing in…" : "Sign in"}</Button><p className="text-center text-sm text-muted-foreground">Need an account? <Link className="font-medium text-primary hover:underline" to="/signup">Request access</Link></p></form></AuthFrame>
  );
}
