import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useEffect, useState, useCallback, memo } from "react";
import { useAuth } from "@/app/auth/useAuth";
import { SidebarLinks } from "./Sidebar";
import { useUIActions, useUIStore } from "@/app/store";

function NavbarComponent() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onDashboard = location.pathname.startsWith("/dashboard");
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const { setDisplayCurrency } = useUIActions();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  }, [theme]);
  
  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-900">
      <div className="flex h-16 items-center px-4 md:px-6 gap-4">
        {/* Mobile Menu */}
        <div className="md:hidden mr-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px] p-0">
              <SheetHeader className="p-4 border-b text-left">
                <SheetTitle>AutoBridge CRM</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <nav className="flex flex-col gap-1 px-2">
                  <Link 
                    to="/" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Home
                  </Link>
                  <Link 
                    to={user ? "/dashboard" : "/login"} 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Dashboard
                  </Link>
                </nav>
                {onDashboard && (
                  <>
                    <div className="my-4 border-t" />
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                      Dashboard
                    </div>
                    <SidebarLinks />
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Brand / Logo - Only show on non-dashboard pages */}
        {!onDashboard && (
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="text-lg">AutoBridge CRM</span>
          </Link>
        )}

        {/* Search Bar (Desktop) */}
        {/* <div className="hidden md:flex items-center flex-1 max-w-md ml-6">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full bg-background pl-9 md:w-[300px] lg:w-[400px]"
            />
          </div>
        </div> */}

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayCurrency(displayCurrency === "KES" ? "USD" : "KES")}
            aria-label={`Display currency is ${displayCurrency}. Switch to ${displayCurrency === "KES" ? "USD" : "KES"}`}
            title="Display currency only; stored values and predictions do not change"
          >
            {displayCurrency}
          </Button>
          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="text-muted-foreground"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications Placeholder */}
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User Profile */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user.firstName} {user.lastName}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Link to="/login">
              <Button>Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export const Navbar = memo(NavbarComponent);
