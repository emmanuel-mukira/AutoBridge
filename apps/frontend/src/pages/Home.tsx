import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, ClipboardCheck, MessagesSquare, Target } from "lucide-react";
import { useAuth } from "../app/auth/useAuth";
import { Button } from "../components/ui/button";
import { AutoBridgeLogo } from "../components/AutoBridgeLogo";

const capabilities = [
  { title: "Opportunity Management", description: "Track clients, sales opportunities and pipeline progression in one workspace.", icon: Target },
  { title: "Sales Activities", description: "Manage interactions, follow-ups and quotations around every client relationship.", icon: ClipboardCheck },
  { title: "Win Probability Scoring", description: "Generate Random Forest estimates for eligible automotive sales opportunities.", icon: BarChart3 },
  { title: "Explainable Decision Support", description: "Review SHAP explanations, saved prediction history and human assessments.", icon: MessagesSquare },
];

export default function Home() {
  const { user } = useAuth();
  const primaryRoute = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Open Dashboard" : "Get Started";

  return (
    <div className="bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="relative mx-auto min-h-[34rem] max-w-7xl overflow-hidden rounded-2xl bg-slate-950 sm:min-h-[39rem]">
          <img src="/images/backgrounds/Auto-imag1.png" alt="Automotive sales professionals reviewing information in a parts showroom" className="absolute inset-0 h-full w-full object-cover object-[58%_center] sm:object-center" fetchPriority="high" />
          <div className="absolute inset-0 bg-slate-950/50 sm:bg-gradient-to-r sm:from-slate-950/80 sm:via-slate-950/45 sm:to-transparent" />
          <div className="relative flex min-h-[34rem] items-end px-6 py-10 sm:min-h-[39rem] sm:items-center sm:px-10 lg:px-16">
            <div className="max-w-2xl text-white">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Automotive sales intelligence</p>
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Manage Opportunities. Make Informed Sales Decisions.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">AutoBridge brings B2B automotive sales opportunities, client relationships and win probability insights into one platform.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-blue-600 text-white hover:bg-blue-700"><Link to={primaryRoute}>{primaryLabel}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                {!user && <Button asChild size="lg" variant="outline" className="border-white/50 bg-white/5 text-white hover:bg-white hover:text-slate-950"><Link to="/login">Sign In</Link></Button>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-20 lg:px-8" aria-labelledby="platform-heading">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">One connected platform</p>
            <h2 id="platform-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Built around the automotive sales cycle</h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">AutoBridge is a sales opportunity management and predictive decision-support system for automotive parts and accessories suppliers. It keeps commercial activity, client context and model evidence connected without replacing human judgement.</p>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 px-6 py-16 dark:border-slate-800 dark:bg-slate-900/60 sm:py-20 lg:px-8" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Core capabilities</p>
            <h2 id="features-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From client activity to explainable insight</h2>
          </div>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ title, description, icon: Icon }) => (
              <article key={title} className="border-t border-slate-300 pt-6 dark:border-slate-700">
                <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-24 lg:px-8" aria-labelledby="industry-heading">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-2">
          <img src="/images/backgrounds/Auto-image2-parts.png" alt="Automotive sales professionals examining a brake component" className="h-80 w-full object-cover object-center sm:h-[28rem] lg:h-full" loading="lazy" />
          <div className="flex items-center p-8 sm:p-12 lg:p-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Automotive B2B operations</p>
              <h2 id="industry-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Commercial context stays close to every decision</h2>
              <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-300">Connect parts enquiries, client history, quotations and follow-up activity with a clear view of each opportunity. Sales teams can prioritise work while retaining the evidence behind every model-assisted estimate.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-16 text-white sm:py-20 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div><h2 className="text-3xl font-bold tracking-tight">Bring your sales opportunities into focus.</h2><p className="mt-3 text-slate-300">Access AutoBridge to manage the pipeline and review decision-support evidence.</p></div>
          <div className="flex shrink-0 gap-3">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700"><Link to={primaryRoute}>{primaryLabel}</Link></Button>
            {!user && <Button asChild size="lg" variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-white hover:text-slate-950"><Link to="/login">Sign In</Link></Button>}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-900 px-6 text-slate-300 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 py-10 sm:grid-cols-[1fr_auto] sm:items-start sm:py-12">
            <div className="max-w-md">
              <AutoBridgeLogo className="text-white" />
              <p className="mt-4 text-sm leading-6 text-slate-400">Automotive opportunity management and explainable decision support for focused sales teams.</p>
            </div>
            <nav className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:grid-cols-1" aria-label="Footer navigation">
              <Link to="/" className="transition-colors hover:text-white">Home</Link>
              <a href="#features" className="transition-colors hover:text-white">Features</a>
              <Link to={user ? "/dashboard" : "/login"} className="transition-colors hover:text-white">{user ? "Dashboard" : "Sign In"}</Link>
              {!user && <Link to="/signup" className="transition-colors hover:text-white">Get Started</Link>}
            </nav>
          </div>
          <div className="border-t border-slate-800 py-5 text-xs text-slate-500">
            © {new Date().getFullYear()} AutoBridge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
