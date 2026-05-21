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
  UserCog,
  ArrowRight,
  ShieldBan,
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
  blocklistCandidate,
  unblocklistCandidate,
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
const STATUSES: (CandidateStatus | "all")[] = [
  "all",
  "New",
  "Contacted",
  "Assigned",
  "Rejected",
  "Call Back",
  "Follow Up",
  "On Hold",
  "Interview Pending",
  "Not Answering",
  "Not Interested",
  "Not Responding",
];

const statusStyles: Record<CandidateStatus, string> = {
  New: "bg-secondary/15 text-secondary border border-secondary/30",
  Contacted: "bg-warning/15 text-warning border border-warning/30",
  Assigned: "bg-primary/15 text-primary border border-primary/30",
  Rejected: "bg-destructive/15 text-destructive border border-destructive/30",
  "Call Back": "bg-accent/15 text-accent border border-accent/30",
  "Follow Up": "bg-warning/15 text-warning border border-warning/30",
  "On Hold": "bg-muted text-muted-foreground border border-border",
  "Interview Pending": "bg-primary/15 text-primary border border-primary/30",
  "Not Answering": "bg-destructive/15 text-destructive border border-destructive/30",
  "Not Interested": "bg-destructive/15 text-destructive border border-destructive/30",
  "Not Responding": "bg-destructive/15 text-destructive border border-destructive/30",
};

const statusDot: Record<CandidateStatus, string> = {
  New: "bg-secondary",
  Contacted: "bg-warning",
  Assigned: "bg-primary",
  Rejected: "bg-destructive",
  "Call Back": "bg-accent",
  "Follow Up": "bg-warning",
  "On Hold": "bg-muted-foreground",
  "Interview Pending": "bg-primary",
  "Not Answering": "bg-destructive",
  "Not Interested": "bg-destructive",
  "Not Responding": "bg-destructive",
};

export default function CandidatesPage() {
  const { isAdmin, agencyId, canEditCandidates } = useAuth();
  const { candidates: adminCandidates, loading: adminLoading } = useCandidates();
  const { candidates: agencyCandidates, loading: agencyLoading } = useAgencyOwnedCandidates();
  // Combined pool: admin pool + every agency's candidates (used by the "All
  // candidates" tab for admins, and by the unified view for agency users).
  const { candidates: combinedPool, loading: combinedLoading } = useCombinedCandidatePool();
  const { agencies } = useAgencies({ includeDeleted: true, isInternal: false });
  // All agencies (external + internal, including deactivated) — used to keep
  // admins from accidentally hiding candidates whose owning agency is
  // internal (which the external-only list above does not know about).
  const { agencies: allAgencies } = useAgencies({ includeDeleted: true });
  const { agencies: internalPartners, loading: ipLoading } = useAgencies({ isInternal: true });
  // Admins view a combined pool (admin + every agency); to correctly compute
  // availability for agency-owned candidates we need ALL assignments, not
  // just admin-owned ones. Agency users also bypass so they can see active
  // assignments on admin-pool candidates they were assigned to.
  const { assignments } = useAssignments({ bypassOwnerFilter: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialAvail = (() => {
    const v = searchParams.get("availability");
    return v === "available" || v === "assigned" ? v : "all";
  })();

  // Tab state — admins choose between All / Admin / Agency / Internal Team.
  const [tab, setTab] = useState<"all" | "admin" | "agency" | "internal">("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  // Origin filter for agency users: all | admin (admin pool) | mine (my agency)
  const [originFilter, setOriginFilter] = useState<"all" | "admin" | "mine">("all");

  // Hide candidates whose owning agency has been deactivated. Includes BOTH
  // external supply partners and internal team agencies so admins see every
  // active candidate regardless of which kind of agency owns them.
  const activeAgencyIds = useMemo(
    () => new Set(allAgencies.filter((a) => !a.is_deleted).map((a) => a.id)),
    [allAgencies]
  );
  const candidates = useMemo(() => {
    const dropDeactivated = (c: Candidate) =>
      c.agency_id == null || activeAgencyIds.has(c.agency_id);
    if (!isAdmin) {
      // Agency users see ONLY candidates their own agency created.
      return adminCandidates; // useCandidates already scopes to agency_id for non-admins
    }
    if (tab === "all") return combinedPool.filter(dropDeactivated);
    if (tab === "admin") return adminCandidates;
    const base = agencyCandidates.filter(dropDeactivated);
    if (agencyFilter === "all") return base;
    return base.filter((c) => c.agency_id === agencyFilter);
  }, [isAdmin, tab, agencyFilter, adminCandidates, agencyCandidates, combinedPool, activeAgencyIds]);

  const loading = isAdmin
    ? tab === "all"
      ? combinedLoading
      : tab === "admin"
        ? adminLoading
        : tab === "internal"
          ? ipLoading
          : agencyLoading
    : adminLoading;

  const [ipSearch, setIpSearch] = useState("");
  const filteredPartners = useMemo(() => {
    const term = ipSearch.trim().toLowerCase();
    return internalPartners.filter((p) =>
      !term ||
      p.name.toLowerCase().includes(term) ||
      (p.phone ?? "").toLowerCase().includes(term) ||
      (p.employee_id ?? "").toLowerCase().includes(term)
    );
  }, [internalPartners, ipSearch]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [availFilter, setAvailFilter] = useState<string>(initialAvail);
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [bikeFilter, setBikeFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [pincodeFilter, setPincodeFilter] = useState<string>("all");
  const [qualFilter, setQualFilter] = useState<string>("all");
  const [blocklistFilter, setBlocklistFilter] = useState(false);
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
  const states = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.state).filter(Boolean))).sort() as string[],
    [candidates]
  );
  const districts = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.district).filter(Boolean))).sort() as string[],
    [candidates]
  );
  const pincodes = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.pincode).filter(Boolean))).sort() as string[],
    [candidates]
  );
  const qualifications = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.qualification).filter(Boolean))).sort() as string[],
    [candidates]
  );

  const blocklistedCount = useMemo(
    () => candidates.filter((c) => !!c.is_blocklisted).length,
    [candidates]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (blocklistFilter && !c.is_blocklisted) return false;
      if (
        term &&
        !c.name.toLowerCase().includes(term) &&
        !c.phone.toLowerCase().includes(term) &&
        !(c.kisfs_id?.toLowerCase().includes(term))
      ) {
        return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (bikeFilter === "yes" && !c.has_bike) return false;
      if (bikeFilter === "no" && c.has_bike) return false;
      if (genderFilter !== "all" && c.gender !== genderFilter) return false;
      if (stateFilter !== "all" && c.state !== stateFilter) return false;
      if (districtFilter !== "all" && c.district !== districtFilter) return false;
      if (pincodeFilter !== "all" && c.pincode !== pincodeFilter) return false;
      if (qualFilter !== "all" && c.qualification !== qualFilter) return false;

      const hasAadhar = !!c.aadhar_number;
      const hasPan = !!c.pan_number;
      if (kycFilter === "fully_verified" && (!hasAadhar || !hasPan)) return false;
      if (kycFilter === "aadhar_only" && (!hasAadhar || hasPan)) return false;
      if (kycFilter === "pan_only" && (hasAadhar || !hasPan)) return false;
      if (kycFilter === "kyc_pending" && (hasAadhar || hasPan)) return false;

      if (availFilter !== "all") {
        const isAvail = !activeAssignedIds.has(c.id);
        if (availFilter === "available" && !isAvail) return false;
        if (availFilter === "assigned" && isAvail) return false;
      }
      return true;
    });
  }, [candidates, search, statusFilter, sourceFilter, bikeFilter, genderFilter, stateFilter, districtFilter, pincodeFilter, qualFilter, kycFilter, availFilter, blocklistFilter, activeAssignedIds]);

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
    (availFilter !== "all" ? 1 : 0) +
    (kycFilter !== "all" ? 1 : 0) +
    (bikeFilter !== "all" ? 1 : 0) +
    (genderFilter !== "all" ? 1 : 0) +
    (stateFilter !== "all" ? 1 : 0) +
    (districtFilter !== "all" ? 1 : 0) +
    (pincodeFilter !== "all" ? 1 : 0) +
    (qualFilter !== "all" ? 1 : 0) +
    (blocklistFilter ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setSourceFilter("all");
    setAvailFilter("all");
    setKycFilter("all");
    setBikeFilter("all");
    setGenderFilter("all");
    setStateFilter("all");
    setDistrictFilter("all");
    setPincodeFilter("all");
    setQualFilter("all");
    setBlocklistFilter(false);
    setPage(1);
  }

  const showAddButton = !isAdmin || tab === "admin" || tab === "all";
  const agencyMap = useMemo(
    () => new Map(allAgencies.map((a) => [a.id, a])),
    [allAgencies]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Manage your candidate database, statuses, and availability."
        actions={
          <div className="flex items-center gap-2">
            {showAddButton && (
              <Button onClick={openAdd} variant="premium">
                <Plus className="h-4 w-4" /> Add candidate
              </Button>
            )}
          </div>
        }
      />

      {isAdmin && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "admin" | "agency" | "internal")}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex h-auto gap-1 p-1">
              <TabsTrigger value="all" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5 whitespace-normal sm:whitespace-nowrap leading-tight">
                <span className="sm:hidden">All</span>
                <span className="hidden sm:inline">All Candidates</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5 whitespace-normal sm:whitespace-nowrap leading-tight">
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">Admin Candidates</span>
              </TabsTrigger>
              <TabsTrigger value="agency" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5 whitespace-normal sm:whitespace-nowrap leading-tight">
                <span className="sm:hidden">Partners</span>
                <span className="hidden sm:inline">Supply Partner Candidates</span>
              </TabsTrigger>
              <TabsTrigger value="internal" className="text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5 whitespace-normal sm:whitespace-nowrap leading-tight">
                <span className="sm:hidden">Internal</span>
                <span className="hidden sm:inline">Internal Team</span>
              </TabsTrigger>
            </TabsList>
            {tab === "agency" && (
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="Filter by supply partner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All supply partners</SelectItem>
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
          <TabsContent value="all" />
          <TabsContent value="admin" />
          <TabsContent value="agency" />
          <TabsContent value="internal" />
        </Tabs>
      )}


      {/* Internal Team tab content */}
      {tab === "internal" && (
        <Card className="glass-card hover-lift overflow-hidden">
          <div className="p-4 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Search by name, phone or employee ID…"
                  className="pl-9"
                  value={ipSearch}
                  onChange={(e) => setIpSearch(e.target.value)}
                />
              </div>
              <Link
                to="/internal-partners"
                className="text-xs text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all shrink-0"
              >
                Manage members <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden">
            {ipLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground py-16 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted grid place-items-center">
                  <UserCog className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">No internal team members found</p>
              </div>
            ) : (
              <ul className="p-3 space-y-3">
                {filteredPartners.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary-soft text-secondary grid place-items-center text-xs font-semibold shrink-0">
                        {initials(p.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.position}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{p.phone}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">{p.employee_id}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="font-semibold text-foreground">Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Employee ID</TableHead>
                  <TableHead className="font-semibold text-foreground">Position</TableHead>
                  <TableHead className="font-semibold text-foreground">Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPartners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <div className="h-12 w-12 rounded-full bg-muted grid place-items-center">
                          <UserCog className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium">No internal team members found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPartners.map((p, idx) => (
                    <TableRow
                      key={p.id}
                      className={cn(
                        "border-b border-border/60",
                        idx % 2 === 1 && "bg-muted/20",
                        "hover:bg-primary-soft/40"
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-secondary-soft text-secondary grid place-items-center text-xs font-semibold shadow-sm shrink-0">
                            {initials(p.name)}
                          </div>
                          <p className="font-medium text-sm">{p.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                          {p.employee_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.position}</TableCell>
                      <TableCell className="text-sm tabular-nums">{p.phone}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t border-border/60 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredPartners.length}</span> internal team member{filteredPartners.length !== 1 ? "s" : ""}
            </p>
          </div>
        </Card>
      )}

      {tab !== "internal" && (
      <Card className="glass-card hover-lift overflow-hidden">
        <div className="p-4 border-b border-border/60 space-y-3">
          <div className="flex flex-col xl:flex-row xl:items-start gap-3">
            <div className="relative flex-1 min-w-[240px] xl:max-w-sm group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search by name, phone or KISFS ID…"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-1 gap-2 sm:flex-wrap sm:items-center">
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
                value={kycFilter}
                onValueChange={(v) => {
                  setKycFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
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
              <Select
                value={bikeFilter}
                onValueChange={(v) => {
                  setBikeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Bike" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Bike)</SelectItem>
                  <SelectItem value="yes">Has Bike</SelectItem>
                  <SelectItem value="no">No Bike</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={genderFilter}
                onValueChange={(v) => {
                  setGenderFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {states.length > 0 && (
                <Select
                  value={stateFilter}
                  onValueChange={(v) => {
                    setStateFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {states.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {districts.length > 0 && (
                <Select
                  value={districtFilter}
                  onValueChange={(v) => {
                    setDistrictFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="District" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {pincodes.length > 0 && (
                <Select
                  value={pincodeFilter}
                  onValueChange={(v) => {
                    setPincodeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Pincode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pincodes</SelectItem>
                    {pincodes.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {qualifications.length > 0 && (
                <Select
                  value={qualFilter}
                  onValueChange={(v) => {
                    setQualFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Qualifications</SelectItem>
                    {qualifications.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <button
                onClick={() => { setBlocklistFilter((v) => !v); setPage(1); }}
                className={cn(
                  "inline-flex items-center gap-1.5 h-10 px-3 rounded-md border text-sm font-medium transition-colors shrink-0",
                  blocklistFilter
                    ? "bg-destructive/10 border-destructive/40 text-destructive"
                    : "border-input bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <ShieldBan className="h-4 w-4" />
                Blocklisted
                {blocklistedCount > 0 && (
                  <span className={cn(
                    "ml-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold grid place-items-center px-1",
                    blocklistFilter ? "bg-destructive text-white" : "bg-destructive/15 text-destructive"
                  )}>
                    {blocklistedCount}
                  </span>
                )}
              </button>
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
              {bikeFilter !== "all" && (
                <button
                  onClick={() => { setBikeFilter("all"); setPage(1); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {bikeFilter === "yes" ? "Has Bike" : "No Bike"} <X className="h-3 w-3" />
                </button>
              )}
              {genderFilter !== "all" && (
                <button
                  onClick={() => { setGenderFilter("all"); setPage(1); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                >
                  {genderFilter} <X className="h-3 w-3" />
                </button>
              )}
              {stateFilter !== "all" && (
                <button
                  onClick={() => { setStateFilter("all"); setPage(1); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                >
                  State: {stateFilter} <X className="h-3 w-3" />
                </button>
              )}
              {districtFilter !== "all" && (
                <button
                  onClick={() => { setDistrictFilter("all"); setPage(1); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                >
                  District: {districtFilter} <X className="h-3 w-3" />
                </button>
              )}
              {pincodeFilter !== "all" && (
                <button
                  onClick={() => { setPincodeFilter("all"); setPage(1); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                >
                  Pincode: {pincodeFilter} <X className="h-3 w-3" />
                </button>
              )}
              {qualFilter !== "all" && (
                <button
                  onClick={() => { setQualFilter("all"); setPage(1); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
                >
                  Qual: {qualFilter} <X className="h-3 w-3" />
                </button>
              )}
              {blocklistFilter && (
                <button
                  onClick={() => { setBlocklistFilter(false); setPage(1); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <ShieldBan className="h-3 w-3" /> Blocklisted <X className="h-3 w-3" />
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
                          {c.kisfs_id && (
                            <p className="text-[10px] font-mono font-semibold text-primary/70 tracking-wider">{c.kisfs_id}</p>
                          )}
                          <p className="text-xs text-muted-foreground tabular-nums break-all">{c.phone}</p>
                          <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="break-words">{c.area_name ? `${c.area_name}, ${c.district}, ${c.state}` : c.location}</span>
                          </p>
                          {(c.aadhar_number || c.pan_number) && (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground">
                              {c.aadhar_number && <span className="tabular-nums">AAD: {c.aadhar_number}</span>}
                              {c.pan_number && <span className="tracking-wider">PAN: {c.pan_number}</span>}
                            </div>
                          )}
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
                            {(isAdmin || (c.agency_id === agencyId && canEditCandidates)) && (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(c)}>
                                  <Edit className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={c.is_blocklisted ? "text-primary focus:text-primary" : "text-destructive focus:text-destructive"}
                                  onClick={() => c.is_blocklisted ? unblocklistCandidate(c.id) : blocklistCandidate(c.id)}
                                >
                                  <ShieldBan className="h-4 w-4 mr-2" />
                                  {c.is_blocklisted ? "Remove blocklist" : "Blocklist"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleting(c)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
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
                      {(() => {
                        const hasAadhar = !!c.aadhar_number;
                        const hasPan = !!c.pan_number;
                        if (hasAadhar && hasPan) return <Badge variant="outline" className="font-semibold px-2 py-0.5 text-[11px] border-green-500/40 text-green-600 bg-green-500/10 dark:text-green-400">KYC Verified</Badge>;
                        if (hasAadhar || hasPan) return <Badge variant="outline" className="font-semibold px-2 py-0.5 text-[11px] border-yellow-500/40 text-yellow-600 bg-yellow-500/10 dark:text-yellow-400">Partial KYC</Badge>;
                        return <Badge variant="outline" className="font-semibold px-2 py-0.5 text-[11px] border-red-500/40 text-red-600 bg-red-500/10 dark:text-red-400">KYC Pending</Badge>;
                      })()}
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
                      {c.is_blocklisted && (
                        <Badge variant="outline" className="text-[11px] border-destructive/50 text-destructive bg-destructive/10 font-semibold gap-1">
                          <ShieldBan className="h-2.5 w-2.5" /> Blocklisted
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[11px] border-border text-muted-foreground inline-flex items-center gap-1 max-w-[160px]">
                        {c.source === "Internal Team"
                          ? <UserCog className="h-2.5 w-2.5 shrink-0" />
                          : <Building2 className="h-2.5 w-2.5 shrink-0" />}
                        <span className="truncate">{c.source_member_name || c.source}</span>
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
                <TableHead className="font-semibold text-foreground">KYC</TableHead>
                <TableHead className="font-semibold text-foreground">Availability</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-sm group-hover/link:text-primary transition-colors">
                                {c.name}
                              </p>
                              <OriginBadge agencyId={c.agency_id} agencyName={c.agency_id ? agencyMap.get(c.agency_id)?.name : null} />
                            </div>
                            {c.kisfs_id && (
                              <p className="text-[10px] font-mono font-semibold text-primary/70 tracking-wider">{c.kisfs_id}</p>
                            )}
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
                          <MapPin className="h-3 w-3" /> {c.area_name ? `${c.area_name}, ${c.district}, ${c.state}` : c.location}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {c.source === "Internal Team"
                            ? <UserCog className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            : <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{c.source_member_name || c.source}</p>
                            {c.source_member_name && (
                              <p className="text-xs text-muted-foreground truncate">{c.source}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
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
                        <div className="flex flex-col items-start gap-1">
                          {(() => {
                            const hasAadhar = !!c.aadhar_number;
                            const hasPan = !!c.pan_number;
                            if (hasAadhar && hasPan) return <Badge variant="outline" className="font-semibold px-2.5 py-0.5 text-xs border-green-500/40 text-green-600 bg-green-500/10 dark:text-green-400">KYC Verified</Badge>;
                            if (hasAadhar || hasPan) return <Badge variant="outline" className="font-semibold px-2.5 py-0.5 text-xs border-yellow-500/40 text-yellow-600 bg-yellow-500/10 dark:text-yellow-400">Partial KYC</Badge>;
                            return <Badge variant="outline" className="font-semibold px-2.5 py-0.5 text-xs border-red-500/40 text-red-600 bg-red-500/10 dark:text-red-400">KYC Pending</Badge>;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
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
                          {c.is_blocklisted && (
                            <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10 font-semibold gap-1 text-[10px]">
                              <ShieldBan className="h-2.5 w-2.5" /> Blocklisted
                            </Badge>
                          )}
                        </div>
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
                              {(isAdmin || (c.agency_id === agencyId && canEditCandidates)) && (
                                <>
                                  <DropdownMenuItem onClick={() => openEdit(c)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className={c.is_blocklisted ? "text-primary focus:text-primary" : "text-destructive focus:text-destructive"}
                                    onClick={() => c.is_blocklisted ? unblocklistCandidate(c.id) : blocklistCandidate(c.id)}
                                  >
                                    <ShieldBan className="h-4 w-4 mr-2" />
                                    {c.is_blocklisted ? "Remove blocklist" : "Blocklist"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleting(c)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
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
      )} {/* end tab !== "internal" */}

      <CandidateFormModal open={modalOpen} onOpenChange={setModalOpen} candidate={editing} />

      {/* Reset test data confirmation */}

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

function OriginBadge({
  agencyId,
  agencyName,
}: {
  agencyId: string | null | undefined;
  agencyName?: string | null;
}) {
  if (agencyId == null) {
    return (
      <Badge
        variant="outline"
        className="border-primary/40 text-primary bg-primary-soft/50 text-[10px] gap-1 px-1.5 py-0 font-medium"
      >
        <ShieldCheck className="h-2.5 w-2.5" /> Admin
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-secondary/40 text-secondary bg-secondary-soft/50 text-[10px] gap-1 px-1.5 py-0 font-medium max-w-[10rem] truncate"
    >
      <Building2 className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{agencyName || "Supply Partner"}</span>
    </Badge>
  );
}
