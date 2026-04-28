import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Bike,
  MapPin,
  Filter,
  X,
  Eye,
  Users as UsersIcon,
  ShieldCheck,
  Building2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCandidates,
  useAgencyOwnedCandidates,
  useCombinedCandidatePool,
  softDeleteCandidate,
} from "@/hooks/useCandidates";
import { useAssignments } from "@/hooks/useAssignments";
import { useAgencies } from "@/hooks/useAgencies";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CandidateFormModal from "@/components/candidates/CandidateFormModal";
import type { Candidate, CandidateStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const STATUSES: (CandidateStatus | "all")[] = ["all", "New", "Contacted", "Assigned", "Rejected"];

const statusStyles: Record<CandidateStatus, string> = {
  New: "bg-secondary/15 text-secondary border border-secondary/30",
  Contacted: "bg-warning/15 text-warning border border-warning/30",
  Assigned: "bg-primary/15 text-primary border border-primary/30",
  Rejected: "bg-destructive/15 text-destructive border border-destructive/30",
};

const statusDot: Record<CandidateStatus, string> = {
  New: "bg-secondary",
  Contacted: "bg-warning",
  Assigned: "bg-primary",
  Rejected: "bg-destructive",
};

export default function CandidatesPage() {
  const { isAdmin, agencyId } = useAuth();
  const { candidates: adminCandidates, loading: adminLoading } = useCandidates();
  const { candidates: agencyCandidates, loading: agencyLoading } = useAgencyOwnedCandidates();
  // Agency users see admin pool + their own agency candidates combined.
  const { candidates: combinedPool, loading: combinedLoading } = useCombinedCandidatePool();
  const { agencies } = useAgencies({ includeDeleted: true });
  const { assignments } = useAssignments({ bypassOwnerFilter: !isAdmin });
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialAvail = (() => {
    const v = searchParams.get("availability");
    return v === "available" || v === "assigned" ? v : "all";
  })();

  // Tab state — only used for admin. Agency users always see their combined pool.
  const [tab, setTab] = useState<"admin" | "agency">("admin");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  // Origin filter for agency users: all | admin (admin pool) | mine (my agency)
  const [originFilter, setOriginFilter] = useState<"all" | "admin" | "mine">("all");

  const candidates = useMemo(() => {
    if (!isAdmin) {
      let list = combinedPool;
      if (originFilter === "admin") list = list.filter((c) => c.agency_id == null);
      else if (originFilter === "mine") list = list.filter((c) => c.agency_id === agencyId);
      return list;
    }
    if (tab === "admin") return adminCandidates;
    if (agencyFilter === "all") return agencyCandidates;
    return agencyCandidates.filter((c) => c.agency_id === agencyFilter);
  }, [isAdmin, tab, agencyFilter, originFilter, adminCandidates, agencyCandidates, combinedPool, agencyId]);

  const loading = isAdmin
    ? tab === "admin"
      ? adminLoading
      : agencyLoading
    : combinedLoading;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [availFilter, setAvailFilter] = useState<string>(initialAvail);
  const [page, setPage] = useState(1);

  // Reset pagination when tab/agency filter changes.
  useEffect(() => {
    setPage(1);
  }, [tab, agencyFilter]);

  // Keep URL in sync with availability filter (so Dashboard deep-links work
  // and the user can share the filtered view).
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (availFilter === "all") next.delete("availability");
    else next.set("availability", availFilter);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availFilter]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState<Candidate | null>(null);

  const activeAssignedIds = useMemo(
    () => new Set(assignments.filter((a) => a.status === "Active").map((a) => a.candidate_id)),
    [assignments]
  );
  const sources = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.source).filter(Boolean))),
    [candidates]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (term && !c.name.toLowerCase().includes(term) && !c.phone.toLowerCase().includes(term)) {
        return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (availFilter !== "all") {
        const isAvail = !activeAssignedIds.has(c.id);
        if (availFilter === "available" && !isAvail) return false;
        if (availFilter === "assigned" && isAvail) return false;
      }
      return true;
    });
  }, [candidates, search, statusFilter, sourceFilter, availFilter, activeAssignedIds]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(c: Candidate) {
    setEditing(c);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await softDeleteCandidate(deleting.id);
      toast({ title: "Candidate deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (availFilter !== "all" ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setSourceFilter("all");
    setAvailFilter("all");
    setPage(1);
  }

  const showAddButton = !isAdmin || tab === "admin";
  const agencyMap = useMemo(
    () => new Map(agencies.map((a) => [a.id, a])),
    [agencies]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Manage your candidate database, statuses, and availability."
        actions={
          showAddButton ? (
            <Button onClick={openAdd} variant="premium">
              <Plus className="h-4 w-4" /> Add candidate
            </Button>
          ) : null
        }
      />

      {isAdmin && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "admin" | "agency")}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <TabsList className="grid grid-cols-2 sm:w-auto sm:inline-flex">
              <TabsTrigger value="admin">Admin Candidates</TabsTrigger>
              <TabsTrigger value="agency">Agency Candidates</TabsTrigger>
            </TabsList>
            {tab === "agency" && (
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="Filter by agency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agencies</SelectItem>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.is_deleted ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <TabsContent value="admin" />
          <TabsContent value="agency" />
        </Tabs>
      )}

      {!isAdmin && (
        <Tabs value={originFilter} onValueChange={(v) => setOriginFilter(v as any)}>
          <TabsList className="grid grid-cols-3 sm:w-auto sm:inline-flex">
            <TabsTrigger value="all">All candidates</TabsTrigger>
            <TabsTrigger value="mine">My agency</TabsTrigger>
            <TabsTrigger value="admin">Admin pool</TabsTrigger>
          </TabsList>
          <TabsContent value="all" />
          <TabsContent value="mine" />
          <TabsContent value="admin" />
        </Tabs>
      )}

      <Card className="glass-card hover-lift overflow-hidden">
        <div className="p-4 border-b border-border/60 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search by name or phone…"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All statuses" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sourceFilter}
                onValueChange={(v) => {
                  setSourceFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
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
              <Select
                value={availFilter}
                onValueChange={(v) => {
                  setAvailFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="col-span-2 w-full sm:w-40">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3 w-3" /> Active filters:
              </span>
              {statusFilter !== "all" && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary-soft text-primary hover:bg-primary/20 transition-colors"
                >
                  Status: {statusFilter} <X className="h-3 w-3" />
                </button>
              )}
              {sourceFilter !== "all" && (
                <button
                  onClick={() => {
                    setSourceFilter("all");
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary-soft text-secondary hover:bg-secondary/20 transition-colors"
                >
                  Source: {sourceFilter} <X className="h-3 w-3" />
                </button>
              )}
              {availFilter !== "all" && (
                <button
                  onClick={() => {
                    setAvailFilter("all");
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
                >
                  {availFilter === "available" ? "Available" : "Assigned"} <X className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Mobile: stacked card list */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-16 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted grid place-items-center">
                <UsersIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No candidates found</p>
              <p className="text-xs">Try adjusting your filters or add a new candidate.</p>
            </div>
          ) : (
            <ul className="p-3 space-y-3">
              {paginated.map((c) => {
                const isAvail = !activeAssignedIds.has(c.id);
                return (
                  <li key={c.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/candidates/${c.id}`} className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shadow-sm shrink-0">
                          {initials(c.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-sm break-words">{c.name}</p>
                            <OriginBadge agencyId={c.agency_id} agencyName={c.agency_id ? agencyMap.get(c.agency_id)?.name : null} />
                          </div>
                          <p className="text-xs text-muted-foreground tabular-nums break-all">{c.phone}</p>
                          <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="break-words">{c.location}</span>
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-primary hover:text-primary hover:bg-primary-soft"
                          onClick={() => navigate(`/candidates/${c.id}`)}
                          aria-label="View candidate"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/candidates/${c.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleting(c)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 pt-3 mt-3 border-t border-border/50">
                      <Badge
                        className={cn(
                          "font-medium gap-1.5 px-2 py-0.5 text-[11px]",
                          statusStyles[c.status]
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[c.status])} />
                        {c.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px]",
                          isAvail
                            ? "border-primary/40 text-primary bg-primary-soft"
                            : "border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {isAvail ? "Available" : "Assigned"}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] border-border text-muted-foreground">
                        {c.source}
                      </Badge>
                      {c.has_bike && (
                        <Badge variant="outline" className="text-[11px] border-border text-muted-foreground inline-flex items-center gap-1">
                          <Bike className="h-3 w-3" /> Bike
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-auto max-h-[calc(100vh-360px)] relative">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="font-semibold text-foreground">Candidate</TableHead>
                <TableHead className="font-semibold text-foreground">Phone</TableHead>
                <TableHead className="font-semibold text-foreground">Location</TableHead>
                <TableHead className="font-semibold text-foreground">Source</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground">Availability</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-12 w-12 rounded-full bg-muted grid place-items-center">
                        <UsersIcon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium">No candidates found</p>
                      <p className="text-xs">Try adjusting your filters or add a new candidate.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((c, idx) => {
                  const isAvail = !activeAssignedIds.has(c.id);
                  return (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "group transition-colors border-b border-border/60",
                        idx % 2 === 1 && "bg-muted/20",
                        "hover:bg-primary-soft/40"
                      )}
                    >
                      <TableCell>
                        <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 group/link">
                          <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shadow-sm group-hover/link:shadow-brand transition-shadow">
                            {initials(c.name)}
                          </div>
                          <div>
                            <p className="font-medium text-sm group-hover/link:text-primary transition-colors">
                              {c.name}
                            </p>
                            {c.has_bike && (
                              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                                <Bike className="h-3 w-3" /> Has bike
                              </p>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{c.phone}</TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {c.location}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{c.source}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "font-medium gap-1.5 px-2.5 py-0.5",
                            statusStyles[c.status]
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[c.status])} />
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isAvail
                              ? "border-primary/40 text-primary bg-primary-soft"
                              : "border-muted-foreground/30 text-muted-foreground"
                          }
                        >
                          {isAvail ? "Available" : "Assigned"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-primary hover:text-primary hover:bg-primary-soft"
                            onClick={() => navigate(`/candidates/${c.id}`)}
                            aria-label="View candidate"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-60 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/candidates/${c.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(c)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleting(c)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-t border-border/60 bg-muted/20">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Showing <span className="font-semibold text-foreground">{paginated.length}</span> of{" "}
            <span className="font-semibold text-foreground">{filtered.length}</span> candidates
          </p>
          <div className="flex items-center justify-center sm:justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex-1 sm:flex-none"
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              Page {safePage} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <CandidateFormModal open={modalOpen} onOpenChange={setModalOpen} candidate={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} will be soft-deleted and hidden from lists. This can be reversed by
              an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
