import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2 } from "lucide-react";
import { useCandidates } from "@/hooks/useCandidates";
import { useAssignments, assignCandidates } from "@/hooks/useAssignments";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export default function AssignCandidatesModal({ open, onOpenChange, projectId }: Props) {
  const { candidates } = useCandidates();
  const { assignments } = useAssignments();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const activeAssignedIds = useMemo(
    () => new Set(assignments.filter((a) => a.status === "Active").map((a) => a.candidate_id)),
    [assignments]
  );

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidates
      .filter((c) => !activeAssignedIds.has(c.id))
      .filter((c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.location.toLowerCase().includes(term)
      );
  }, [candidates, activeAssignedIds, search]);

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
      await assignCandidates(projectId, Array.from(selected));
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign candidates</DialogTitle>
          <DialogDescription>
            Only available candidates (no active assignment) are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, location…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="h-72 rounded-lg border border-border">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No available candidates match your search.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {available.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggle(c.id)}
                    id={`cand-${c.id}`}
                  />
                  <label htmlFor={`cand-${c.id}`} className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone} • {c.location}</p>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selected.size} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={submitting || selected.size === 0}
              onClick={handleAssign}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
