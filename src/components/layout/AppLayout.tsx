import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Menu,
  Sun,
  Moon,
  Building2,
} from "lucide-react";
import logo from "@/assets/koundinya-logo.jpeg";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/projects", label: "Projects", icon: Briefcase },
  { to: "/agencies", label: "Agencies", icon: Building2, adminOnly: true },
  // Reports and Settings temporarily hidden from navigation
  // { to: "/reports", label: "Reports", icon: BarChart3 },
  // { to: "/settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "koundinya-sidebar-collapsed";

function SidebarContent({
  collapsed,
  onItemClick,
  items,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
  items: NavItem[];
}) {
  return (
    <>
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-5 border-b border-white/5",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="relative h-10 w-10 rounded-xl bg-white p-1 shadow-elevated flex items-center justify-center shrink-0">
          <img src={logo} alt="Koundinya logo" className="h-full w-full object-contain" />
          <span className="absolute inset-0 rounded-xl bg-gradient-brand opacity-0 blur-md -z-10 group-hover:opacity-30 transition-opacity" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold tracking-tight text-white truncate">Koundinya</p>
            <p className="text-[11px] text-white/50 truncate">Workforce Management</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Workspace
          </p>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white hover:translate-x-0.5"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <>
                      {/* gradient pill background */}
                      <span className="absolute inset-0 rounded-xl bg-gradient-brand opacity-90" />
                      {/* glow halo */}
                      <span className="absolute inset-0 rounded-xl bg-gradient-brand blur-xl opacity-50 -z-0" />
                      {/* left indicator */}
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white shadow-[0_0_12px_hsl(var(--primary))]" />
                    </>
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0 relative z-10", isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]")} />
                  {!collapsed && (
                    <span className="truncate relative z-10">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mx-3 mb-3 rounded-2xl p-4 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-brand opacity-20 blur-2xl" />
          <div className="relative flex items-center gap-2 mb-1.5">
            <div className="h-5 w-5 rounded-md bg-gradient-brand grid place-items-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <p className="text-xs font-semibold text-white">Pro tip</p>
          </div>
          <p className="relative text-[11px] text-white/60 leading-relaxed">
            Use search to find candidates by name or phone instantly.
          </p>
        </div>
      )}
    </>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const email = user?.email ?? "";

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Animated aurora background */}
      <div className="aurora" aria-hidden="true">
        <div className="blob" />
      </div>

      {/* Desktop Sidebar — fixed full-height, glass dark */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-30 glass-sidebar text-white transition-[width] duration-300 ease-out overflow-y-auto",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} />

        <div className="mt-auto p-3 border-t border-white/5 space-y-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-destructive/20 hover:text-white transition-colors",
              collapsed && "justify-center px-2"
            )}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-72 glass-sidebar text-white border-0"
        >
          <div className="flex flex-col h-full">
            <SidebarContent collapsed={false} onItemClick={() => setMobileOpen(false)} />
            <div className="mt-auto p-3 border-t border-white/5">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-destructive/20 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main — offset by sidebar width on desktop */}
      <div
        className={cn(
          "relative z-10 flex flex-col min-h-screen min-w-0 transition-[margin] duration-300 ease-out",
          collapsed ? "md:ml-[76px]" : "md:ml-64"
        )}
      >
        {/* Floating glass header */}
        <header className="sticky top-0 z-20 glass-strong border-b border-border/40">
          <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-8 h-14 sm:h-16">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-11 w-11 shrink-0"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="md:hidden flex items-center gap-2 min-w-0">
              <img src={logo} alt="Koundinya" className="h-8 w-8 object-contain shrink-0" />
              <span className="font-semibold tracking-tight truncate">Koundinya</span>
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={toggleTheme}
                className="relative h-10 w-10 sm:h-9 sm:w-9"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-full p-1 sm:pr-3 hover:bg-muted/60 transition-colors min-h-[44px]">
                    <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shadow-brand shrink-0">
                      {initials(email || "A")}
                    </div>
                    <div className="hidden sm:block text-left max-w-[140px]">
                      <p className="text-xs font-semibold leading-tight truncate">{email || "Admin"}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Administrator</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-xs font-medium truncate">{email || "Admin"}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Administrator</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-4 md:px-8 py-4 sm:py-6 animate-fade-in-up min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
