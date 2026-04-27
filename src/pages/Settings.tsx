import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Sliders,
  Info,
  AlertTriangle,
  LogOut,
  Moon,
  Sun,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

const APP_VERSION = "1.0.0";
const FIREBASE_PROJECT_ID = "workforce-management-sys-f3960";
const PREFS_KEY = "koundinya-preferences";

interface Preferences {
  defaultStatus: string;
  defaultSource: string;
}

function loadPrefs(): Preferences {
  if (typeof window === "undefined")
    return { defaultStatus: "all", defaultSource: "all" };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        defaultStatus: parsed.defaultStatus ?? "all",
        defaultSource: parsed.defaultSource ?? "all",
      };
    }
  } catch {
    /* noop */
  }
  return { defaultStatus: "all", defaultSource: "all" };
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState<string>(user?.displayName ?? "");
  const [prefs, setPrefs] = useState<Preferences>(() => loadPrefs());

  function saveProfile() {
    // UI only — does not touch Firebase Auth profile
    toast.success("Profile saved", {
      description: "Your display name has been updated locally.",
    });
  }

  function savePrefs(next: Partial<Preferences>) {
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    try {
      const existing = window.localStorage.getItem(PREFS_KEY);
      const merged = { ...(existing ? JSON.parse(existing) : {}), ...updated };
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
    } catch {
      /* noop */
    }
  }

  function handleThemeToggle(checked: boolean) {
    const next = checked ? "dark" : "light";
    setTheme(next);
    toast.success(`Switched to ${next} mode`);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const email = user?.email ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, preferences, and account."
      />

      {/* Profile */}
      <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Profile settings</h3>
            <p className="text-xs text-muted-foreground">
              Information about your account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-muted/40 border border-border/60">
          <div className="h-14 w-14 rounded-full bg-gradient-brand text-white grid place-items-center text-base font-semibold shadow-brand shrink-0">
            {initials(name || email || "A")}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{name || email || "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">
              Administrator · Koundinya
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-muted-foreground font-normal">(read-only)</span>
            </Label>
            <Input id="email" value={email} readOnly disabled />
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <Button variant="premium" onClick={saveProfile}>
            <Save className="h-4 w-4 mr-1.5" />
            Save changes
          </Button>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-secondary/10 text-secondary grid place-items-center">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Preferences</h3>
            <p className="text-xs text-muted-foreground">
              Customize how the app looks and behaves for you.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-9 w-9 rounded-lg grid place-items-center transition-colors",
                  theme === "dark"
                    ? "bg-foreground text-background"
                    : "bg-warning/10 text-warning"
                )}
              >
                {theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Toggle between light and dark interface.
                </p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={handleThemeToggle}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Default candidate status filter</Label>
              <Select
                value={prefs.defaultStatus}
                onValueChange={(v) => savePrefs({ defaultStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default availability filter</Label>
              <Select
                value={prefs.defaultSource}
                onValueChange={(v) => savePrefs({ defaultSource: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All candidates</SelectItem>
                  <SelectItem value="available">Available only</SelectItem>
                  <SelectItem value="assigned">Assigned only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* System Info */}
      <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">System info</h3>
            <p className="text-xs text-muted-foreground">
              Read-only details about your environment.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="p-4 rounded-xl border border-border/60 bg-muted/30">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Firebase project ID
            </p>
            <p className="text-sm font-mono mt-1 truncate">{FIREBASE_PROJECT_ID}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/60 bg-muted/30">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              App version
            </p>
            <p className="text-sm font-mono mt-1">v{APP_VERSION}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/60 bg-muted/30">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Signed in as
            </p>
            <p className="text-sm font-mono mt-1 truncate">{email || "—"}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/60 bg-muted/30">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Environment
            </p>
            <p className="text-sm font-mono mt-1">Production</p>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 shadow-card border-destructive/30 bg-destructive/5 animate-fade-in-up">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight text-destructive">
              Danger zone
            </h3>
            <p className="text-xs text-muted-foreground">
              Be careful — these actions affect your session.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-background border border-destructive/20">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">
              End your current session on this device.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out of Koundinya?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will need to sign in again to access the dashboard.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>
                  Sign out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
}
