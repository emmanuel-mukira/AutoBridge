import { Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApplicationError() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-5 py-10 text-slate-50">
      <section className="w-full max-w-2xl text-center" aria-labelledby="application-error-title">
        <p className="text-sm font-semibold tracking-wide text-blue-300">AutoBridge CRM</p>

        <img
          src="/autobridge-connection-error.webp"
          alt=""
          className="mx-auto mt-4 w-full max-w-md"
        />

        <div className="mx-auto max-w-lg">
          <p className="text-sm font-medium text-amber-300">Temporary connection issue</p>
          <h1
            id="application-error-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            We couldn&apos;t load this screen
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            The connection was interrupted or the application was just updated. Reload to reconnect
            and continue where you left off.
          </p>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden="true" />
            Reload application
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-white"
          >
            <a href="/">
              <Home aria-hidden="true" />
              Go to home
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}
