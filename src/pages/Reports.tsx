import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  Briefcase,
  UserCheck,
  CalendarIcon,
  Filter,
  Activity,
  TrendingUp,
  Eye,
  Loader2,
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
import type { DateRange } from "react-day-picker";

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useCombinedCandidatePool, useAllCandidates, bulkUpdateKycData } from "@/hooks/useCandidates";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments, bulkRebuildAssignments } from "@/hooks/useAssignments";
import { useAuth } from "@/context/AuthContext";
import { formatDate, initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  New: "hsl(var(--secondary))",
  Contacted: "hsl(var(--warning))",
  Assigned: "hsl(var(--primary))",
  Rejected: "hsl(var(--destructive))",
};

const PROJECT_COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground) / 0.5)"];

const SOURCE_PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

export default function Reports() {
  const { isAdmin, agencyId } = useAuth();
  const { candidates: rawCandidates, loading: cLoading } = useCombinedCandidatePool();
  const { candidates: allCandidates } = useAllCandidates();
  const { projects, loading: pLoading } = useProjects({ bypassOwnerFilter: isAdmin });
  const { assignments, loading: aLoading } = useAssignments({ bypassOwnerFilter: isAdmin });
  const { toast } = useToast();

  async function handleSeedKycData() {
    try {
      const updated = await bulkUpdateKycData();
      toast({ title: "Seeding complete", description: `Updated ${updated} candidates.` });
    } catch (err: any) {
      toast({ title: "Error seeding data", description: err?.message, variant: "destructive" });
    }
  }

  async function handleRebuildAssignments() {
    try {
      const updated = await bulkRebuildAssignments();
      toast({ title: "Rebuild complete", description: `Assigned ${updated} candidates.` });
    } catch (err: any) {
      toast({ title: "Error rebuilding assignments", description: err?.message, variant: "destructive" });
    }
  }

  const candidates = useMemo(() => {
    if (isAdmin) return rawCandidates;
    return rawCandidates.filter((c) => c.agency_id === agencyId);
  }, [rawCandidates, isAdmin, agencyId]);

  const loading = cLoading || pLoading || aLoading;

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kycFilter, setKycFilter] = useState<string>("all");

  const sources = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => c.source && set.add(c.source));
    return Array.from(set).sort();
  }, [candidates]);

  const kycStatsCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      const created = (c.created_at as any)?.toDate?.() as Date | undefined;
      if (dateRange?.from && created && created < dateRange.from) return false;
      if (dateRange?.to && created && created > dateRange.to) return false;
      return true;
    });
  }, [candidates, sourceFilter, statusFilter, dateRange]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;

      const hasAadhar = !!c.aadhar_number;
      const hasPan = !!c.pan_number;
      if (kycFilter === "fully_verified" && (!hasAadhar || !hasPan)) return false;
      if (kycFilter === "aadhar_only" && (!hasAadhar || hasPan)) return false;
      if (kycFilter === "pan_only" && (hasAadhar || !hasPan)) return false;
      if (kycFilter === "kyc_pending" && (hasAadhar || hasPan)) return false;

      const created = (c.created_at as any)?.toDate?.() as Date | undefined;
      if (dateRange?.from && created && created < dateRange.from) return false;
      if (dateRange?.to && created && created > dateRange.to) return false;
      return true;
    });
  }, [candidates, sourceFilter, statusFilter, kycFilter, dateRange]);

  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === "Active"),
    [assignments]
  );
  const assignedIds = useMemo(
    () => new Set(activeAssignments.map((a) => a.candidate_id)),
    [activeAssignments]
  );
  const availableCount = filteredCandidates.filter((c) => !assignedIds.has(c.id)).length;
  const activeProjects = projects.filter((p) => p.status === "Active");

  const stats = [
    {
      label: "Total candidates",
      value: filteredCandidates.length,
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
      hint: `${projects.length} total`,
    },
    {
      label: "Available candidates",
      value: availableCount,
      icon: UserCheck,
      gradient: "bg-gradient-accent",
      ring: "ring-accent/20",
      hint: `${assignedIds.size} currently assigned`,
    },
  ].filter((s) => isAdmin || s.label !== "Active projects");

  const kycStats = useMemo(() => {
    let fullKyc = 0;
    let aadharOnly = 0;
    let panOnly = 0;
    let pending = 0;

    for (const c of kycStatsCandidates) {
      const hasAadhar = !!c.aadhar_number;
      const hasPan = !!c.pan_number;

      if (hasAadhar && hasPan) {
        fullKyc++;
      } else if (hasAadhar && !hasPan) {
        aadharOnly++;
      } else if (!hasAadhar && hasPan) {
        panOnly++;
      } else {
        pending++;
      }
    }

    return {
      total: kycStatsCandidates.length,
      fullKyc,
      aadharOnly,
      panOnly,
      pending,
    };
  }, [filteredCandidates]);

  // Candidates by status
  const statusData = useMemo(() => {
    const map: Record<string, number> = { New: 0, Contacted: 0, Assigned: 0, Rejected: 0 };
    for (const c of filteredCandidates) {
      map[c.status] = (map[c.status] ?? 0) + 1;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredCandidates]);

  // Projects by status
  const projectData = useMemo(() => {
    return [
      { name: "Active", value: projects.filter((p) => p.status === "Active").length },
      { name: "Completed", value: projects.filter((p) => p.status === "Completed").length },
    ];
  }, [projects]);

  // Source distribution
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of filteredCandidates) {
      const key = c.source?.trim() || "Unknown";
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredCandidates]);

  // Lookup map includes soft-deleted candidates so historic assignments
  // still resolve to a name (rendered with a "Deleted" badge).
  const candidateMap = useMemo(
    () => new Map(allCandidates.map((c) => [c.id, c])),
    [allCandidates]
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const recentAssignments = useMemo(() => {
    return [...assignments]
      .sort((a, b) => {
        const ta = (a.assigned_at as any)?.toMillis?.() ?? 0;
        const tb = (b.assigned_at as any)?.toMillis?.() ?? 0;
        return tb - ta;
      })
      .slice(0, 10);
  }, [assignments]);

  function clearFilters() {
    setDateRange(undefined);
    setSourceFilter("all");
    setStatusFilter("all");
    setKycFilter("all");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analytics and insights across your workforce."
      />

      {/* Filters */}
      <Card className="glass-card p-5 hover-lift animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-[260px]",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} —{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={kycFilter} onValueChange={setKycFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="KYC Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KYC Statuses</SelectItem>
              <SelectItem value="fully_verified">Fully Verified</SelectItem>
              <SelectItem value="aadhar_only">Aadhar Only</SelectItem>
              <SelectItem value="pan_only">PAN Only</SelectItem>
              <SelectItem value="kyc_pending">KYC Pending</SelectItem>
            </SelectContent>
          </Select>

          {(dateRange || sourceFilter !== "all" || statusFilter !== "all" || kycFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Summary cards */}
      <div className={cn("grid gap-4 sm:grid-cols-2", isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
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

      {/* Candidate KYC Summary */}
      <div className="space-y-3 mt-8">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Candidate KYC Summary</h3>
          <p className="text-xs text-muted-foreground">Overview of identity verification status</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card
            onClick={() => setKycFilter("all")}
            className={cn(
              "relative overflow-hidden p-5 border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up cursor-pointer",
              kycFilter === "all" ? "border-primary ring-2 ring-primary/20 bg-muted/5" : "border-border/60"
            )}
          >
            <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
            <p className="text-4xl font-bold mt-2 tracking-tight tabular-nums">{kycStats.total}</p>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-3">Platform Pool</div>
          </Card>

          <Card
            onClick={() => setKycFilter("fully_verified")}
            className={cn(
              "relative overflow-hidden p-5 border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up cursor-pointer",
              kycFilter === "fully_verified" ? "border-green-500 ring-2 ring-green-500/20 bg-green-500/5" : "border-border/60"
            )}
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-20 blur-2xl bg-green-500" />
            <p className="text-sm font-medium text-muted-foreground">Fully Verified</p>
            <p className="text-4xl font-bold mt-2 tracking-tight tabular-nums text-green-600 dark:text-green-400">{kycStats.fullKyc}</p>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400 mt-3">Full KYC</div>
          </Card>

          <Card
            onClick={() => setKycFilter("aadhar_only")}
            className={cn(
              "relative overflow-hidden p-5 border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up cursor-pointer",
              kycFilter === "aadhar_only" ? "border-yellow-500 ring-2 ring-yellow-500/20 bg-yellow-500/5" : "border-border/60"
            )}
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-20 blur-2xl bg-yellow-500" />
            <p className="text-sm font-medium text-muted-foreground">Aadhar Only</p>
            <p className="text-4xl font-bold mt-2 tracking-tight tabular-nums text-yellow-600 dark:text-yellow-400">{kycStats.aadharOnly}</p>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400 mt-3">Partial KYC</div>
          </Card>

          <Card
            onClick={() => setKycFilter("pan_only")}
            className={cn(
              "relative overflow-hidden p-5 border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up cursor-pointer",
              kycFilter === "pan_only" ? "border-yellow-500 ring-2 ring-yellow-500/20 bg-yellow-500/5" : "border-border/60"
            )}
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-20 blur-2xl bg-yellow-500" />
            <p className="text-sm font-medium text-muted-foreground">PAN Only</p>
            <p className="text-4xl font-bold mt-2 tracking-tight tabular-nums text-yellow-600 dark:text-yellow-400">{kycStats.panOnly}</p>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400 mt-3">Partial KYC</div>
          </Card>

          <Card
            onClick={() => setKycFilter("kyc_pending")}
            className={cn(
              "relative overflow-hidden p-5 border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up cursor-pointer",
              kycFilter === "kyc_pending" ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : "border-border/60"
            )}
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-20 blur-2xl bg-red-500" />
            <p className="text-sm font-medium text-muted-foreground">KYC Pending</p>
            <p className="text-4xl font-bold mt-2 tracking-tight tabular-nums text-red-600 dark:text-red-400">{kycStats.pending}</p>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 mt-3">Pending KYC</div>
          </Card>
        </div>
      </div>

      {/* Filtered KYC Candidates List */}
      <div className="space-y-3 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              {kycFilter === "all" && "All Candidates"}
              {kycFilter === "fully_verified" && "Fully Verified Candidates"}
              {kycFilter === "aadhar_only" && "Aadhar Only Candidates"}
              {kycFilter === "pan_only" && "PAN Only Candidates"}
              {kycFilter === "kyc_pending" && "KYC Pending Candidates"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Showing {filteredCandidates.length} matching candidate profile{filteredCandidates.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {filteredCandidates.length === 0 ? (
          <Card className="glass-card p-8 text-center border-border/60">
            <p className="text-sm text-muted-foreground">No candidates match this KYC filter.</p>
          </Card>
        ) : (
          <>
            {/* Mobile View: Vertical Cards */}
            <ul className="md:hidden space-y-3">
              {filteredCandidates.map((c) => (
                <li key={c.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 group">
                      <div className="h-10 w-10 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shadow-sm shrink-0">
                        {initials(c.name)}
                      </div>
                      <div>
                        <span className="font-semibold group-hover:text-primary transition-colors text-sm text-foreground">{c.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>
                      </div>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary-soft text-primary shrink-0" asChild>
                      <Link to={`/candidates/${c.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/50 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Aadhar</span>
                      {c.aadhar_number ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium tabular-nums text-foreground">{c.aadhar_number}</span>
                          {c.aadhar_verified && (
                            <Badge className="h-3.5 text-[8px] px-1 py-0 bg-green-500/20 text-green-600 dark:text-green-400 border-0 font-bold">VER</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">PAN</span>
                      {c.pan_number ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium tracking-wider text-foreground">{c.pan_number}</span>
                          {c.pan_verified && (
                            <Badge className="h-3.5 text-[8px] px-1 py-0 bg-green-500/20 text-green-600 dark:text-green-400 border-0 font-bold">VER</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  {c.source && (
                    <div className="pt-2">
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Source: {c.source}</Badge>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Desktop View: Table */}
            <div className="hidden md:block rounded-xl border border-border/60 bg-muted/10 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50 backdrop-blur">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-semibold text-foreground">Candidate</TableHead>
                    <TableHead className="font-semibold text-foreground">Aadhar Details</TableHead>
                    <TableHead className="font-semibold text-foreground">PAN Details</TableHead>
                    <TableHead className="font-semibold text-foreground">Phone</TableHead>
                    <TableHead className="font-semibold text-foreground">Source</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((c, idx) => (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "border-b border-border/60 transition-colors hover:bg-primary-soft/40",
                        idx % 2 === 1 && "bg-muted/20"
                      )}
                    >
                      <TableCell className="font-medium">
                        <Link
                          to={`/candidates/${c.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-[11px] font-semibold shadow-sm shrink-0">
                            {initials(c.name)}
                          </div>
                          <span className="group-hover:text-primary transition-colors text-sm">{c.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.aadhar_number ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium tabular-nums">{c.aadhar_number}</span>
                            {c.aadhar_verified && (
                              <Badge className="h-4 text-[9px] px-1 py-0 bg-green-500/20 text-green-600 dark:text-green-400 border-0 font-semibold">
                                Verified
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.pan_number ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium tracking-wider">{c.pan_number}</span>
                            {c.pan_verified && (
                              <Badge className="h-4 text-[9px] px-1 py-0 bg-green-500/20 text-green-600 dark:text-green-400 border-0 font-semibold">
                                Verified
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {c.phone}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.source || "None"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary-soft text-primary"
                          asChild
                        >
                          <Link to={`/candidates/${c.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold tracking-tight">Candidates by status</h3>
              <p className="text-xs text-muted-foreground">Pipeline distribution</p>
            </div>
            <Badge variant="secondary" className="bg-primary-soft text-primary border-0">
              <Activity className="h-3 w-3 mr-1" /> Live
            </Badge>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : statusData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <defs>
                  {statusData.map((entry, i) => (
                    <linearGradient key={`pg-${entry.name}`} id={`pieStatus-${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={STATUS_COLORS[entry.name]} stopOpacity={1} />
                      <stop offset="100%" stopColor={STATUS_COLORS[entry.name]} stopOpacity={0.55} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={statusData}
                  innerRadius={55}
                  outerRadius={92}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={3}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={entry.name} fill={`url(#pieStatus-${i})`} />
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

        <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
          <div className="mb-4">
            <h3 className="font-semibold tracking-tight">Projects by status</h3>
            <p className="text-xs text-muted-foreground">Active vs completed</p>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={projectData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="projBarActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary-glow))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="projBarCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground) / 0.7)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground) / 0.3)" stopOpacity={0.6} />
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
                  }}
                />
                <Bar dataKey="value" radius={[12, 12, 4, 4]} animationDuration={900}>
                  {projectData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "url(#projBarActive)" : "url(#projBarCompleted)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="glass-card p-4 sm:p-6 hover-lift animate-fade-in-up">
        <div className="mb-4">
          <h3 className="font-semibold tracking-tight">Source distribution</h3>
          <p className="text-xs text-muted-foreground">Top recruitment sources</p>
        </div>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : sourceData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No source data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sourceData}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
            >
              <defs>
                {sourceData.map((_, i) => (
                  <linearGradient key={`sg-${i}`} id={`sourceBar-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={SOURCE_PALETTE[i % SOURCE_PALETTE.length]} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={SOURCE_PALETTE[i % SOURCE_PALETTE.length]} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} opacity={0.5} />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--primary) / 0.08)", radius: 8 }}
                contentStyle={{
                  background: "hsl(var(--popover) / 0.95)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "var(--shadow-elevated)",
                }}
              />
              <Bar dataKey="value" radius={[0, 12, 12, 0]} animationDuration={900}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={`url(#sourceBar-${i})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Recent assignments table */}
      <Card className="glass-card hover-lift animate-fade-in-up overflow-hidden">
        <div className="p-5 border-b border-border/60">
          <h3 className="font-semibold tracking-tight">Recent assignments activity</h3>
          <p className="text-xs text-muted-foreground">Latest 10 assignments</p>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recentAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            No assignments yet.
          </p>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="md:hidden p-3 space-y-3">
              {recentAssignments.map((a) => {
                const c = candidateMap.get(a.candidate_id);
                const p = projectMap.get(a.project_id);
                const isDeleted = !!c?.is_deleted;
                return (
                  <li key={a.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "h-9 w-9 rounded-full grid place-items-center text-[11px] font-semibold text-white shrink-0",
                        isDeleted ? "bg-muted-foreground/60" : "bg-gradient-brand"
                      )}>
                        {c ? initials(c.name) : "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        {c ? (
                          isDeleted ? (
                            <p className="font-medium text-sm text-muted-foreground line-through break-words">
                              {c.name}
                            </p>
                          ) : (
                            <Link to={`/candidates/${c.id}`} className="font-medium text-sm hover:text-primary break-words block">
                              {c.name}
                            </Link>
                          )
                        ) : (
                          <p className="font-medium text-sm text-muted-foreground italic">Unknown</p>
                        )}
                        <Link to={`/projects/${p?.id ?? ""}`} className="text-xs text-muted-foreground hover:text-primary break-words block">
                          {p?.name ?? "Unknown project"}
                        </Link>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          a.status === "Active" && "border-primary/40 text-primary bg-primary-soft",
                          a.status === "Completed" && "border-muted-foreground/30 text-muted-foreground",
                          a.status === "Dropped" && "border-destructive/40 text-destructive bg-destructive/10"
                        )}
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wide">Assigned</p>
                        <p className="font-medium mt-0.5">{formatDate((a.assigned_at as any)?.toDate?.())}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wide">Removed</p>
                        <p className="font-medium mt-0.5">
                          {a.removed_at ? formatDate((a.removed_at as any)?.toDate?.()) : "—"}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Removed</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAssignments.map((a, idx) => {
                    const c = candidateMap.get(a.candidate_id);
                    const p = projectMap.get(a.project_id);
                    const isDeleted = !!c?.is_deleted;
                    return (
                      <TableRow
                        key={a.id}
                        className={cn(
                          "transition-colors",
                          idx % 2 === 1 && "bg-muted/20"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "h-8 w-8 rounded-full grid place-items-center text-[10px] font-semibold text-white",
                              isDeleted ? "bg-muted-foreground/60" : "bg-gradient-brand"
                            )}>
                              {c ? initials(c.name) : "?"}
                            </div>
                            {c ? (
                              isDeleted ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="font-medium text-sm text-muted-foreground line-through decoration-muted-foreground/40">
                                    {c.name}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-muted-foreground/30 text-muted-foreground bg-muted/40">
                                    Deleted
                                  </Badge>
                                </span>
                              ) : (
                                <Link
                                  to={`/candidates/${c.id}`}
                                  className="font-medium text-sm hover:text-primary"
                                >
                                  {c.name}
                                </Link>
                              )
                            ) : (
                              <span className="font-medium text-sm text-muted-foreground italic">Unknown</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/projects/${p?.id ?? ""}`}
                            className="text-sm hover:text-primary"
                          >
                            {p?.name ?? "Unknown project"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate((a.assigned_at as any)?.toDate?.())}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.removed_at
                            ? formatDate((a.removed_at as any)?.toDate?.())
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              a.status === "Active" &&
                              "border-primary/40 text-primary bg-primary-soft",
                              a.status === "Completed" &&
                              "border-muted-foreground/30 text-muted-foreground",
                              a.status === "Dropped" &&
                              "border-destructive/40 text-destructive bg-destructive/10"
                            )}
                          >
                            {a.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
