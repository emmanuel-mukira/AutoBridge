import { type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { useUIStore } from "@/app/store";

export interface DashboardLayoutProps {
  children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

  return (
    <div className="min-h-dvh bg-background overflow-x-hidden">
      {/* Desktop Sidebar - Fixed position */}
      <Sidebar />
      
      <div 
        className={`flex flex-col min-w-0 overflow-x-hidden relative transition-[padding-left] duration-200 ease-out ${
          isSidebarOpen ? 'sm:pl-64' : 'sm:pl-[60px]'
        }`}
      >
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-3 pb-4 sm:px-4 sm:pt-4 lg:px-6 lg:pt-6">
          <div className="w-full max-w-full">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
