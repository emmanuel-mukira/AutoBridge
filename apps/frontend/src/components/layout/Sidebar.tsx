import { memo } from "react";
import { NavLink, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  ChevronsLeft, 
  ChevronsRight,
  Kanban,
  Building2,
  FileText,
  Calendar,
  MessageSquare,
  FileSearch
} from "lucide-react";
import { useAuth } from "@/app/auth/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore, useUIActions } from "@/app/store";
import logo from "../../assets/tazamatech-logo.webp";

type SidebarLinksProps = {
  collapsed?: boolean;
};

export const SidebarLinks = memo(function SidebarLinks({ collapsed = false }: SidebarLinksProps) {
  const { user } = useAuth();
  const isAdmin = user?.groups.includes("admin") ?? false;

  const regularLinks = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/dashboard/leads", label: "Leads", icon: Kanban },
    { to: "/dashboard/customers", label: "Customers", icon: Building2 },
    { to: "/dashboard/quotations", label: "Quotations", icon: FileText },
    { to: "/dashboard/call-planner", label: "Call Planner", icon: Calendar },
    { to: "/dashboard/interactions", label: "Interactions", icon: MessageSquare },
  ];

  const adminLinks = [
    { to: "/dashboard/users", label: "Users", icon: Users },
    { to: "/dashboard/audit-logs", label: "Audit Logs", icon: FileSearch },
  ];

  return (
    <nav className="flex flex-col px-2">
      <div className="space-y-2">
        <div className="space-y-1">
          {regularLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm" 
                    : "text-muted-foreground hover:bg-muted/50",
                  collapsed && "justify-center px-2"
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </div>

        {isAdmin && (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</h3>
              </div>
            )}
            {adminLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                    isActive 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "text-muted-foreground hover:bg-muted/50",
                    collapsed && "justify-center px-2"
                  )
                }
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        )}

        <div className="pt-2 border-t">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-muted/50",
                collapsed && "justify-center px-2"
              )
            }
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Settings</span>}
          </NavLink>
        </div>
      </div>
    </nav>
  );
});

export function Sidebar() {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const { toggleSidebar } = useUIActions();
  const collapsed = !isSidebarOpen;
  const { user } = useAuth();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "group hidden sm:flex flex-col border-r bg-card fixed left-0 top-0 bottom-0 h-screen z-50",
        "will-change-transform transition-transform duration-200 ease-out",
        collapsed ? "w-[60px]" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center px-3 shrink-0 border-b bg-card relative z-10", collapsed ? "justify-center" : "justify-between")}>
         {!collapsed && (
           <Link to="/" className="flex items-center">
             <img
               src={logo}
               alt="TazamaTech CRM"
               className="h-14 w-auto object-contain ml-2 cursor-pointer hover:opacity-80 transition-opacity"
               style={{ imageRendering: 'crisp-edges' }}
             />
           </Link>
         )}
         <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 text-foreground hover:text-primary hover:bg-primary/10 shrink-0 relative z-20 border border-border/40",
              collapsed ? "" : "ml-auto"
            )}
            onClick={toggleSidebar}
          >
            {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        <SidebarLinks collapsed={collapsed} />
      </div>
      
      <div className="shrink-0 p-3 border-t bg-muted/5">
        {!collapsed ? (
          <div className="px-1">
            <p className="text-sm font-semibold truncate">{user?.firstName || ''} {user?.lastName || ''}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
