import { BarChart3, ShieldCheck } from "lucide-react";

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid min-h-[calc(100dvh-4rem)] bg-slate-50 dark:bg-slate-950 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-950 px-12 py-16 text-white lg:flex lg:items-center lg:justify-center xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,.35),transparent_45%)]" />
        <div className="relative w-full max-w-xl lg:-translate-y-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">Automotive opportunity intelligence</p>
          <h2 className="mt-5 max-w-lg text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">Turn sales activity into accountable decisions.</h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Manage clients, quotations and opportunities while keeping probability guidance, commercial judgment and actual outcomes distinct.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5"><ShieldCheck className="mb-4 h-5 w-5 text-blue-300" /><p className="font-medium">Role-controlled access</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5"><BarChart3 className="mb-4 h-5 w-5 text-blue-300" /><p className="font-medium">Auditable decision support</p></div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8"><div className="w-full max-w-md">{children}</div></div>
    </section>
  );
}
