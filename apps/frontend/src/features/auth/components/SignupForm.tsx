import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SignupFormProps {
  onSuccess?: () => void;
}

/**
 * Self-registration is disabled — accounts are provisioned by admins
 * and users are onboarded via email invite. This page informs users.
 */
export function SignupForm(_props: SignupFormProps) {
  return (
    <div className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl backdrop-blur-sm">
      <div className="p-8 space-y-6 text-center">
        <div className="mx-auto block w-fit" aria-label="brand">
          <span className="text-xl font-semibold">AutoBridge CRM</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Account Access</h1>
          <p className="text-sm text-muted-foreground">
            Accounts are created by your organisation&apos;s administrator. Contact your admin to request access — you will receive an invite email.
          </p>
        </div>
        <Button asChild className="w-full" size="lg">
          <Link to="/login">Go to Sign In</Link>
        </Button>
      </div>
      <div className="border-t border-border bg-muted/50 px-8 py-4">
        <p className="text-center text-xs text-muted-foreground">
          Already have an invite? Check your email for the activation link.
        </p>
      </div>
    </div>
  );
}
