import { useSearchParams } from "react-router-dom";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return (
      <section className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl backdrop-blur-sm">
          <div className="p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto block w-fit" aria-label="brand">
                <span className="text-xl font-semibold">AutoBridge CRM</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Invalid Reset Link</h1>
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid or has expired.
                </p>
              </div>
            </div>
            <Button asChild className="w-full" size="lg">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-12">
      <ResetPasswordForm token={token} email={email} />
    </section>
  );
}
