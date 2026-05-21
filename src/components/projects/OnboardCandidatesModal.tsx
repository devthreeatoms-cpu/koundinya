import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { useCombinedCandidatePool, useAllCandidates } from "@/hooks/useCandidates";
import { useAssignments } from "@/hooks/useAssignments";
import { addCandidatesToOnboarding } from "@/hooks/useOnboardingCandidates";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectAgencyId?: string | null;
  alreadyOnboardedIds: Set<string>;
}

export default function OnboardCandidatesModal({ open, onOpenChange, projectId, projectAgencyId, alreadyOnboardedIds }: Props) {
  const { user, isAdmin, agencyId } = useAuth();
  const { candidates: combined } = useCombinedCandidatePool();
  const { candidates: allRaw } = useAllCandidates({ bypassOwnerFilter: true });
  const { assignments } = useAssignments({ bypassOwnerFilter: true });
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

  const baseCandidates = useMemo(() => {
    // keep behavior consistent with assign flow (admins see full pool)
    const source = allRaw.length > 0 ? allRaw : combined;
    return source.filter((c) => !c.is_deleted);
  }, [allRaw, combined]);

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return baseCandidates
      .filter((c) => !activeAssignedIds.has(c.id))
      .filter((c) => !alreadyOnboardedIds.has(c.id))
      .filter((c) => {
        if (!term) return true;
        return (
          c.name.toLowerCase().includes(term) ||
          (c.phone || "").toLowerCase().includes(term) ||
          (c.location || "").toLowerCase().includes(term)
        );
      });
  }, [baseCandidates, activeAssignedIds, alreadyOnboardedIds, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const writeAgencyId = isAdmin ? (projectAgencyId ?? null) : (agencyId ?? null);
      const inserted = await addCandidatesToOnboarding(projectId, Array.from(selected), {
        userId: user?.uid ?? null,
        agency_id: writeAgencyId,
      });
      if (inserted === 0) {
        toast({ title: "No new candidates onboarded", description: "Selected candidates may already be in onboarding." });
      } else {
        toast({ title: `${inserted} candidate${inserted > 1 ? "s" : ""} onboarded` });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 sm:p-6 border-b border-border">
          <DialogTitle>Onboard Candidate</DialogTitle>
          <DialogDescription>
            Select available candidates for onboarding. KYC is not required at this phase.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-6 pb-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No available candidates to onboard.</p>
          ) : (
            <ul className="space-y-1 pb-2">
              {available.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer", isSelected ? "bg-primary-soft border-primary/40" : "border-transparent hover:bg-muted/40")}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggle(c.id)} />
                      <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone} {c.location ? `• ${c.location}` : ""}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Onboard</Badge>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || selected.size === 0} variant="premium">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Onboard{selected.size ? ` ${selected.size}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
