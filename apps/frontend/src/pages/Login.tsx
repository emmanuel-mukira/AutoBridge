import { useEffect } from "react";
import { useAuth } from "@/app/auth/useAuth";
import logo from "@/assets/tazamatech-logo.webp";

/**
 * Login page — Authelia SSO flow.
 *
 * In production: Traefik intercepts unauthenticated requests before they reach
 * the app and redirects the browser to the Authelia portal automatically.
 * This page is shown only in dev (no Traefik) or as a brief transitional state.
 *
 * Clicking "Sign in" reloads the page, which triggers the Traefik → Authelia
 * redirect chain.
 */
export default function Login() {
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      window.location.replace("/dashboard");
    }
  }, [isAuthenticated]);

  return (
    <section className="relative flex min-h-screen items-center justify-center px-4 py-12 overflow-hidden">
      <div className="bg-card m-auto h-fit w-full max-w-md overflow-hidden rounded-xl border border-border shadow-xl">
        <div className="p-8 space-y-6 text-center">
          <div className="mx-auto block w-fit">
            <img
              src={logo}
              alt="TazamaTech CRM"
              className="mx-auto h-12 w-auto object-contain"
              style={{ imageRendering: "crisp-edges" }}
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your TazamaTech SSO account
            </p>
          </div>
          <button
            onClick={login}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Sign in with SSO
          </button>
        </div>
        <div className="border-t border-border bg-muted/50 px-8 py-4">
          <p className="text-center text-xs text-muted-foreground">
            Authentication is managed by your organisation&apos;s SSO provider.
          </p>
        </div>
      </div>
    </section>
  );
}
