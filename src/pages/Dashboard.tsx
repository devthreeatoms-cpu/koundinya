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
import { useCandidates } from "@/hooks/useCandidates";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import { formatDate, initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { candidates, loading: cLoading } = useCandidates();
  const { projects, loading: pLoading } = useProjects();
  const { assignments, loading: aLoading } = useAssignments();

  const loading = cLoading || pLoading || aLoading;

  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === "Active"),
    [assignments]
  );
  const assignedIds = useMemo(
    () => new Set(activeAssignments.map((a) => a.candidate_id)),
    [activeAssignments]
  );
  const availableCount = candidates.filter((c) => !assignedIds.has(c.id)).length;
  const activeProjects = projects.filter((p) => p.status === "Active");

  const stats = [
    {
      label: "Total candidates",
      value: candidates.length,
      icon: Users,
      gradient: "bg-gradient-primary",
      ring: "ring-primary/20",
      hint: `${availableCount} available now`,
    },
    {
      label: "Active projects",
      value: activeProjects.length,
      icon: Briefcase,
      gradient: "bg-gradient-secondary",
      ring: "ring-secondary/20",
      hint: `${projects.length - activeProjects.length} completed`,
    },
    {
      label: "Available candidates",
      value: availableCount,
      icon: UserCheck,
      gradient: "bg-gradient-accent",
      ring: "ring-accent/20",
      hint: `${assignedIds.size} currently assigned`,
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
  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates]
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
            <Card
              key={s.label}
              className={cn(
                "relative overflow-hidden p-5 border-border/60 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up"
              )}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Decorative blur */}
              <div
                className={cn(
                  "absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-20 blur-2xl",
                  s.gradient
                )}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                  {loading ? (
                    <Skeleton className="h-9 w-20 mt-2" />
                  ) : (
                    <p className="text-4xl font-bold mt-2 tracking-tight tabular-nums">
                      {s.value}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "h-12 w-12 rounded-2xl grid place-items-center text-white shadow-lg ring-4",
                    s.gradient,
                    s.ring
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="relative flex items-center gap-1.5 text-xs text-muted-foreground mt-4 pt-4 border-t border-border/60">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{s.hint}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 shadow-card border-border/60 lg:col-span-2 animate-fade-in-up">
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
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
                  cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "var(--shadow-elevated)",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={BAR_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 shadow-card border-border/60 animate-fade-in-up">
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
                <Pie
                  data={projectData}
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={3}
                >
                  {projectData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
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
        <Card className="p-5 shadow-card border-border/60 lg:col-span-2 animate-fade-in-up">
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
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                      {c ? initials(c.name) : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <Link
                          to={`/candidates/${c?.id ?? ""}`}
                          className="font-medium hover:text-primary"
                        >
                          {c?.name ?? "Unknown"}
                        </Link>
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

        <Card className="p-5 shadow-card border-border/60 animate-fade-in-up">
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

      <Card className="p-5 shadow-card border-border/60 animate-fade-in-up">
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
