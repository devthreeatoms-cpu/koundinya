import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  Eye,
  Building2,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Tag,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useCombinedCandidatePool, useAllCandidates } from "@/hooks/useCandidates";
// useAllCandidates needed so candidateMap covers soft-deleted entries for drill-downs
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import { useAgencies } from "@/hooks/useAgencies";
import { useAuth } from "@/context/AuthContext";
import { formatDate, initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

// ─── Colours ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  New: "hsl(var(--secondary))",
  Contacted: "hsl(var(--warning, 38 92% 50%))",
  Assigned: "hsl(var(--primary))",
  Rejected: "hsl(var(--destructive))",
};

const PIE_PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "#f59e0b",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function Reports() {
  const { isAdmin } = useAuth();

  const { candidates: allCands } = useAllCandidates({ bypassOwnerFilter: true });
  const { candidates: rawCandidates, loading: cLoading } = useCombinedCandidatePool();
  const { projects, loading: pLoading } = useProjects({ bypassOwnerFilter: isAdmin });
  const { assignments, loading: aLoading } = useAssignments({ bypassOwnerFilter: isAdmin });
  const { agencies } = useAgencies({ includeDeleted: true });

  const loading = cLoading || pLoading || aLoading;

  const [activeTab, setActiveTab] = useState("candidates");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

  // Drill-down dialog for status / KYC cards
  type DrillKey =
    | "New" | "Contacted" | "Assigned" | "Rejected"
    | "kyc_full" | "kyc_aadhar" | "kyc_pan" | "kyc_pending";
  const [drillKey, setDrillKey] = useState<DrillKey | null>(null);

  // ── Lookups ────────────────────────────────────────────────────────────────

  const agencyMap = useMemo(() => new Map(agencies.map((a) => [a.id, a])), [agencies]);
  const candidateMap = useMemo(() => new Map(allCands.map((c) => [c.id, c])), [allCands]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const visibleCandidates = useMemo(() => rawCandidates.filter((c) => !c.is_deleted), [rawCandidates]);

  const activeAssignedIds = useMemo(
    () => new Set(assignments.filter((a) => a.status === "Active").map((a) => a.candidate_id)),
    [assignments]
  );

  // ── Candidate report ───────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { New: 0, Contacted: 0, Assigned: 0, Rejected: 0 };
    visibleCandidates.forEach((c) => { m[c.status] = (m[c.status] ?? 0) + 1; });
    return m;
  }, [visibleCandidates]);

  const kycStats = useMemo(() => {
    let fullKyc = 0, aadharOnly = 0, panOnly = 0, pending = 0;
    for (const c of visibleCandidates) {
      const a = !!c.aadhar_number, p = !!c.pan_number;
      if (a && p) fullKyc++; else if (a) aadharOnly++; else if (p) panOnly++; else pending++;
    }
    return { total: visibleCandidates.length, fullKyc, aadharOnly, panOnly, pending };
  }, [visibleCandidates]);

  const statusPieData = useMemo(
    () => Object.entries(statusCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })),
    [statusCounts]
  );

  const drillCandidates = useMemo(() => {
    if (!drillKey) return [];
    switch (drillKey) {
      case "New": case "Contacted": case "Assigned": case "Rejected":
        return visibleCandidates.filter((c) => c.status === drillKey);
      case "kyc_full":
        return visibleCandidates.filter((c) => !!c.aadhar_number && !!c.pan_number);
      case "kyc_aadhar":
        return visibleCandidates.filter((c) => !!c.aadhar_number && !c.pan_number);
      case "kyc_pan":
        return visibleCandidates.filter((c) => !c.aadhar_number && !!c.pan_number);
      case "kyc_pending":
        return visibleCandidates.filter((c) => !c.aadhar_number && !c.pan_number);
      default: return [];
    }
  }, [drillKey, visibleCandidates]);

  const drillTitle: Record<NonNullable<typeof drillKey>, string> = {
    New: "New Candidates",
    Contacted: "Contacted Candidates",
    Assigned: "Assigned Candidates",
    Rejected: "Rejected Candidates",
    kyc_full: "Fully Verified Candidates",
    kyc_aadhar: "Aadhar Only Candidates",
    kyc_pan: "PAN Only Candidates",
    kyc_pending: "KYC Pending Candidates",
  };

  // ── Project report ─────────────────────────────────────────────────────────

  const projectRows = useMemo(() =>
    projects.map((p) => ({
      ...p,
      activeCount: assignments.filter((a) => a.project_id === p.id && a.status === "Active").length,
    })).sort((a, b) => b.activeCount - a.activeCount),
    [projects, assignments]
  );

  const projectDrill = useMemo(() => {
    if (!selectedProjectId) return null;
    const proj = projectMap.get(selectedProjectId);
    if (!proj) return null;
    const active = assignments.filter((a) => a.project_id === selectedProjectId && a.status === "Active");
    const grouped: Record<string, typeof active> = {};
    for (const a of active) {
      const key = (a as any).project_status ?? "Not set";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    }
    return { proj, active, grouped };
  }, [selectedProjectId, assignments, projectMap]);

  // ── Supply partner report ──────────────────────────────────────────────────

  const agencyRows = useMemo(() =>
    agencies
      .filter((a) => !a.is_deleted)
      .map((agency) => {
        const cands = visibleCandidates.filter((c) => c.agency_id === agency.id);
        return {
          ...agency,
          candidateCount: cands.length,
          assignedCount: cands.filter((c) => activeAssignedIds.has(c.id)).length,
        };
      })
      .sort((a, b) => b.candidateCount - a.candidateCount),
    [agencies, visibleCandidates, activeAssignedIds]
  );

  const agencyDrill = useMemo(() => {
    if (!selectedAgencyId) return null;
    const agency = agencyMap.get(selectedAgencyId);
    if (!agency) return null;
    const cands = visibleCandidates
      .filter((c) => c.agency_id === selectedAgencyId)
      .sort((a, b) => ((b.created_at as any)?.toMillis?.() ?? 0) - ((a.created_at as any)?.toMillis?.() ?? 0));
    return { agency, cands };
  }, [selectedAgencyId, agencyMap, visibleCandidates]);


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Insights across candidates, projects, and supply partners." />

      <div className="flex gap-5 items-start">
        {/* ── Main tabs ── */}
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v);
            setSelectedProjectId(null);
            setSelectedAgencyId(null);
          }}>
            <TabsList className="mb-4 h-10">
              <TabsTrigger value="candidates" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Candidate Report
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Project Report
              </TabsTrigger>
              <TabsTrigger value="partners" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Supply Partners
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: Candidate Report ── */}
            <TabsContent value="candidates" className="space-y-5 mt-0">
              {/* Status summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["New", "Contacted", "Assigned", "Rejected"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setDrillKey(s)}
                    className="text-left w-full"
                  >
                    <Card className="glass-card p-4 hover-lift cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s}</p>
                      {loading ? <Skeleton className="h-8 w-14 mt-2" /> :
                        <p className="text-3xl font-bold mt-1 tabular-nums">{statusCounts[s] ?? 0}</p>}
                      <div className="h-1 rounded-full mt-3" style={{ background: STATUS_COLORS[s], opacity: 0.6 }} />
                    </Card>
                  </button>
                ))}
              </div>

              {/* KYC cards */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">KYC Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KycCard label="Fully Verified" value={kycStats.fullKyc} total={kycStats.total} color="green" loading={loading} onClick={() => setDrillKey("kyc_full")} />
                  <KycCard label="Aadhar Only" value={kycStats.aadharOnly} total={kycStats.total} color="yellow" loading={loading} onClick={() => setDrillKey("kyc_aadhar")} />
                  <KycCard label="PAN Only" value={kycStats.panOnly} total={kycStats.total} color="yellow" loading={loading} onClick={() => setDrillKey("kyc_pan")} />
                  <KycCard label="KYC Pending" value={kycStats.pending} total={kycStats.total} color="red" loading={loading} onClick={() => setDrillKey("kyc_pending")} />
                </div>
              </div>

              {/* Pie chart */}
              <Card className="glass-card p-4 sm:p-6 hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Candidates by status</h3>
                    <p className="text-xs text-muted-foreground">Pipeline distribution</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary-soft text-primary border-0">
                    <Activity className="h-3 w-3 mr-1" /> Live
                  </Badge>
                </div>
                {loading ? <Skeleton className="h-56 w-full" /> : statusPieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">No data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusPieData} innerRadius={50} outerRadius={88} paddingAngle={5} dataKey="value"
                        stroke="hsl(var(--background))" strokeWidth={3} animationDuration={800}>
                        {statusPieData.map((e, i) => (
                          <Cell key={e.name} fill={STATUS_COLORS[e.name] ?? PIE_PALETTE[i % PIE_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--popover)/0.95)", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Summary totals */}
              <Card className="glass-card p-4 sm:p-5 hover-lift">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">{kycStats.total}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums text-primary">{activeAssignedIds.size}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums text-green-600 dark:text-green-400">
                      {kycStats.total - activeAssignedIds.size}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">KYC Pending</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums text-destructive">{kycStats.pending}</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ── TAB 2: Project Report ── */}
            <TabsContent value="projects" className="mt-0">
              {selectedProjectId && projectDrill ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedProjectId(null)}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
                  </button>

                  {/* Project header */}
                  <Card className="glass-card p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-lg font-bold">{projectDrill.proj.name}</h2>
                        {projectDrill.proj.client_name && (
                          <p className="text-sm text-muted-foreground mt-0.5">{projectDrill.proj.client_name}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary-soft">
                            {projectDrill.proj.status}
                          </Badge>
                          {projectDrill.proj.location && (
                            <span className="text-xs text-muted-foreground">{projectDrill.proj.location}</span>
                          )}
                          {projectDrill.proj.start_date && (
                            <span className="text-xs text-muted-foreground">
                              Start: {formatDate((projectDrill.proj.start_date as any)?.toDate?.())}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold tabular-nums">{projectDrill.active.length}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/projects/${projectDrill.proj.id}`}>
                            <Eye className="h-4 w-4" /> Open
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Candidates by workflow status */}
                  {projectDrill.active.length === 0 ? (
                    <Card className="glass-card p-10 text-center">
                      <p className="text-sm text-muted-foreground">No active candidates in this project.</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(projectDrill.grouped).map(([statusLabel, list]) => (
                        <Card key={statusLabel} className="glass-card overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
                            <div className="flex items-center gap-2">
                              <Tag className="h-3.5 w-3.5 text-secondary" />
                              <span className="text-sm font-semibold">{statusLabel}</span>
                            </div>
                            <Badge variant="secondary" className="bg-secondary/10 text-secondary border-0">{list.length}</Badge>
                          </div>
                          <ul className="divide-y divide-border/50">
                            {list.map((a) => {
                              const c = candidateMap.get(a.candidate_id);
                              return (
                                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                                  <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                                    {c ? initials(c.name) : "?"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{c?.name ?? "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{c?.phone ?? "—"}</p>
                                  </div>
                                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                    {formatDate((a.assigned_at as any)?.toDate?.())}
                                  </span>
                                  {c && (
                                    <Button asChild variant="ghost" size="sm" className="h-7 text-primary hover:text-primary hover:bg-primary-soft shrink-0">
                                      <Link to={`/candidates/${c.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                                    </Button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {loading ? (
                    <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                  ) : projectRows.length === 0 ? (
                    <Card className="glass-card p-10 text-center">
                      <p className="text-sm text-muted-foreground">No projects found.</p>
                    </Card>
                  ) : (
                    <>
                      {/* Mobile: cards */}
                      <ul className="sm:hidden space-y-2">
                        {projectRows.map((p) => (
                          <li key={p.id}>
                            <button
                              onClick={() => setSelectedProjectId(p.id)}
                              className="w-full text-left rounded-xl border border-border/60 bg-muted/10 p-3 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">{p.name}</p>
                                  {p.client_name && <p className="text-xs text-muted-foreground truncate">{p.client_name}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary-soft text-xs">{p.activeCount} active</Badge>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* Desktop: table */}
                      <div className="hidden sm:block rounded-xl border border-border/60 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="font-semibold text-foreground">Project</TableHead>
                              <TableHead className="font-semibold text-foreground">Status</TableHead>
                              <TableHead className="font-semibold text-foreground">Location</TableHead>
                              <TableHead className="font-semibold text-foreground text-center">Active candidates</TableHead>
                              <TableHead className="font-semibold text-foreground text-right">Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projectRows.map((p, idx) => (
                              <TableRow
                                key={p.id}
                                className={cn("border-b border-border/60 cursor-pointer hover:bg-primary-soft/40", idx % 2 === 1 && "bg-muted/20")}
                                onClick={() => setSelectedProjectId(p.id)}
                              >
                                <TableCell>
                                  <div>
                                    <p className="text-sm font-semibold">{p.name}</p>
                                    {p.client_name && <p className="text-xs text-muted-foreground">{p.client_name}</p>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary-soft text-xs">{p.status}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{p.location || "—"}</TableCell>
                                <TableCell className="text-center">
                                  <span className="text-sm font-bold tabular-nums">{p.activeCount}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── TAB 3: Supply Partner Report ── */}
            <TabsContent value="partners" className="mt-0">
              {selectedAgencyId && agencyDrill ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedAgencyId(null)}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to supply partners
                  </button>

                  <Card className="glass-card p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold">{agencyDrill.agency.name}</h2>
                          {agencyDrill.agency.kissp_id && (
                            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {agencyDrill.agency.kissp_id}
                            </span>
                          )}
                        </div>
                        {agencyDrill.agency.city_name && (
                          <p className="text-sm text-muted-foreground mt-0.5">{agencyDrill.agency.city_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold tabular-nums">{agencyDrill.cands.length}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Candidates</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/supply-partners/${agencyDrill.agency.id}`}>
                            <Eye className="h-4 w-4" /> Open
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {agencyDrill.cands.length === 0 ? (
                    <Card className="glass-card p-10 text-center">
                      <p className="text-sm text-muted-foreground">No candidates from this partner yet.</p>
                    </Card>
                  ) : (
                    <Card className="glass-card overflow-hidden">
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="font-semibold text-foreground">Candidate</TableHead>
                              <TableHead className="font-semibold text-foreground">Phone</TableHead>
                              <TableHead className="font-semibold text-foreground">Status</TableHead>
                              <TableHead className="font-semibold text-foreground">KYC</TableHead>
                              <TableHead className="font-semibold text-foreground">Added</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agencyDrill.cands.map((c, idx) => {
                              const isAssigned = activeAssignedIds.has(c.id);
                              const hasFullKyc = !!c.aadhar_number && !!c.pan_number;
                              return (
                                <TableRow key={c.id} className={cn("border-b border-border/60 hover:bg-primary-soft/40", idx % 2 === 1 && "bg-muted/20")}>
                                  <TableCell>
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                                        {initials(c.name)}
                                      </div>
                                      <span className="text-sm font-medium">{c.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground tabular-nums">{c.phone}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={cn(
                                      "text-xs",
                                      isAssigned ? "border-primary/30 text-primary bg-primary-soft" : "border-green-500/30 text-green-600 bg-green-500/10"
                                    )}>{isAssigned ? "Assigned" : "Available"}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {hasFullKyc ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                                    {formatDate((c.created_at as any)?.toDate?.())}
                                  </TableCell>
                                  <TableCell>
                                    <Button asChild variant="ghost" size="sm" className="h-7 text-primary hover:text-primary hover:bg-primary-soft">
                                      <Link to={`/candidates/${c.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile */}
                      <ul className="sm:hidden divide-y divide-border/60">
                        {agencyDrill.cands.map((c) => {
                          const isAssigned = activeAssignedIds.has(c.id);
                          return (
                            <li key={c.id} className="flex items-center gap-3 p-3 hover:bg-muted/20">
                              <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                                {initials(c.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground">{c.phone}</p>
                              </div>
                              <Badge variant="outline" className={cn(
                                "text-xs shrink-0",
                                isAssigned ? "border-primary/30 text-primary bg-primary-soft" : "border-green-500/30 text-green-600 bg-green-500/10"
                              )}>{isAssigned ? "Assigned" : "Available"}</Badge>
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {loading ? (
                    <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                  ) : agencyRows.length === 0 ? (
                    <Card className="glass-card p-10 text-center">
                      <p className="text-sm text-muted-foreground">No supply partners found.</p>
                    </Card>
                  ) : (
                    <>
                      {/* Mobile */}
                      <ul className="sm:hidden space-y-2">
                        {agencyRows.map((a) => (
                          <li key={a.id}>
                            <button
                              onClick={() => setSelectedAgencyId(a.id)}
                              className="w-full text-left rounded-xl border border-border/60 bg-muted/10 p-3 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold truncate">{a.name}</p>
                                    {a.kissp_id && <span className="text-[10px] font-mono text-primary">{a.kissp_id}</span>}
                                  </div>
                                  {a.city_name && <p className="text-xs text-muted-foreground">{a.city_name}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-sm font-bold tabular-nums">{a.candidateCount}</span>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* Desktop */}
                      <div className="hidden sm:block rounded-xl border border-border/60 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="font-semibold text-foreground">Partner</TableHead>
                              <TableHead className="font-semibold text-foreground">City</TableHead>
                              <TableHead className="font-semibold text-foreground text-center">Candidates</TableHead>
                              <TableHead className="font-semibold text-foreground text-center">Assigned</TableHead>
                              <TableHead className="font-semibold text-foreground text-center">Available</TableHead>
                              <TableHead className="font-semibold text-foreground text-right">Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agencyRows.map((a, idx) => (
                              <TableRow
                                key={a.id}
                                className={cn("border-b border-border/60 cursor-pointer hover:bg-primary-soft/40", idx % 2 === 1 && "bg-muted/20")}
                                onClick={() => setSelectedAgencyId(a.id)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-secondary/10 text-secondary grid place-items-center shrink-0">
                                      <Building2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold">{a.name}</p>
                                      {a.kissp_id && <p className="text-[10px] font-mono text-primary">{a.kissp_id}</p>}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{a.city_name || "—"}</TableCell>
                                <TableCell className="text-center font-bold tabular-nums">{a.candidateCount}</TableCell>
                                <TableCell className="text-center text-sm text-primary tabular-nums">{a.assignedCount}</TableCell>
                                <TableCell className="text-center text-sm text-green-600 tabular-nums">{a.candidateCount - a.assignedCount}</TableCell>
                                <TableCell className="text-right">
                                  <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

      </div>

      {/* ── Candidate drill-down dialog ── */}
      <Dialog open={!!drillKey} onOpenChange={(o) => { if (!o) setDrillKey(null); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border bg-gradient-soft">
            <DialogTitle className="text-base font-semibold">
              {drillKey ? drillTitle[drillKey] : ""}
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              {drillCandidates.length} candidate{drillCandidates.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {drillCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No candidates in this category.</p>
            ) : (
              <>
                {/* Mobile */}
                <ul className="sm:hidden divide-y divide-border/50">
                  {drillCandidates.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                      <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/candidates/${c.id}`} className="text-sm font-medium hover:text-primary transition-colors block truncate">
                          {c.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{c.status}</Badge>
                    </li>
                  ))}
                </ul>

                {/* Desktop */}
                <table className="hidden sm:table w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Candidate</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Phone</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">KISFS ID</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {drillCandidates.map((c, idx) => (
                      <tr key={c.id} className={cn("hover:bg-primary-soft/40 transition-colors", idx % 2 === 1 && "bg-muted/20")}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-gradient-brand text-white grid place-items-center text-[10px] font-semibold shrink-0">
                              {initials(c.name)}
                            </div>
                            <Link to={`/candidates/${c.id}`} onClick={() => setDrillKey(null)} className="font-medium hover:text-primary transition-colors">
                              {c.name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{c.phone}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: STATUS_COLORS[c.status] + "60", color: STATUS_COLORS[c.status] }}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{c.kisfs_id ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Button asChild variant="ghost" size="sm" className="h-7 text-primary hover:text-primary hover:bg-primary-soft" onClick={() => setDrillKey(null)}>
                            <Link to={`/candidates/${c.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KycCard({
  label, value, total, color, loading, onClick,
}: {
  label: string; value: number; total: number; color: "green" | "yellow" | "red"; loading: boolean; onClick?: () => void;
}) {
  const colors = {
    green: { ring: "border-green-500/30", bg: "bg-green-500/5", text: "text-green-600 dark:text-green-400", bar: "bg-green-500" },
    yellow: { ring: "border-yellow-500/30", bg: "bg-yellow-500/5", text: "text-yellow-600 dark:text-yellow-400", bar: "bg-yellow-500" },
    red: { ring: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-600 dark:text-red-400", bar: "bg-red-500" },
  }[color];

  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Card
      className={cn("p-4 border hover-lift glass-card", colors.ring, colors.bg, onClick && "cursor-pointer hover:ring-2 hover:ring-offset-0 transition-all", color === "green" && "hover:ring-green-500/30", color === "yellow" && "hover:ring-yellow-500/30", color === "red" && "hover:ring-red-500/30")}
      onClick={onClick}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="h-8 w-14 mt-2" /> : (
        <p className={cn("text-3xl font-bold mt-1 tabular-nums", colors.text)}>{value}</p>
      )}
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", colors.bar)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{pct}% of total</p>
    </Card>
  );
}

