import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import PrelineLoader from "@/components/PrelineLoader";

export default function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PrelineLoader />
      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster 
        richColors 
        position="bottom-right" 
        expand={false}
        visibleToasts={3}
        duration={3000}
        closeButton
        toastOptions={{
          classNames: {
            closeButton: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20',
            error: 'duration-10000', // Errors stick around longer so user must click X
          },
        }}
      />
    </div>
  );
}
