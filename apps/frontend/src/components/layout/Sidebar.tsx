import { memo } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  ChevronsLeft,
  ChevronsRight,
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  MessagesSquare,
  LayoutDashboard,
  FileText,
  PackageSearch,
  BrainCircuit,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/app/auth/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore, useUIActions } from "@/app/store";
import { AutoBridgeLogo } from "@/components/AutoBridgeLogo";

type SidebarLinksProps = {
  collapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
};

export const SidebarLinks = memo(function SidebarLinks({
  collapsed = false,
  mobile = false,
  onNavigate,
}: SidebarLinksProps) {
  const { user } = useAuth();
  const groups: { label: string; links: { to: string; label: string; icon: LucideIcon; end?: boolean }[] }[] = [
    { label: "Overview", links: [
      { to: "/dashboard", label: "Analytics", icon: LayoutDashboard, end: true },
      { to: "/dashboard/decision-support", label: "Decision Support", icon: BrainCircuit },
    ] },
    { label: "Sales", links: [
      { to: "/dashboard/clients", label: "Clients", icon: Building2 },
      { to: "/dashboard/opportunities", label: "Opportunities", icon: BriefcaseBusiness },
      { to: "/dashboard/quotations", label: "Quotations", icon: FileText },
      { to: "/dashboard/products", label: "Products", icon: PackageSearch },
    ] },
    { label: "Activities", links: [
      { to: "/dashboard/follow-ups", label: "Follow-ups", icon: CalendarClock },
      { to: "/dashboard/interactions", label: "Interactions", icon: MessagesSquare },
    ] },
    ...(user?.role === "ADMIN" ? [{ label: "Administration", links: [
      { to: "/dashboard/users", label: "User Management", icon: Users },
    ] }] : []),
  ];

  return (
    <nav className="flex flex-col gap-3 px-2" aria-label="Workspace navigation">
      {groups.map((group, index) => (
        <section key={group.label} aria-label={group.label} className={cn(index > 0 && "border-t pt-3", mobile ? "border-border" : "border-sidebar-border")}>
          <p className={cn("mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider", collapsed && "sr-only", mobile ? "text-muted-foreground" : "text-sidebar-foreground/60")}>{group.label}</p>
          <div className="space-y-1">
          {group.links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  mobile && "min-h-11",
                  isActive
                    ? mobile ? "bg-primary/10 text-primary" : "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : mobile ? "text-foreground hover:bg-muted" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2",
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
          </div>
        </section>
      ))}
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
        "group hidden sm:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground fixed left-0 top-0 bottom-0 h-screen z-50",
        "will-change-transform transition-transform duration-200 ease-out",
        collapsed ? "w-[60px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center px-3 shrink-0 border-b border-sidebar-border relative z-10",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <Link to="/" aria-label="AutoBridge home"><AutoBridgeLogo /></Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 text-slate-200 hover:text-white hover:bg-sidebar-accent shrink-0 relative z-20 border border-sidebar-border",
            collapsed ? "" : "ml-auto",
          )}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5" />
          ) : (
            <ChevronsLeft className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <SidebarLinks collapsed={collapsed} />
      </div>

      <div className="shrink-0 p-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="px-1">
            <p className="text-sm font-semibold truncate">
              {user?.firstName || ""} {user?.lastName || ""}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {user?.email || ""}
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {user?.firstName?.[0] || "U"}
              {user?.lastName?.[0] || ""}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
