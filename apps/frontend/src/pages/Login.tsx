import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { isAuthenticated, isLoading, error, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { if (isAuthenticated) navigate("/dashboard/clients", { replace: true }); }, [isAuthenticated, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await login(email, password)) navigate("/dashboard/clients", { replace: true });
  }

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-12">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-xl border bg-card p-8 shadow-xl">
        <p className="text-center text-xl font-semibold">AutoBridge CRM</p>
        <h1 className="text-2xl font-bold">Sign in</h1>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        <Button type="submit" disabled={isLoading} className="w-full">{isLoading ? "Signing in..." : "Sign in"}</Button>
      </form>
    </section>
  );
}
