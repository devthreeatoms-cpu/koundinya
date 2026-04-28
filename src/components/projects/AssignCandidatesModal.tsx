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
import { Search, Loader2, X, Sparkles, MapPin, Bike, Building2, ShieldCheck } from "lucide-react";
import { useCombinedCandidatePool, useAllCandidates } from "@/hooks/useCandidates";
import { useAssignments, assignCandidates } from "@/hooks/useAssignments";
import { useAgencies } from "@/hooks/useAgencies";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/utils-format";
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
  const { isAdmin, agencyId } = useAuth();
  // Admin assigning into an agency project still needs the cross-agency bypass
  // for the candidate list AND the active-assignment lookup.
  const adminCrossAgency = isAdmin && !!projectAgencyId;
  const ownerAgencyForAssign = adminCrossAgency ? projectAgencyId! : agencyId;

  // Candidate pool:
  //  - Agency users: admin pool (agency_id == null) + their own agency.
  //  - Admin (own project): admin pool only (combined hook returns all for admin, so filter).
  //  - Admin cross-agency project: admin pool + that agency's candidates.
  const { candidates: combined } = useCombinedCandidatePool();
  const { candidates: allRaw } = useAllCandidates({ bypassOwnerFilter: adminCrossAgency });

  const candidates = useMemo(() => {
    if (!isAdmin) return combined; // already admin-pool + own-agency
    if (adminCrossAgency) {
      return allRaw.filter(
        (c) => !c.is_deleted && (c.agency_id == null || c.agency_id === projectAgencyId)
      );
    }
    // Admin assigning into own (admin-owned) project: only admin pool.
    return combined.filter((c) => c.agency_id == null);
  }, [isAdmin, adminCrossAgency, combined, allRaw, projectAgencyId]);

  // Active-assignment exclusion must consider ALL active assignments for the
  // candidates we're showing — bypass owner filter so a candidate booked by
  // admin doesn't appear "Available" to an agency user.
  const { assignments } = useAssignments({ bypassOwnerFilter: true });
  const { agencies } = useAgencies({ includeDeleted: true });
  const agencyNameMap = useMemo(
    () => new Map(agencies.map((a) => [a.id, a.name])),
    [agencies]
  );
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(new Set());
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
      .filter(
        (c) =>
          !term ||
          c.name.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term) ||
          c.location.toLowerCase().includes(term)
      );
  }, [candidates, activeAssignedIds, search]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
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

        <div className="p-4 sm:p-6 pb-3 space-y-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search by name, phone, location…"
              className="pl-9 h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {selectedCandidates.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap p-2 rounded-lg bg-primary-soft/60 border border-primary/20">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Selected ({selectedCandidates.length})
              </span>
              {selectedCandidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-white border border-primary/30 text-foreground hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors group/chip"
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

        <ScrollArea className="h-80 px-6">
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
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
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

        <DialogFooter className="flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 pt-4 border-t border-border bg-muted/20">
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
      </DialogContent>
    </Dialog>
  );
}
