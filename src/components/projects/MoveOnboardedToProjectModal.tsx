import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { Candidate, OnboardingCandidate } from "@/types";
import { getNextKisfsSuffix, moveOnboardedToProject, useTakenKisfsSet } from "@/hooks/useOnboardingCandidates";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  candidates: Candidate[];
  onboardingItems: OnboardingCandidate[];
}

export default function MoveOnboardedToProjectModal({
  open,
  onOpenChange,
  projectId,
  candidates,
  onboardingItems,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suffixMap, setSuffixMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const takenKisfs = useTakenKisfsSet(candidates);

  const candidateMap = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const readyItems = useMemo(
    () =>
      onboardingItems.filter(
        (o) =>
          o.status !== "MovedToProject" &&
          (o.onboarding_status || "").trim().toLowerCase() === "ready for project"
      ),
    [onboardingItems]
  );

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSuffixMap({});
      return;
    }
    const nextSuffix: Record<string, string> = {};
    let next = Number(getNextKisfsSuffix(candidates));
    const localUsed = new Set<number>();

    // Sort oldest first so that when new candidates are added to the list,
    // they get the higher IDs and don't steal the lower IDs from older candidates.
    const sortedReadyItems = [...readyItems].sort((a, b) => {
      const timeA = (a.created_at as any)?.toMillis?.() ?? 0;
      const timeB = (b.created_at as any)?.toMillis?.() ?? 0;
      return timeA - timeB;
    });

    sortedReadyItems.forEach((o) => {
      const c = candidateMap.get(o.candidate_id);
      if (!c) return;
      if (c.kisfs_id && /^KISFS\d{3,4}$/.test(c.kisfs_id)) {
        nextSuffix[c.id] = c.kisfs_id.slice(5);
        return;
      }
      while (takenKisfs.has(`KISFS${String(next).padStart(3, "0")}`) || localUsed.has(next)) next++;
      if (next > 9999) next = 170;
      nextSuffix[c.id] = String(next).padStart(3, "0");
      localUsed.add(next);
      next++;
    });
    setSuffixMap(nextSuffix);
  }, [open, readyItems, candidates, candidateMap, takenKisfs]);

  function toggle(onboardingId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(onboardingId)) next.delete(onboardingId);
      else next.add(onboardingId);
      return next;
    });
  }

  function setSuffix(candidateId: string, suffix: string) {
    const normalized = suffix.replace(/[^\d]/g, "").slice(0, 4);
    setSuffixMap((prev) => ({ ...prev, [candidateId]: normalized }));
  }

  async function handleSubmit() {
    if (selected.size === 0) return;
    const kisfsByCandidateId: Record<string, string> = {};
    const local = new Set<string>();
    for (const onboardingId of selected) {
      const o = readyItems.find((x) => x.id === onboardingId);
      if (!o) continue;
      const c = candidateMap.get(o.candidate_id);
      if (!c) continue;
      const raw = suffixMap[c.id] ?? "";
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 170 || parsed > 9999) {
        toast({ title: "Invalid KISFS", description: `${c.name}: suffix must be between 170 and 9999.`, variant: "destructive" });
        return;
      }
      const kisfs = `KISFS${String(parsed).padStart(3, "0")}`;
      if ((takenKisfs.has(kisfs) && c.kisfs_id !== kisfs) || local.has(kisfs)) {
        toast({ title: "Duplicate KISFS", description: `${kisfs} is already in use.`, variant: "destructive" });
        return;
      }
      local.add(kisfs);
      kisfsByCandidateId[c.id] = kisfs;
    }

    setSubmitting(true);
    try {
      await moveOnboardedToProject({
        projectId,
        onboardingIds: Array.from(selected),
        kisfsByCandidateId,
        userId: user?.uid ?? null,
      });
      toast({ title: "Candidates moved to project" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 sm:p-6 border-b border-border">
          <DialogTitle>Add Candidates to Project</DialogTitle>
          <DialogDescription>
            Only onboarding entries with status "Ready for Project" can be moved. Candidates must be fully KYC verified with bank details.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6">
          {readyItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No onboarding candidates are marked Ready for Project.</p>
          ) : (
            <ul className="space-y-2 py-3">
              {readyItems.map((o) => {
                const c = candidateMap.get(o.candidate_id);
                if (!c) return null;
                
                const hasAadhar = !!c.aadhar_number;
                const hasPan = !!c.pan_number;
                const aadharVerified = c.aadhar_verified !== false;
                const panVerified = c.pan_verified !== false;
                const hasBankDetails = !!c.bank_account_number && !!c.bank_ifsc;
                const fullyKyc = hasAadhar && hasPan && aadharVerified && panVerified && hasBankDetails;
                
                const checked = fullyKyc && selected.has(o.id);

                return (
                  <li key={o.id} className="border border-border/60 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={checked} 
                        onCheckedChange={() => toggle(o.id)} 
                        disabled={!fullyKyc} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                      {!fullyKyc && (
                        <Badge variant="destructive" className="text-[10px]">Incomplete KYC/Bank</Badge>
                      )}
                      <Badge variant="outline">Ready for Project</Badge>
                    </div>
                    <div className={cn("mt-2 flex items-center gap-2", !fullyKyc && "opacity-50 pointer-events-none")}>
                      <span className="text-xs text-muted-foreground">KISFS</span>
                      <Input
                        value={suffixMap[c.id] ?? ""}
                        onChange={(e) => setSuffix(c.id, e.target.value)}
                        className="w-28 h-8 text-xs"
                        placeholder="170"
                        disabled={!fullyKyc}
                      />
                      <span className="text-xs text-muted-foreground">Final: KISFS{(suffixMap[c.id] ?? "").padStart(3, "0")}</span>
                    </div>
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
            Add to Project{selected.size ? ` ${selected.size}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
