import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Menu,
} from "lucide-react";
import logo from "@/assets/koundinya-logo.jpeg";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/projects", label: "Projects", icon: Briefcase },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "koundinya-sidebar-collapsed";

function SidebarContent({
  collapsed,
  onItemClick,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-5 border-b border-sidebar-border",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="h-10 w-10 rounded-xl bg-white p-1 shadow-elevated flex items-center justify-center shrink-0">
          <img src={logo} alt="Koundinya logo" className="h-full w-full object-contain" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold tracking-tight text-white truncate">Koundinya</p>
            <p className="text-[11px] text-sidebar-foreground/70 truncate">Workforce Management</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Workspace
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-brand"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white hover:translate-x-0.5"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mx-3 mb-3 rounded-xl p-4 bg-gradient-to-br from-sidebar-accent to-sidebar-background border border-sidebar-border">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold text-white">Pro tip</p>
          </div>
          <p className="text-[11px] text-sidebar-foreground/70 leading-relaxed">
            Use search to find candidates by name or phone instantly.
          </p>
        </div>
      )}
    </>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
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
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-300 ease-out",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} />

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors",
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
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/20 hover:text-white transition-colors",
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
          className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border"
        >
          <div className="flex flex-col h-full">
            <SidebarContent collapsed={false} onItemClick={() => setMobileOpen(false)} />
            <div className="p-3 border-t border-sidebar-border">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/20 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 glass border-b border-border">
          <div className="flex items-center gap-4 px-4 md:px-8 h-16">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="md:hidden flex items-center gap-2">
              <img src={logo} alt="Koundinya" className="h-8 w-8 object-contain" />
              <span className="font-semibold tracking-tight">Koundinya</span>
            </div>

            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Search candidates, projects…"
                  className="pl-9 bg-background/60 border-border/70"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-full p-1 pr-3 hover:bg-muted transition-colors">
                    <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shadow-brand">
                      {initials(email || "A")}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold leading-tight">{email || "Admin"}</p>
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

        <main className="flex-1 px-4 md:px-8 py-6 animate-fade-in-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
