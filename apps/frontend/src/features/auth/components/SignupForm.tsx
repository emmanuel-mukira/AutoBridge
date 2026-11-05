import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { isPasswordStrong } from "@/lib/password-rules";
import { http } from "@/lib/http";

export function SignupForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (!isPasswordStrong(form.password)) return setError("Password does not meet the listed requirements.");
    setLoading(true);
    try {
      await http.post("/api/auth/register", { firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      setComplete(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Registration failed"); }
    finally { setLoading(false); }
  }

  if (complete) return <div className="rounded-2xl border bg-card p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h1 className="mt-4 text-2xl font-bold">Registration received</h1><p className="mt-3 text-sm text-muted-foreground">Your Sales Representative account is pending administrator approval. You cannot access company records until it is approved.</p><Button asChild className="mt-6 w-full"><Link to="/login">Return to sign in</Link></Button></div>;

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-xl sm:p-8"><div><p className="text-sm font-semibold text-primary lg:hidden">AutoBridge</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Request access</h1><p className="mt-2 text-sm text-muted-foreground">Create a pending Sales Representative account for administrator approval.</p></div>{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="firstName">First name</Label><Input id="firstName" autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required autoFocus /></div><div className="space-y-2"><Label htmlFor="lastName">Last name</Label><Input id="lastName" autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div></div><div className="space-y-2"><Label htmlFor="signupEmail">Email address</Label><Input id="signupEmail" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div><div className="space-y-2"><Label htmlFor="signupPassword">Password</Label><PasswordInput id="signupPassword" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /><PasswordStrengthIndicator password={form.password} /></div><div className="space-y-2"><Label htmlFor="confirmPassword">Confirm password</Label><PasswordInput id="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required /></div><Button className="w-full" size="lg" type="submit" disabled={loading}>{loading ? "Submitting…" : "Submit registration"}</Button><p className="text-center text-sm text-muted-foreground">Already approved? <Link className="font-medium text-primary hover:underline" to="/login">Sign in</Link></p></form>;
}
