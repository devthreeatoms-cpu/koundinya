import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Clock,
  UserPlus,
  FolderPlus,
  ClipboardList,
  XCircle,
  Shield,
  Building2,
  Search,
  Filter,
  Users,
  Briefcase,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAllCandidates } from "@/hooks/useCandidates";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import { useAgencies } from "@/hooks/useAgencies";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "candidate_added" | "project_created" | "assigned" | "removed";

interface WorkEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  label: string;
  subLabel?: string;
  actor: string;
  actorIsAdmin: boolean;
  linkTo?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return format(d, "EEEE, dd MMM yyyy");
}

const TYPE_META: Record<EventType, { icon: React.ReactNode; color: string; label: string }> = {
  candidate_added: {
    icon: <UserPlus className="h-4 w-4" />,
    color: "bg-primary-soft text-primary",
    label: "Candidate Added",
  },
  project_created: {
    icon: <FolderPlus className="h-4 w-4" />,
    color: "bg-secondary/10 text-secondary",
    label: "Project Created",
  },
  assigned: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    label: "Assignment",
  },
  removed: {
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-destructive/10 text-destructive",
    label: "Removed",
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkLog() {
  const { isAdmin } = useAuth();

  const { candidates: allCands, loading: cLoading } = useAllCandidates({ bypassOwnerFilter: true });
  const { projects, loading: pLoading } = useProjects({ bypassOwnerFilter: isAdmin });
  const { assignments, loading: aLoading } = useAssignments({ bypassOwnerFilter: isAdmin });
  const { agencies } = useAgencies({ includeDeleted: true });

  const loading = cLoading || pLoading || aLoading;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");

  // ── Build lookups ──────────────────────────────────────────────────────────

  const agencyMap = useMemo(() => new Map(agencies.map((a) => [a.id, a])), [agencies]);
  const candidateMap = useMemo(() => new Map(allCands.map((c) => [c.id, c])), [allCands]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // ── Derive events ──────────────────────────────────────────────────────────

  const allEvents = useMemo((): WorkEvent[] => {
    const evs: WorkEvent[] = [];

    for (const c of allCands) {
      const ts = (c.created_at as any)?.toDate?.() as Date | undefined;
      if (!ts) continue;
      const isAdmin = !c.agency_id;
      evs.push({
        id: `ca-${c.id}`,
        type: "candidate_added",
        timestamp: ts,
        label: `${c.name} added as candidate`,
        subLabel: c.phone,
        actor: isAdmin ? "Admin" : (agencyMap.get(c.agency_id!)?.name ?? "Supply Partner"),
        actorIsAdmin: isAdmin,
        linkTo: `/candidates/${c.id}`,
      });
    }

    for (const p of projects) {
      const ts = (p.created_at as any)?.toDate?.() as Date | undefined;
      if (!ts) continue;
      const isAdminProject = !p.agency_id;
      evs.push({
        id: `pc-${p.id}`,
        type: "project_created",
        timestamp: ts,
        label: `Project "${p.name}" created`,
        subLabel: p.client_name || p.location,
        actor: isAdminProject ? "Admin" : (agencyMap.get(p.agency_id!)?.name ?? "Supply Partner"),
        actorIsAdmin: isAdminProject,
        linkTo: `/projects/${p.id}`,
      });
    }

    for (const a of assignments) {
      const cand = candidateMap.get(a.candidate_id);
      const proj = projectMap.get(a.project_id);
      const isAdminAssign = !a.agency_id;
      const actor = isAdminAssign ? "Admin" : (agencyMap.get(a.agency_id!)?.name ?? "Supply Partner");

      const ts = (a.assigned_at as any)?.toDate?.() as Date | undefined;
      if (ts) {
        evs.push({
          id: `as-${a.id}`,
          type: "assigned",
          timestamp: ts,
          label: `${cand?.name ?? "Candidate"} assigned to ${proj?.name ?? "project"}`,
          subLabel: proj?.client_name || proj?.location,
          actor,
          actorIsAdmin: isAdminAssign,
          linkTo: cand ? `/candidates/${cand.id}` : undefined,
        });
      }

      if (a.status !== "Active") {
        const rts = (a.removed_at as any)?.toDate?.() as Date | undefined;
        if (rts) {
          evs.push({
            id: `rm-${a.id}`,
            type: "removed",
            timestamp: rts,
            label: `${cand?.name ?? "Candidate"} removed from ${proj?.name ?? "project"}`,
            subLabel: `Status: ${a.status}`,
            actor,
            actorIsAdmin: isAdminAssign,
            linkTo: cand ? `/candidates/${cand.id}` : undefined,
          });
        }
      }
    }

    return evs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [allCands, projects, assignments, agencyMap, candidateMap, projectMap]);

  // ── All unique actors for filter dropdown ─────────────────────────────────

  const actorOptions = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach((e) => set.add(e.actor));
    return Array.from(set).sort();
  }, [allEvents]);

  // ── Filtered events ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return allEvents.filter((ev) => {
      if (typeFilter !== "all" && ev.type !== typeFilter) return false;
      if (actorFilter !== "all" && ev.actor !== actorFilter) return false;
      if (term && !ev.label.toLowerCase().includes(term) && !ev.actor.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [allEvents, typeFilter, actorFilter, search]);

  // ── Group by day ───────────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const groups: { label: string; events: WorkEvent[] }[] = [];
    for (const ev of filtered) {
      const label = dayLabel(ev.timestamp);
      const last = groups[groups.length - 1];
      if (last?.label === label) { last.events.push(ev); }
      else { groups.push({ label, events: [ev] }); }
    }
    return groups;
  }, [filtered]);

  // ── Summary counts ─────────────────────────────────────────────────────────

  const summary = useMemo(() => ({
    total: allEvents.length,
    candidatesAdded: allEvents.filter((e) => e.type === "candidate_added").length,
    projectsCreated: allEvents.filter((e) => e.type === "project_created").length,
    assignments: allEvents.filter((e) => e.type === "assigned").length,
  }), [allEvents]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Log"
        description="Day-by-day activity across candidates, projects, and assignments."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Total Events" value={summary.total} loading={loading} color="brand" />
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Candidates Added" value={summary.candidatesAdded} loading={loading} color="primary" />
        <SummaryCard icon={<Briefcase className="h-4 w-4" />} label="Projects Created" value={summary.projectsCreated} loading={loading} color="secondary" />
        <SummaryCard icon={<ClipboardList className="h-4 w-4" />} label="Assignments" value={summary.assignments} loading={loading} color="accent" />
      </div>

      {/* Filters */}
      <Card className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
            <Filter className="h-4 w-4" /> Filters
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or actor…"
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="candidate_added">Candidate Added</SelectItem>
              <SelectItem value="project_created">Project Created</SelectItem>
              <SelectItem value="assigned">Assignment</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {actorOptions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(typeFilter !== "all" || actorFilter !== "all" || search) && (
            <button
              onClick={() => { setTypeFilter("all"); setActorFilter("all"); setSearch(""); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filtered.length} of {allEvents.length} events
          </span>
        </div>
      </Card>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : grouped.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No activity found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.label}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 rounded-full bg-muted/40">
                  {g.label}
                </span>
                <Badge variant="secondary" className="bg-muted/60 text-muted-foreground border-0 text-[10px]">
                  {g.events.length}
                </Badge>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              {/* Events for this day */}
              <Card className="glass-card overflow-hidden">
                <ul className="divide-y divide-border/50">
                  {g.events.map((ev) => {
                    const meta = TYPE_META[ev.type];
                    return (
                      <li key={ev.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                        {/* Icon */}
                        <div className={cn("h-8 w-8 rounded-full grid place-items-center shrink-0 mt-0.5", meta.color)}>
                          {meta.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              {ev.linkTo ? (
                                <Link
                                  to={ev.linkTo}
                                  className="text-sm font-medium hover:text-primary transition-colors break-words"
                                >
                                  {ev.label}
                                </Link>
                              ) : (
                                <p className="text-sm font-medium break-words">{ev.label}</p>
                              )}
                              {ev.subLabel && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.subLabel}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                              {format(ev.timestamp, "HH:mm")}
                            </span>
                          </div>

                          {/* Actor + type tags */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
                              ev.actorIsAdmin
                                ? "bg-primary-soft text-primary"
                                : "bg-secondary/10 text-secondary"
                            )}>
                              {ev.actorIsAdmin ? <Shield className="h-2.5 w-2.5" /> : <Building2 className="h-2.5 w-2.5" />}
                              {ev.actor}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border/60 text-muted-foreground">
                              {meta.label}
                            </Badge>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, loading, color,
}: {
  icon: React.ReactNode; label: string; value: number;
  loading: boolean; color: "brand" | "primary" | "secondary" | "accent";
}) {
  const colorCls = {
    brand: "bg-gradient-brand text-white",
    primary: "bg-primary-soft text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent",
  }[color];

  return (
    <Card className="glass-card p-4 hover-lift">
      <div className="flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-xl grid place-items-center shrink-0", colorCls)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          {loading ? <Skeleton className="h-6 w-10 mt-1" /> : (
            <p className="text-xl font-bold mt-0.5 tabular-nums">{value}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
