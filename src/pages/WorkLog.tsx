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
  UserCog,
  Search,
  Filter,
  Users,
  Briefcase,
  ChevronRight,
  MapPin,
  CalendarDays,
  X,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAllCandidates } from "@/hooks/useCandidates";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import { useAgencies } from "@/hooks/useAgencies";
import { useAuth } from "@/context/AuthContext";
import { formatDate, initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type EventType = "candidate_added" | "project_created" | "assigned" | "removed";
type ActorType = "admin" | "internal" | "supply_partner";

interface WorkEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  label: string;
  subLabel?: string;
  actor: string;
  actorType: ActorType;
  linkTo?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

const ACTOR_BADGE: Record<ActorType, { icon: React.ReactNode; cls: string }> = {
  admin:         { icon: <Shield className="h-2.5 w-2.5" />,    cls: "bg-primary-soft text-primary" },
  internal:      { icon: <UserCog className="h-2.5 w-2.5" />,   cls: "bg-secondary/10 text-secondary" },
  supply_partner:{ icon: <Building2 className="h-2.5 w-2.5" />, cls: "bg-muted text-muted-foreground" },
};

// ─── Main component ─────────────────────────────────────────────────────────────

export default function WorkLog() {
  const { isAdmin } = useAuth();

  const { candidates: allCands, loading: cLoading } = useAllCandidates({ bypassOwnerFilter: true });
  const { projects, loading: pLoading } = useProjects({ bypassOwnerFilter: isAdmin });
  const { assignments, loading: aLoading } = useAssignments({ bypassOwnerFilter: isAdmin });
  // Load ALL agencies (both supply partners and internal team) for name resolution
  const { agencies: allAgencies } = useAgencies({ includeDeleted: true });

  const loading = cLoading || pLoading || aLoading;

  // Build lookup maps
  const agencyMap   = useMemo(() => new Map(allAgencies.map((a) => [a.id, a])), [allAgencies]);
  const candidateMap = useMemo(() => new Map(allCands.map((c) => [c.id, c])), [allCands]);
  const projectMap   = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  function actorTypeOf(agencyId: string | null | undefined): ActorType {
    if (!agencyId) return "admin";
    const a = agencyMap.get(agencyId);
    return a?.is_internal ? "internal" : "supply_partner";
  }

  function actorNameOf(agencyId: string | null | undefined): string {
    if (!agencyId) return "Admin";
    return agencyMap.get(agencyId)?.name ?? "Unknown";
  }

  // ── Build all events ────────────────────────────────────────────────────────

  const allEvents = useMemo((): WorkEvent[] => {
    const evs: WorkEvent[] = [];

    for (const c of allCands) {
      const ts = (c.created_at as any)?.toDate?.() as Date | undefined;
      if (!ts) continue;
      evs.push({
        id: `ca-${c.id}`,
        type: "candidate_added",
        timestamp: ts,
        label: `${c.name} added as candidate`,
        subLabel: c.phone,
        actor: actorNameOf(c.agency_id),
        actorType: actorTypeOf(c.agency_id),
        linkTo: `/candidates/${c.id}`,
      });
    }

    for (const p of projects) {
      const ts = (p.created_at as any)?.toDate?.() as Date | undefined;
      if (!ts) continue;
      evs.push({
        id: `pc-${p.id}`,
        type: "project_created",
        timestamp: ts,
        label: `Project "${p.name}" created`,
        subLabel: p.client_name || p.location,
        actor: actorNameOf(p.agency_id),
        actorType: actorTypeOf(p.agency_id),
        linkTo: `/projects/${p.id}`,
      });
    }

    for (const a of assignments) {
      const cand = candidateMap.get(a.candidate_id);
      const proj = projectMap.get(a.project_id);
      const actor = actorNameOf(a.agency_id);
      const actorType = actorTypeOf(a.agency_id);

      const ts = (a.assigned_at as any)?.toDate?.() as Date | undefined;
      if (ts) {
        evs.push({
          id: `as-${a.id}`,
          type: "assigned",
          timestamp: ts,
          label: `${cand?.name ?? "Candidate"} assigned to ${proj?.name ?? "project"}`,
          subLabel: proj?.client_name || proj?.location,
          actor,
          actorType,
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
            actorType,
            linkTo: cand ? `/candidates/${cand.id}` : undefined,
          });
        }
      }
    }

    return evs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCands, projects, assignments, agencyMap, candidateMap, projectMap]);

  const summary = useMemo(() => ({
    total: allEvents.length,
    candidatesAdded: allEvents.filter((e) => e.type === "candidate_added").length,
    projectsCreated: allEvents.filter((e) => e.type === "project_created").length,
    assignments: allEvents.filter((e) => e.type === "assigned").length,
  }), [allEvents]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Log"
        description="Day-by-day activity across candidates, projects, and assignments."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<Clock className="h-4 w-4" />}        label="Total Events"      value={summary.total}           loading={loading} color="brand"     />
        <SummaryCard icon={<Users className="h-4 w-4" />}        label="Candidates Added"  value={summary.candidatesAdded} loading={loading} color="primary"   />
        <SummaryCard icon={<Briefcase className="h-4 w-4" />}    label="Projects Created"  value={summary.projectsCreated} loading={loading} color="secondary" />
        <SummaryCard icon={<ClipboardList className="h-4 w-4" />} label="Assignments"       value={summary.assignments}     loading={loading} color="accent"    />
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex h-auto gap-1 p-1">
          <TabsTrigger value="activity" className="text-sm px-4 py-2 gap-2">
            <Clock className="h-3.5 w-3.5" /> Activity Log
          </TabsTrigger>
          <TabsTrigger value="candidates" className="text-sm px-4 py-2 gap-2">
            <Users className="h-3.5 w-3.5" /> Candidate History
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Activity Log ── */}
        <TabsContent value="activity">
          <ActivityTab
            allEvents={allEvents}
            allAgencies={allAgencies}
            loading={loading}
          />
        </TabsContent>

        {/* ── Tab 2: Candidate History ── */}
        <TabsContent value="candidates">
          <CandidateHistoryTab
            allCands={allCands}
            assignments={assignments}
            projectMap={projectMap}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Activity Tab ──────────────────────────────────────────────────────────────

function ActivityTab({
  allEvents,
  allAgencies,
  loading,
}: {
  allEvents: WorkEvent[];
  allAgencies: ReturnType<typeof useAgencies>["agencies"];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");

  const internalMembers = useMemo(
    () => allAgencies.filter((a) => !!a.is_internal && !a.is_deleted),
    [allAgencies]
  );
  const supplyPartners = useMemo(
    () => allAgencies.filter((a) => !a.is_internal && !a.is_deleted),
    [allAgencies]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return allEvents.filter((ev) => {
      if (typeFilter !== "all" && ev.type !== typeFilter) return false;
      if (actorFilter !== "all" && ev.actor !== actorFilter) return false;
      if (term && !ev.label.toLowerCase().includes(term) && !ev.actor.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [allEvents, typeFilter, actorFilter, search]);

  const grouped = useMemo(() => {
    const groups: { label: string; events: WorkEvent[] }[] = [];
    for (const ev of filtered) {
      const label = dayLabel(ev.timestamp);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.events.push(ev);
      else groups.push({ label, events: [ev] });
    }
    return groups;
  }, [filtered]);

  const hasFilter = typeFilter !== "all" || actorFilter !== "all" || !!search;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
            <Filter className="h-4 w-4" /> Filters
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by candidate, project or actor…"
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
              <SelectItem value="all">All event types</SelectItem>
              <SelectItem value="candidate_added">Candidate Added</SelectItem>
              <SelectItem value="project_created">Project Created</SelectItem>
              <SelectItem value="assigned">Assignment</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger className="h-9 w-[200px] text-sm">
              <SelectValue placeholder="By person" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All people</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              {internalMembers.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                    Internal Team
                  </SelectLabel>
                  {internalMembers.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      <span className="flex items-center gap-2">
                        <UserCog className="h-3.5 w-3.5 text-secondary shrink-0" /> {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {supplyPartners.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                    Supply Partners
                  </SelectLabel>
                  {supplyPartners.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>

          {hasFilter && (
            <button
              onClick={() => { setTypeFilter("all"); setActorFilter("all"); setSearch(""); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
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

              <Card className="glass-card overflow-hidden">
                <ul className="divide-y divide-border/50">
                  {g.events.map((ev) => {
                    const meta = TYPE_META[ev.type];
                    const badge = ACTOR_BADGE[ev.actorType];
                    return (
                      <li key={ev.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                        <div className={cn("h-8 w-8 rounded-full grid place-items-center shrink-0 mt-0.5", meta.color)}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              {ev.linkTo ? (
                                <Link to={ev.linkTo} className="text-sm font-medium hover:text-primary transition-colors break-words">
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
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", badge.cls)}>
                              {badge.icon} {ev.actor}
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

// ─── Candidate History Tab ──────────────────────────────────────────────────────

type CandidateEntry = ReturnType<typeof useAllCandidates>["candidates"][number];
type Assignment = ReturnType<typeof useAssignments>["assignments"][number];

interface CandidateEvent {
  id: string;
  type: "joined" | "assigned" | "removed";
  timestamp: Date;
  label: string;
  subLabel?: string;
  linkTo?: string;
}

function CandidateHistoryTab({
  allCands,
  assignments,
  projectMap,
  loading,
}: {
  allCands: CandidateEntry[];
  assignments: Assignment[];
  projectMap: Map<string, ReturnType<typeof useProjects>["projects"][number]>;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CandidateEntry | null>(null);

  const filteredCands = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allCands.filter((c) => !c.is_deleted).slice(0, 50);
    return allCands
      .filter((c) => !c.is_deleted && (
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        (c.kisfs_id?.toLowerCase().includes(term) ?? false)
      ))
      .slice(0, 50);
  }, [allCands, search]);

  const history = useMemo((): CandidateEvent[] => {
    if (!selected) return [];
    const evs: CandidateEvent[] = [];

    const joinedTs = (selected.created_at as any)?.toDate?.() as Date | undefined;
    if (joinedTs) {
      evs.push({
        id: "joined",
        type: "joined",
        timestamp: joinedTs,
        label: "Added as candidate",
        subLabel: `Source: ${selected.source_member_name || selected.source}`,
      });
    }

    for (const a of assignments) {
      if (a.candidate_id !== selected.id) continue;
      const proj = projectMap.get(a.project_id);

      const ats = (a.assigned_at as any)?.toDate?.() as Date | undefined;
      if (ats) {
        evs.push({
          id: `as-${a.id}`,
          type: "assigned",
          timestamp: ats,
          label: `Assigned to ${proj?.name ?? "a project"}`,
          subLabel: proj?.client_name || proj?.location,
          linkTo: proj ? `/projects/${proj.id}` : undefined,
        });
      }

      if (a.status !== "Active") {
        const rts = (a.removed_at as any)?.toDate?.() as Date | undefined;
        if (rts) {
          evs.push({
            id: `rm-${a.id}`,
            type: "removed",
            timestamp: rts,
            label: `Removed from ${proj?.name ?? "a project"}`,
            subLabel: `Status: ${a.status}`,
            linkTo: proj ? `/projects/${proj.id}` : undefined,
          });
        }
      }
    }

    return evs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [selected, assignments, projectMap]);

  const historyGrouped = useMemo(() => {
    const groups: { label: string; events: CandidateEvent[] }[] = [];
    for (const ev of history) {
      const label = dayLabel(ev.timestamp);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.events.push(ev);
      else groups.push({ label, events: [ev] });
    }
    return groups;
  }, [history]);

  const HIST_META: Record<CandidateEvent["type"], { icon: React.ReactNode; color: string; label: string }> = {
    joined:   { icon: <UserPlus className="h-4 w-4" />,     color: "bg-primary-soft text-primary",                         label: "Joined" },
    assigned: { icon: <ClipboardList className="h-4 w-4" />, color: "bg-green-500/10 text-green-600 dark:text-green-400",  label: "Assigned" },
    removed:  { icon: <XCircle className="h-4 w-4" />,       color: "bg-destructive/10 text-destructive",                   label: "Removed" },
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Left: candidate picker */}
      <Card className="glass-card p-4 self-start">
        <div className="mb-3">
          <p className="text-sm font-semibold mb-2">Search candidate</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name, phone or KISFS ID…"
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : filteredCands.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No candidates found.</p>
        ) : (
          <ul className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {filteredCands.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c)}
                  className={cn(
                    "w-full text-left flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                    selected?.id === c.id
                      ? "bg-primary-soft border border-primary/30"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium truncate", selected?.id === c.id && "text-primary")}>
                      {c.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{c.phone}</p>
                    {c.kisfs_id && (
                      <p className="text-[10px] font-mono text-primary/60">{c.kisfs_id}</p>
                    )}
                  </div>
                  {selected?.id === c.id && (
                    <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              </li>
            ))}
            {filteredCands.length === 50 && (
              <p className="text-[11px] text-muted-foreground text-center pt-2">Showing first 50 results — refine search for more</p>
            )}
          </ul>
        )}
      </Card>

      {/* Right: history */}
      <div>
        {!selected ? (
          <Card className="glass-card p-16 text-center">
            <div className="h-14 w-14 rounded-full bg-muted grid place-items-center mx-auto mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Select a candidate</p>
            <p className="text-xs text-muted-foreground mt-1">Search and click a name on the left to see their activity history.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Candidate header */}
            <Card className="glass-card p-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-brand text-white grid place-items-center text-lg font-bold shadow-brand shrink-0">
                  {initials(selected.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base">{selected.name}</h3>
                    {selected.kisfs_id && (
                      <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {selected.kisfs_id}
                      </span>
                    )}
                    {selected.is_blocklisted && (
                      <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10 text-xs">
                        Blocklisted
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{selected.phone}</span>
                    {selected.state && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[selected.area_name, selected.district, selected.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {selected.created_at && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Joined {formatDate((selected.created_at as any)?.toDate?.())}
                      </span>
                    )}
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary-soft shrink-0">
                  <Link to={`/candidates/${selected.id}`}>View profile</Link>
                </Button>
              </div>
            </Card>

            {/* Timeline */}
            {historyGrouped.length === 0 ? (
              <Card className="glass-card p-12 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No activity recorded</p>
                <p className="text-xs text-muted-foreground mt-1">No assignments or events found for this candidate.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {historyGrouped.map((g) => (
                  <div key={g.label}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 rounded-full bg-muted/40">
                        {g.label}
                      </span>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>
                    <Card className="glass-card overflow-hidden">
                      <ul className="divide-y divide-border/50">
                        {g.events.map((ev) => {
                          const meta = HIST_META[ev.type];
                          return (
                            <li key={ev.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                              <div className={cn("h-8 w-8 rounded-full grid place-items-center shrink-0 mt-0.5", meta.color)}>
                                {meta.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    {ev.linkTo ? (
                                      <Link to={ev.linkTo} className="text-sm font-medium hover:text-primary transition-colors">
                                        {ev.label}
                                      </Link>
                                    ) : (
                                      <p className="text-sm font-medium">{ev.label}</p>
                                    )}
                                    {ev.subLabel && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{ev.subLabel}</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                    {format(ev.timestamp, "HH:mm")}
                                  </span>
                                </div>
                                <Badge variant="outline" className="mt-1.5 text-[10px] h-4 px-1.5 border-border/60 text-muted-foreground">
                                  {meta.label}
                                </Badge>
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
        )}
      </div>
    </div>
  );
}

// ─── Summary card ───────────────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, loading, color,
}: {
  icon: React.ReactNode; label: string; value: number;
  loading: boolean; color: "brand" | "primary" | "secondary" | "accent";
}) {
  const colorCls = {
    brand:     "bg-gradient-brand text-white",
    primary:   "bg-primary-soft text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent:    "bg-accent/10 text-accent",
  }[color];

  return (
    <Card className="glass-card p-4 hover-lift">
      <div className="flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-xl grid place-items-center shrink-0", colorCls)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          {loading
            ? <Skeleton className="h-6 w-10 mt-1" />
            : <p className="text-xl font-bold mt-0.5 tabular-nums">{value}</p>
          }
        </div>
      </div>
    </Card>
  );
}
