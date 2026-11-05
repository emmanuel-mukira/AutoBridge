import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/useAuth";
import type { AuthUser } from "@/app/store";
import { AuthFrame } from "@/features/auth/components/AuthFrame";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { http } from "@/lib/http";
import { isPasswordStrong } from "@/lib/password-rules";

export default function ChangePassword() {
  const { user, refreshUser } = useAuth(); const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (newPassword !== confirm) return setError("New passwords do not match.");
    if (!isPasswordStrong(newPassword)) return setError("New password does not meet the listed requirements.");
    setLoading(true);
    try { const response = await http.patch<{ user: AuthUser }>("/api/auth/password", { currentPassword, newPassword }); refreshUser(response.data.user); navigate("/dashboard", { replace: true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Password change failed"); }
    finally { setLoading(false); }
  }
  return <AuthFrame><form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-xl sm:p-8"><div><h1 className="text-3xl font-bold">Change password</h1><p className="mt-2 text-sm text-muted-foreground">{user?.mustChangePassword ? "You must set a private password before using AutoBridge." : "Update your account password."}</p></div>{error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<div className="space-y-2"><Label htmlFor="currentPassword">Current password</Label><PasswordInput id="currentPassword" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoFocus /></div><div className="space-y-2"><Label htmlFor="newPassword">New password</Label><PasswordInput id="newPassword" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /><PasswordStrengthIndicator password={newPassword} /></div><div className="space-y-2"><Label htmlFor="confirmNewPassword">Confirm new password</Label><PasswordInput id="confirmNewPassword" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div><Button className="w-full" size="lg" disabled={loading}>{loading ? "Saving…" : "Save password"}</Button></form></AuthFrame>;
}
