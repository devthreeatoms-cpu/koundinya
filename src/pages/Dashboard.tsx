import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Activity,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCandidates, useAllCandidates, useAgencyOwnedCandidates } from "@/hooks/useCandidates";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import { useAgencies } from "@/hooks/useAgencies";
import { useAuth } from "@/context/AuthContext";
import { formatDate, initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { candidates: ownCandidates, loading: cLoading } = useCandidates();
  const { candidates: allCandidates } = useAllCandidates({ bypassOwnerFilter: isAdmin });
  // Admin: include agency-owned candidates so the dashboard reflects the
  // entire workforce across the platform, not just admin-owned records.
  const { candidates: agencyOwnedCandidates } = useAgencyOwnedCandidates();
  const { projects, loading: pLoading } = useProjects();
  const { assignments, loading: aLoading } = useAssignments({ bypassOwnerFilter: isAdmin });
  const { agencies, loading: agLoading } = useAgencies({ includeDeleted: true });

  const loading = cLoading || pLoading || aLoading;

  // For admins, the "candidates" view is the union of admin-owned + every
  // agency's candidates. For agency users it's their own scoped list.
  // Candidates whose owning agency has been deactivated are excluded so
  // dashboard totals match what's visible elsewhere in the app.
  const activeAgencyIds = useMemo(
    () => new Set(agencies.filter((a) => !a.is_deleted).map((a) => a.id)),
    [agencies]
  );
  const candidates = useMemo(() => {
    const dropDeactivated = (c: { agency_id?: string | null }) =>
      c.agency_id == null || activeAgencyIds.has(c.agency_id);
    if (!isAdmin) return ownCandidates.filter(dropDeactivated);
    const map = new Map<string, (typeof ownCandidates)[number]>();
    for (const c of ownCandidates) map.set(c.id, c);
    for (const c of agencyOwnedCandidates) map.set(c.id, c);
    return Array.from(map.values()).filter(dropDeactivated);
  }, [isAdmin, ownCandidates, agencyOwnedCandidates, activeAgencyIds]);

  // Only count active assignments whose candidate is currently visible.
  // Stale assignments (deleted candidates, deactivated agencies) would
  // otherwise inflate the "currently assigned" number above the total.
  const visibleCandidateIds = useMemo(
    () => new Set(candidates.map((c) => c.id)),
    [candidates]
  );
  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (a) => a.status === "Active" && visibleCandidateIds.has(a.candidate_id)
      ),
    [assignments, visibleCandidateIds]
  );
  const assignedIds = useMemo(
    () => new Set(activeAssignments.map((a) => a.candidate_id)),
    [activeAssignments]
  );
  const availableCount = candidates.filter((c) => !assignedIds.has(c.id)).length;
  const activeProjects = projects.filter((p) => p.status === "Active");

  const stats = isAdmin
    ? [
        {
          label: "Total candidates",
          value: candidates.length,
          icon: Users,
          gradient: "bg-gradient-primary",
          ring: "ring-primary/20",
          hint: `${availableCount} available now`,
          to: "/candidates",
          hoverGlow: "hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.45)]",
        },
        {
          label: "Active projects",
          value: activeProjects.length,
          icon: Briefcase,
          gradient: "bg-gradient-secondary",
          ring: "ring-secondary/20",
          hint: `${projects.length - activeProjects.length} completed`,
          to: "/projects",
          hoverGlow: "hover:shadow-[0_10px_40px_-10px_hsl(var(--secondary)/0.45)]",
        },
        {
          label: "Available candidates",
          value: availableCount,
          icon: UserCheck,
          gradient: "bg-gradient-accent",
          ring: "ring-accent/20",
          hint: `${assignedIds.size} currently assigned`,
          to: "/candidates?availability=available",
          hoverGlow: "hover:shadow-[0_10px_40px_-10px_hsl(var(--accent)/0.45)]",
        },
      ]
    : [
        {
          label: "Total candidates",
          value: candidates.length,
          icon: Users,
          gradient: "bg-gradient-primary",
          ring: "ring-primary/20",
          hint: "Your agency pool",
          to: "/candidates",
          hoverGlow: "hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.45)]",
        },
        {
          label: "Available candidates",
          value: availableCount,
          icon: UserCheck,
          gradient: "bg-gradient-accent",
          ring: "ring-accent/20",
          hint: "Not currently assigned",
          to: "/candidates?availability=available",
          hoverGlow: "hover:shadow-[0_10px_40px_-10px_hsl(var(--accent)/0.45)]",
        },
        {
          label: "Assigned candidates",
          value: assignedIds.size,
          icon: Briefcase,
          gradient: "bg-gradient-secondary",
          ring: "ring-secondary/20",
          hint: "On an active project",
          to: "/candidates?availability=assigned",
          hoverGlow: "hover:shadow-[0_10px_40px_-10px_hsl(var(--secondary)/0.45)]",
        },
      ];

  // Candidate status breakdown for chart
  const statusData = useMemo(() => {
    const map: Record<string, number> = { New: 0, Contacted: 0, Assigned: 0, Rejected: 0 };
    for (const c of candidates) {
      map[c.status] = (map[c.status] ?? 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [candidates]);

  // Project status pie
  const projectData = useMemo(() => {
    const active = projects.filter((p) => p.status === "Active").length;
    const completed = projects.filter((p) => p.status === "Completed").length;
    return [
      { name: "Active", value: active },
      { name: "Completed", value: completed },
    ];
  }, [projects]);

  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground) / 0.5)"];
  const BAR_COLORS: Record<string, string> = {
    New: "hsl(var(--secondary))",
    Contacted: "hsl(var(--warning))",
    Assigned: "hsl(var(--primary))",
    Rejected: "hsl(var(--destructive))",
  };

  const recentCandidates = candidates.slice(0, 5);
  const recentProjects = projects.slice(0, 5);

  // Recent activity = latest assignments
  const recentActivity = useMemo(() => {
    return [...assignments]
      .sort((a, b) => {
        const ta = (a.assigned_at as any)?.toMillis?.() ?? 0;
        const tb = (b.assigned_at as any)?.toMillis?.() ?? 0;
        return tb - ta;
      })
      .slice(0, 6);
  }, [assignments]);
  // Include soft-deleted candidates so historic activity still resolves names.
  const candidateMap = useMemo(
    () => new Map(allCandidates.map((c) => [c.id, c])),
    [allCandidates]
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your workforce, projects, and availability."
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.to}
              aria-label={`${s.label}: ${s.value}. View details.`}
              className="group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card
                role="button"
                tabIndex={-1}
                className={cn(
                  "glass-card relative overflow-hidden p-4 sm:p-6 cursor-pointer rounded-2xl",
                  "transition-all duration-500 ease-out animate-fade-in-up",
                  "hover:-translate-y-1.5 hover:scale-[1.02]",
                  "active:scale-[0.99] active:translate-y-0",
                  s.hoverGlow
                )}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {/* Aurora blob inside card */}
                <div
                  className={cn(
                    "absolute -top-14 -right-14 h-40 w-40 rounded-full opacity-25 blur-3xl transition-all duration-500 group-hover:opacity-50 group-hover:scale-110",
                    s.gradient
                  )}
                />
                {/* Sweeping shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{s.label}</p>
                    {loading ? (
                      <Skeleton className="h-10 w-20 mt-3" />
                    ) : (
                      <p className="text-4xl sm:text-5xl font-bold mt-3 tracking-tight tabular-nums leading-none">
                        <span className="text-gradient-brand">{s.value}</span>
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl grid place-items-center text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shrink-0",
                      s.gradient
                    )}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 relative z-10 drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]" />
                    <div className={cn("absolute inset-0 rounded-2xl blur-xl opacity-60", s.gradient)} />
                  </div>
                </div>
                <div className="relative flex items-center justify-between gap-1.5 text-xs text-muted-foreground mt-5 pt-4 border-t border-border/40">
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">{s.hint}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Agencies overview — admin only */}
      {isAdmin && (
        <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">Agencies overview</h3>
                <p className="text-xs text-muted-foreground">
                  {agencies.filter((a) => !a.is_deleted).length} active ·{" "}
                  {agencies.filter((a) => a.is_deleted).length} inactive
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary-soft">
              <Link to="/agencies">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          {agLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : agencies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No agencies yet. Create one from the Agencies page.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agencies.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/agencies/${a.id}`}
                    className={cn(
                      "block p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:shadow-card transition-all group",
                      a.is_deleted && "opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-medium text-sm group-hover:text-primary truncate">
                        {a.name}
                      </p>
                      {a.is_deleted && (
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/30 text-muted-foreground bg-muted/40 shrink-0"
                        >
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {a.email || "No email"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-card p-4 sm:p-6 hover-lift lg:col-span-2 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold tracking-tight">Candidate status breakdown</h3>
              <p className="text-xs text-muted-foreground">Live distribution across pipeline</p>
            </div>
            <Badge variant="secondary" className="bg-primary-soft text-primary border-0">
              <Activity className="h-3 w-3 mr-1" /> Live
            </Badge>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="barGradNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--secondary-glow))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="barGradContacted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="barGradAssigned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary-glow))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="barGradRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--primary) / 0.08)", radius: 12 }}
                  contentStyle={{
                    background: "hsl(var(--popover) / 0.95)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "var(--shadow-elevated)",
                    padding: "8px 12px",
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[12, 12, 4, 4]}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {statusData.map((entry) => {
                    const gradMap: Record<string, string> = {
                      New: "url(#barGradNew)",
                      Contacted: "url(#barGradContacted)",
                      Assigned: "url(#barGradAssigned)",
                      Rejected: "url(#barGradRejected)",
                    };
                    return <Cell key={entry.name} fill={gradMap[entry.name] ?? BAR_COLORS[entry.name]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
          <div className="mb-4">
            <h3 className="font-semibold tracking-tight">Projects</h3>
            <p className="text-xs text-muted-foreground">Active vs completed</p>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No projects yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <defs>
                  <linearGradient id="pieGradActive" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary-glow))" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" />
                  </linearGradient>
                  <linearGradient id="pieGradCompleted" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground) / 0.6)" />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground) / 0.3)" />
                  </linearGradient>
                </defs>
                <Pie
                  data={projectData}
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={3}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {projectData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "url(#pieGradActive)" : "url(#pieGradCompleted)"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover) / 0.95)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "var(--shadow-elevated)",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent activity + Recent lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-card p-4 sm:p-6 hover-lift lg:col-span-2 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">Recent activity</h3>
                <p className="text-xs text-muted-foreground">Latest assignments across projects</p>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No assignments yet — start by assigning candidates to a project.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((a) => {
                const c = candidateMap.get(a.candidate_id);
                const p = projectMap.get(a.project_id);
                const isDeleted = !!c?.is_deleted;
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-full grid place-items-center text-xs font-semibold shrink-0 text-white",
                      isDeleted ? "bg-muted-foreground/60" : "bg-gradient-brand"
                    )}>
                      {c ? initials(c.name) : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {c ? (
                          isDeleted ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-medium text-muted-foreground line-through decoration-muted-foreground/40">
                                {c.name}
                              </span>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-muted-foreground/30 text-muted-foreground bg-muted/40">
                                Deleted
                              </Badge>
                            </span>
                          ) : (
                            <Link
                              to={`/candidates/${c.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {c.name}
                            </Link>
                          )
                        ) : (
                          <span className="font-medium text-muted-foreground italic">Unknown</span>
                        )}
                        <span className="text-muted-foreground"> {a.status === "Active" ? "assigned to" : "removed from"} </span>
                        <Link
                          to={`/projects/${p?.id ?? ""}`}
                          className="font-medium hover:text-primary"
                        >
                          {p?.name ?? "Unknown project"}
                        </Link>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate((a.assigned_at as any)?.toDate?.())}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        a.status === "Active"
                          ? "border-primary/40 text-primary bg-primary-soft"
                          : "border-muted-foreground/30 text-muted-foreground"
                      }
                    >
                      {a.status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold tracking-tight">Recent candidates</h3>
            <Link
              to="/candidates"
              className="text-xs text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No candidates yet.</p>
          ) : (
            <ul className="space-y-1">
              {recentCandidates.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-[10px] font-semibold shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/candidates/${c.id}`}
                      className="font-medium text-sm hover:text-primary truncate block"
                    >
                      {c.name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate">{c.phone}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold tracking-tight">Recent projects</h3>
          <Link
            to="/projects"
            className="text-xs text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No projects yet.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="block p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:shadow-card transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-medium text-sm group-hover:text-primary truncate">
                      {p.name}
                    </p>
                    <Badge
                      className={
                        p.status === "Active"
                          ? "bg-primary text-primary-foreground border-0 shrink-0"
                          : "bg-muted text-muted-foreground border-0 shrink-0"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {p.client_name || "Internal"} • {formatDate((p.start_date as any)?.toDate?.())}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
