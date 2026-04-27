import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, UserCheck, ArrowRight, TrendingUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCandidates } from "@/hooks/useCandidates";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import { formatDate } from "@/lib/utils-format";

export default function Dashboard() {
  const { candidates } = useCandidates();
  const { projects } = useProjects();
  const { assignments } = useAssignments();

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
      tint: "bg-primary-soft text-primary",
    },
    {
      label: "Active projects",
      value: activeProjects.length,
      icon: Briefcase,
      tint: "bg-secondary-soft text-secondary",
    },
    {
      label: "Available candidates",
      value: availableCount,
      icon: UserCheck,
      tint: "bg-accent/10 text-accent",
    },
  ];

  const recentCandidates = candidates.slice(0, 5);
  const recentProjects = projects.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your workforce, projects, and availability."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5 shadow-card border-border/70">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-semibold mt-2 tracking-tight">{s.value}</p>
                </div>
                <div className={`h-11 w-11 rounded-xl grid place-items-center ${s.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-4">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Live data
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent candidates</h3>
            <Link to="/candidates" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No candidates yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentCandidates.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link to={`/candidates/${c.id}`} className="font-medium text-sm hover:text-primary">
                      {c.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{c.phone} • {c.location}</p>
                  </div>
                  <Badge variant="secondary" className="bg-secondary-soft text-secondary border-0">
                    {c.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent projects</h3>
            <Link to="/projects" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No projects yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentProjects.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link to={`/projects/${p.id}`} className="font-medium text-sm hover:text-primary">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.client_name || "—"} • Starts {formatDate((p.start_date as any)?.toDate?.())}
                    </p>
                  </div>
                  <Badge
                    className={
                      p.status === "Active"
                        ? "bg-primary text-primary-foreground border-0"
                        : "bg-muted text-muted-foreground border-0"
                    }
                  >
                    {p.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
