import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, Globe, X } from "lucide-react";
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

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  hideForAgency?: boolean;
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/projects", label: "Projects", icon: Briefcase, hideForAgency: true },
  { to: "/agencies", label: "Agencies", icon: Building2, adminOnly: true },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

const STORAGE_KEY = "koundinya-sidebar-collapsed";

function SidebarContent({
  collapsed,
  onItemClick,
  onDesktopCollapse,
  items,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
  onDesktopCollapse?: () => void;
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
              onClick={() => {
                if (onItemClick) onItemClick();
                if (item.to === "/candidates" && onDesktopCollapse) onDesktopCollapse();
              }}
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

    </>
  );
}

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [threeAtomsOpen, setThreeAtomsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const email = user?.email ?? "";
  const visibleNavItems = useMemo(
    () =>
      navItems.filter((i) => {
        if (i.adminOnly && !isAdmin) return false;
        if (i.hideForAgency && !isAdmin) return false;
        return true;
      }),
    [isAdmin]
  );
  const roleLabel = isAdmin ? "Administrator" : "Agency user";

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Animated aurora background */}
      <div className="aurora" aria-hidden="true">
        <div className="blob" />
      </div>

      {/* Desktop Sidebar — fixed full-height, glass dark */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-30 glass-sidebar text-white overflow-y-auto",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} items={visibleNavItems} onDesktopCollapse={() => setCollapsed(true)} />

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
            <SidebarContent collapsed={false} items={visibleNavItems} onItemClick={() => setMobileOpen(false)} />
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
          "relative z-10 flex flex-col min-h-screen min-w-0",
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
                      <p className="text-[10px] text-muted-foreground leading-tight">{roleLabel}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-xs font-medium truncate">{email || "Admin"}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">{roleLabel}</p>
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

        {/* ── ThreeAtoms Footer Watermark ── */}
        <footer className="px-3 sm:px-4 md:px-8 py-3 border-t border-border/30 flex justify-center">
          <button
            onClick={() => setThreeAtomsOpen(true)}
            className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200 tracking-wide"
          >
            Developed by{" "}
            <span className="font-bold tracking-widest text-muted-foreground/70 hover:text-primary transition-colors">
              THREEATOMS
            </span>
          </button>
        </footer>
      </div>

      {/* ── ThreeAtoms Contact Modal ── */}
      {threeAtomsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setThreeAtomsOpen(false); }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up"
            style={{ background: "hsl(var(--background))" }}
          >
            {/* Modal Header */}
            <div className="relative px-6 py-5 flex items-center gap-4" style={{ background: "hsl(var(--primary))" }}>
              <div className="flex flex-col">
                <span className="text-white text-lg font-black tracking-tight leading-tight">ThreeAtoms</span>
                <span className="text-white/60 text-[10px] font-semibold tracking-[0.2em] uppercase">Premium Software</span>
              </div>
              <button
                onClick={() => setThreeAtomsOpen(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This particular website software is developed by{" "}
                <strong className="text-foreground">ThreeAtoms</strong>. We specialize in building
                custom software, <strong className="text-foreground">AI Agents</strong>, and{" "}
                <strong className="text-foreground">AI Automations</strong>. Let&apos;s build something elite.
              </p>

              <div className="flex flex-col gap-2.5">
                {/* Call Button */}
                <a
                  href="tel:+917981596550"
                  className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  <Phone className="h-4 w-4" />
                  Call +91 79815 96550
                </a>

                {/* Website Button */}
                <a
                  href="https://www.threeatoms.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Visit Website
                </a>

                {/* WhatsApp Button */}
                <a
                  href="https://wa.me/917981596550?text=Hello%20ThreeAtoms!%20I%20have%20a%20website%20requirement.%20Please%20get%20in%20touch."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#25D366" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
