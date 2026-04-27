import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2, MoreVertical, Bike, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCandidates, softDeleteCandidate } from "@/hooks/useCandidates";
import { useAssignments } from "@/hooks/useAssignments";
import CandidateFormModal from "@/components/candidates/CandidateFormModal";
import type { Candidate, CandidateStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { initials } from "@/lib/utils-format";

const PAGE_SIZE = 10;
const STATUSES: (CandidateStatus | "all")[] = ["all", "New", "Contacted", "Assigned", "Rejected"];

const statusStyles: Record<CandidateStatus, string> = {
  New: "bg-secondary-soft text-secondary border-0",
  Contacted: "bg-accent/10 text-accent border-0",
  Assigned: "bg-primary text-primary-foreground border-0",
  Rejected: "bg-destructive/10 text-destructive border-0",
};

export default function CandidatesPage() {
  const { candidates, loading } = useCandidates();
  const { assignments } = useAssignments();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [availFilter, setAvailFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

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

  function openAdd() { setEditing(null); setModalOpen(true); }
  function openEdit(c: Candidate) { setEditing(c); setModalOpen(true); }

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

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Manage your candidate database, statuses, and availability."
        actions={
          <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-brand">
            <Plus className="h-4 w-4 mr-1.5" /> Add candidate
          </Button>
        }
      />

      <Card className="p-4 shadow-card">
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone…"
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={availFilter} onValueChange={(v) => { setAvailFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Availability" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Candidate</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No candidates found.</TableCell></TableRow>
              ) : paginated.map((c) => {
                const isAvail = !activeAssignedIds.has(c.id);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 group">
                        <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold">
                          {initials(c.name)}
                        </div>
                        <div>
                          <p className="font-medium text-sm group-hover:text-primary">{c.name}</p>
                          {c.has_bike && (
                            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                              <Bike className="h-3 w-3" /> Has bike
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {c.location}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{c.source}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[c.status]}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={isAvail ? "border-primary/40 text-primary" : "border-muted-foreground/30 text-muted-foreground"}>
                        {isAvail ? "Available" : "Assigned"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(c)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Showing {paginated.length} of {filtered.length} candidates
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {safePage} of {pageCount}</span>
            <Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      <CandidateFormModal open={modalOpen} onOpenChange={setModalOpen} candidate={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} will be soft-deleted and hidden from lists. This can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
