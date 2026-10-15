import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useAuth } from "../app/auth/useAuth";
import { ArrowRight } from "lucide-react";
import banner from "../assets/tazamatech-banner.webp";

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-4 pb-12 sm:pt-6 sm:pb-16 md:pt-8 md:pb-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo/Banner */}
          <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <img 
              src={banner} 
              alt="TazamaTech CRM" 
              className="mx-auto h-28 sm:h-36 w-auto object-contain drop-shadow-lg" 
              style={{ imageRendering: 'crisp-edges' }} 
            />
          </div>

          {/* Main Heading */}
          <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white dark:text-black mb-5 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
            TazamaTech CRM
          </h1>

          {/* Tagline */}
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white dark:text-black mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
            See clearly. Build confidently.
          </p>

          {/* Description */}
          <p className="text-xl sm:text-2xl font-medium text-white dark:text-black max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
            Manage leads, quotes and sales with clarity
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
