import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useAuth } from "../app/auth/useAuth";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-4 pb-12 sm:pt-6 sm:pb-16 md:pt-8 md:pb-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Main Heading */}
          <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-foreground mb-5 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
            AutoBridge CRM
          </h1>

          {/* Tagline */}
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
            Connect customers. Move opportunities forward.
          </p>

          {/* Description */}
          <p className="text-xl sm:text-2xl font-medium text-muted-foreground max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
            Keep automotive sales relationships and follow-ups in one place.
          </p>

          {/* CTA Section */}
          <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-400">
            <Button
              asChild
              size="lg"
              className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:scale-105"
            >
              <Link to={user ? "/dashboard" : "/login"} className="flex items-center gap-2">
                {user ? "Go to Dashboard" : "Get Started"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
