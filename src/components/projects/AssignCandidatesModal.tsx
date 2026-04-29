import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, X, Sparkles, MapPin, Bike, Building2, ShieldCheck, Briefcase } from "lucide-react";
import { useCombinedCandidatePool, useAllCandidates } from "@/hooks/useCandidates";
import { useAssignments, assignCandidates } from "@/hooks/useAssignments";
import { useAgencies } from "@/hooks/useAgencies";
import { useProjectById, updateProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/utils-format";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /**
   * The agency_id of the project being assigned to. When provided and the
   * current user is an admin viewing an agency-owned project, candidates and
   * active-assignment checks are scoped to that agency instead of the
   * admin's own (agency_id == null) data.
   */
  projectAgencyId?: string | null;
}

export default function AssignCandidatesModal({ open, onOpenChange, projectId, projectAgencyId }: Props) {
  const { project } = useProjectById(projectId);
  const { isAdmin, agencyId } = useAuth();
  // Admin assigning into an agency project still needs the cross-agency bypass
  // for the candidate list AND the active-assignment lookup.
  const adminCrossAgency = isAdmin && !!projectAgencyId;
  const ownerAgencyForAssign = adminCrossAgency ? projectAgencyId! : agencyId;

  // Candidate pool: always show the full active platform pool so admins and
  // agencies can pick from admin candidates AND every (active) agency's
  // candidates when assigning. Soft-deleted candidates and candidates whose
  // owning agency is deactivated are filtered out.
  const { candidates: combined } = useCombinedCandidatePool();
  const { candidates: allRaw } = useAllCandidates({ bypassOwnerFilter: isAdmin });
  const { agencies } = useAgencies({ includeDeleted: true });
  const activeAgencyIds = useMemo(
    () => new Set(agencies.filter((a) => !a.is_deleted).map((a) => a.id)),
    [agencies]
  );
  const agencyNameMap = useMemo(
    () => new Map(agencies.map((a) => [a.id, a.name])),
    [agencies]
  );

  const candidates = useMemo(() => {
    // Admin: full platform pool (admin-owned + every agency).
    // Agency: admin-owned + their own agency (already enforced by combined hook).
    const base = isAdmin ? allRaw : combined;
    return base.filter((c) => {
      if (c.is_deleted) return false;
      // Hide candidates whose owning agency has been deactivated.
      if (c.agency_id != null && !activeAgencyIds.has(c.agency_id)) return false;
      return true;
    });
  }, [isAdmin, allRaw, combined, activeAgencyIds]);

  // Active-assignment exclusion must consider ALL active assignments for the
  // candidates we're showing — bypass owner filter so a candidate booked by
  // admin doesn't appear "Available" to an agency user.
  const { assignments } = useAssignments({ bypassOwnerFilter: true });
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(new Set());
      setKycFilter("all");
    }
  }, [open]);

  const activeAssignedIds = useMemo(
    () => new Set(assignments.filter((a) => a.status === "Active").map((a) => a.candidate_id)),
    [assignments]
  );

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidates
      .filter((c) => !activeAssignedIds.has(c.id))
      .filter((c) => {
        if (term && 
            !c.name.toLowerCase().includes(term) && 
            !c.phone.toLowerCase().includes(term) && 
            !c.location.toLowerCase().includes(term)) {
          return false;
        }

        const hasAadhar = !!c.aadhar_number;
        const hasPan = !!c.pan_number;
        if (kycFilter === "fully_verified" && (!hasAadhar || !hasPan)) return false;
        if (kycFilter === "partial" && ((hasAadhar && hasPan) || (!hasAadhar && !hasPan))) return false;
        if (kycFilter === "kyc_pending" && (hasAadhar || hasPan)) return false;

        return true;
      });
  }, [candidates, activeAssignedIds, search, kycFilter]);

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => selected.has(c.id)),
    [candidates, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (selected.size === 0) return;
    setSubmitting(true);
    
    // KYC Checks
    for (const cId of selected) {
      const c = candidates.find(cand => cand.id === cId);
      if (!c) continue;
      const hasAadhar = !!c.aadhar_number;
      const hasPan = !!c.pan_number;
      
      if (!hasAadhar && !hasPan) {
        toast({ 
          title: "KYC Blocked", 
          description: `Candidate ${c.name} has pending KYC. Please provide Aadhar and PAN.`, 
          variant: "destructive",
          action: (
            <ToastAction altText="Remove candidate" onClick={() => toggle(c.id)}>
              Remove
            </ToastAction>
          )
        });
        setSubmitting(false);
        return;
      } else if (hasAadhar && !hasPan) {
        toast({ 
          title: "KYC Blocked", 
          description: `Candidate ${c.name} has incomplete KYC. Please provide PAN.`, 
          variant: "destructive",
          action: (
            <ToastAction altText="Remove candidate" onClick={() => toggle(c.id)}>
              Remove
            </ToastAction>
          )
        });
        setSubmitting(false);
        return;
      } else if (!hasAadhar && hasPan) {
        toast({ 
          title: "KYC Blocked", 
          description: `Candidate ${c.name} has incomplete KYC. Please provide Aadhar.`, 
          variant: "destructive",
          action: (
            <ToastAction altText="Remove candidate" onClick={() => toggle(c.id)}>
              Remove
            </ToastAction>
          )
        });
        setSubmitting(false);
        return;
      }
    }

    try {
      await assignCandidates(projectId, Array.from(selected), {
        agency_id: ownerAgencyForAssign,
      });
      toast({ title: `${selected.size} candidate${selected.size > 1 ? "s" : ""} assigned` });
      setSelected(new Set());
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivateProject() {
    try {
      await updateProject(projectId, { status: "Active" });
      toast({ title: "Project Activated", description: "The project is now active." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border bg-gradient-soft">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-brand">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">Assign candidates</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Showing the combined pool — admin candidates and agency candidates. Only those with no active assignment are listed.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {project?.status === "Completed" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-muted/10">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 grid place-items-center text-muted-foreground border border-border/40 shadow-sm">
              <Briefcase className="h-8 w-8" />
            </div>
            <div className="max-w-md space-y-2">
              <p className="text-lg font-semibold text-foreground">Project is Completed</p>
              <p className="text-sm text-muted-foreground px-4">
                This project is currently in a completed state. You must reactivate the project before you can assign candidates.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleActivateProject} variant="premium">
                Activate Project
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-6 pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search by name, phone, location…"
                className="pl-9 h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-11">
                <SelectValue placeholder="KYC Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Candidates</SelectItem>
                <SelectItem value="fully_verified">Fully Verified</SelectItem>
                <SelectItem value="partial">Partial KYC</SelectItem>
                <SelectItem value="kyc_pending">KYC Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedCandidates.length > 0 && (
            <div className="max-h-24 overflow-y-auto flex items-center gap-2 flex-wrap p-2 rounded-lg bg-primary-soft/60 border border-primary/20">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary sticky top-0 bg-primary-soft/60 py-0.5">
                Selected ({selectedCandidates.length})
              </span>
              {selectedCandidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors group/chip"
                >
                  <div className="h-4 w-4 rounded-full bg-gradient-brand text-white grid place-items-center text-[8px] font-semibold">
                    {initials(c.name)}
                  </div>
                  {c.name}
                  <X className="h-3 w-3 opacity-60 group-hover/chip:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-6">
          {available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No available candidates</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search.
              </p>
            </div>
          ) : (
            <ul className="space-y-1 pb-2">
              {available.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label
                      htmlFor={`cand-${c.id}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border",
                        isSelected
                          ? "bg-primary-soft border-primary/40 shadow-sm"
                          : "border-transparent hover:bg-muted/50 hover:border-border"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(c.id)}
                        id={`cand-${c.id}`}
                      />
                      <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          {c.agency_id == null ? (
                            <Badge
                              variant="outline"
                              className="border-primary/40 text-primary bg-primary-soft/50 text-[10px] gap-1 px-1.5 py-0"
                            >
                              <ShieldCheck className="h-2.5 w-2.5" /> Admin
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-secondary/40 text-secondary bg-secondary-soft/50 text-[10px] gap-1 px-1.5 py-0"
                            >
                              <Building2 className="h-2.5 w-2.5" />
                              {agencyNameMap.get(c.agency_id) ?? "Agency"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-2 mt-0.5">
                          <span>{c.phone}</span>
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" /> {c.location}
                          </span>
                          {c.has_bike && (
                            <span className="inline-flex items-center gap-0.5">
                              <Bike className="h-3 w-3" /> Bike
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary bg-white text-[10px]"
                      >
                        Available
                      </Badge>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 pt-4 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            <span className="font-semibold text-foreground tabular-nums">{selected.size}</span> of{" "}
            <span className="tabular-nums">{available.length}</span> selected
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              variant="premium"
              disabled={submitting || selected.size === 0}
              onClick={handleAssign}
              className="flex-1 sm:flex-none"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign{selected.size > 0 ? ` ${selected.size}` : ""}
            </Button>
          </div>
        </DialogFooter>
      </>
    )}
      </DialogContent>
    </Dialog>
  );
}
