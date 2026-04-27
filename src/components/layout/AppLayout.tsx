import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, LogOut, Search, Bell } from "lucide-react";
import logo from "@/assets/koundinya-logo.jpeg";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/projects", label: "Projects", icon: Briefcase },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const email = user?.email ?? "";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="h-10 w-10 rounded-lg bg-white p-1 shadow-card flex items-center justify-center">
            <img src={logo} alt="Koundinya logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">Koundinya</p>
            <p className="text-[11px] text-sidebar-foreground/70">Workforce Management</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-brand"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border">
          <div className="flex items-center gap-4 px-4 md:px-8 h-16">
            <div className="md:hidden flex items-center gap-2">
              <img src={logo} alt="Koundinya" className="h-8 w-8 object-contain" />
              <span className="font-semibold">Koundinya</span>
            </div>
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search candidates, projects…" className="pl-9 bg-background" />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-sm font-semibold shadow-brand">
                  {initials(email || "A")}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium leading-tight">{email || "Admin"}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
