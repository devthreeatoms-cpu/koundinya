import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Briefcase, Edit, Plus, UserMinus, Users, Eye, Loader2, Search, Save, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useProjectById } from "@/hooks/useProjects";
import { deleteProject } from "@/hooks/useProjects";
import { useAllCandidates } from "@/hooks/useCandidates";
import { useAssignments, removeAssignment, updateAssignmentProjectStatus } from "@/hooks/useAssignments";
import { useOnboardingCandidates, updateOnboardingEntry, resetOnboardingAfterProjectRemoval, deleteOnboardingEntry } from "@/hooks/useOnboardingCandidates";
import { useAgencies } from "@/hooks/useAgencies";
import { useAuth } from "@/context/AuthContext";
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
import type { OnboardingCandidate } from "@/types";
import ProjectFormModal from "@/components/projects/ProjectFormModal";
import OnboardCandidatesModal from "@/components/projects/OnboardCandidatesModal";
import MoveOnboardedToProjectModal from "@/components/projects/MoveOnboardedToProjectModal";
import { formatDate, initials } from "@/lib/utils-format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Building2, Shield } from "lucide-react";

/** Small badge showing whether a candidate is owned by Admin or a specific agency. */
function OwnerBadge({
  agencyId,
  agencyName,
}: {
  agencyId?: string | null;
  agencyName?: string | null;
}) {
  if (!agencyId) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] uppercase tracking-wide border-primary/30 text-primary bg-primary-soft inline-flex items-center gap-1"
      >
        <Shield className="h-2.5 w-2.5" /> Admin
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] uppercase tracking-wide border-secondary/40 text-secondary bg-secondary/10 inline-flex items-center gap-1 max-w-[140px]"
    >
      <Building2 className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{agencyName || "Supply Partner"}</span>
    </Badge>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isInternal } = useAuth();
  // Admins and internal team members can remove candidates from a project.
  const canManageProject = isAdmin || isInternal;
  const navigate = useNavigate();
  const { project, loading: pLoading } = useProjectById(id);
  // Project detail is already scoped by project_id, and the project doc itself
  // is access-checked above. Always bypass the owner filter here so EVERY
  // assignment + candidate on this project renders correctly — regardless of
  // whether the candidate sits in the admin pool or any agency pool.
  const { candidates: allCandidates } = useAllCandidates({ bypassOwnerFilter: true });
  const { assignments } = useAssignments({ project_id: id, bypassOwnerFilter: true });
  const { items: onboardingItems, loading: onboardingLoading, error: onboardingError } = useOnboardingCandidates(id);
  const { agencies } = useAgencies({ includeDeleted: true });
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [onboardingToRemove, setOnboardingToRemove] = useState<OnboardingCandidate | null>(null);
  const [removingOnboarding, setRemovingOnboarding] = useState(false);
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState<string>("all");

  // Use the full candidate list (incl. soft-deleted) so historical
  // assignments still show the candidate's name with a "(Deleted)" tag.
  const candidateMap = useMemo(() => new Map(allCandidates.map((c) => [c.id, c])), [allCandidates]);
  const agencyNameMap = useMemo(() => new Map(agencies.map((a) => [a.id, a.name])), [agencies]);

  const active = assignments.filter((a) => a.status === "Active");
  const past = assignments.filter((a) => a.status !== "Active");
  const activeCandidateIds = useMemo(
    () => new Set(active.map((a) => a.candidate_id)),
    [active]
  );
  const onboardedCandidateIds = useMemo(
    () => new Set(onboardingItems.map((o) => o.candidate_id)),
    [onboardingItems]
  );

  useEffect(() => {
    if (!id) return;
    const stale = onboardingItems.filter(
      (o) => o.status === "MovedToProject" && !activeCandidateIds.has(o.candidate_id)
    );
    if (stale.length === 0) return;

    void Promise.all(
      stale.map((o) =>
        resetOnboardingAfterProjectRemoval({
          projectId: id,
          candidateId: o.candidate_id,
          userId: user?.uid ?? null,
        })
      )
    );
  }, [id, onboardingItems, activeCandidateIds, user?.uid]);

  const [search, setSearch] = useState("");

  const filteredActive = useMemo(() => {
    return active.filter((a) => {
      const c = candidateMap.get(a.candidate_id);
      if (!c) return false;
      if (!search) return true;
      const term = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term) ||
        (c.location || "").toLowerCase().includes(term)
      );
    });
  }, [active, candidateMap, search]);

  const filteredPast = useMemo(() => {
    return past.filter((a) => {
      const c = candidateMap.get(a.candidate_id);
      if (!c) return false;
      if (!search) return true;
      const term = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term) ||
        (c.location || "").toLowerCase().includes(term)
      );
    });
  }, [past, candidateMap, search]);

  async function handleRemove(assignmentId: string, candidateId: string) {
    try {
      await removeAssignment(assignmentId, "Completed");
      if (id) {
        await resetOnboardingAfterProjectRemoval({
          projectId: id,
          candidateId,
          userId: user?.uid ?? null,
        });
      }
      toast({ title: "Candidate removed from project" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  async function handleRemoveOnboarding() {
    if (!onboardingToRemove || !id) return;
    setRemovingOnboarding(true);
    try {
      // If the candidate was already moved to the project, also end their
      // active assignment so they're fully removed from the project.
      if (onboardingToRemove.status === "MovedToProject") {
        const activeAssignment = assignments.find(
          (a) => a.candidate_id === onboardingToRemove.candidate_id && a.status === "Active"
        );
        if (activeAssignment) {
          await removeAssignment(activeAssignment.id, "Dropped");
        }
      }
      await deleteOnboardingEntry(onboardingToRemove.id);
      toast({ title: "Candidate removed from project" });
      setOnboardingToRemove(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setRemovingOnboarding(false);
    }
  }

  async function handleWorkflowStatus(assignmentId: string, value: string) {
    try {
      await updateAssignmentProjectStatus(assignmentId, value === "__none__" ? null : value);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  async function handleSaveOnboarding(id: string, currentStatus: string, currentNotes?: string | null) {
    const nextStatus = (statusDraft[id] ?? currentStatus ?? "").trim();
    const nextNotes = (currentNotes ?? "").trim();
    try {
      await updateOnboardingEntry(
        id,
        { onboarding_status: nextStatus, notes: nextNotes || null },
        { userId: user?.uid ?? null }
      );
      toast({ title: "Onboarding updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  async function handleMarkAsReady(id: string) {
    try {
      await updateOnboardingEntry(
        id,
        { onboarding_status: "Ready for Project" },
        { userId: user?.uid ?? null }
      );
      setStatusDraft((p) => ({ ...p, [id]: "Ready for Project" }));
      toast({ title: "Marked as ready" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  const hasCustomStatuses = (project?.custom_statuses?.length ?? 0) > 0;
  const hasOnboardingStatuses = (project?.onboarding_statuses?.length ?? 0) > 0;

  if (pLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link to="/projects" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
        </Link>
        <Card className="p-12 text-center"><p className="text-sm text-muted-foreground">Project not found.</p></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/projects" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
      </Link>

      <PageHeader
        title={project.name}
        description={project.client_name || "Internal project"}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button onClick={() => setOnboardOpen(true)} variant="premium">
              <Plus className="h-4 w-4" /> Onboard Candidate
            </Button>
            <Button onClick={() => setMoveOpen(true)} variant="outline">
              <Plus className="h-4 w-4" /> Add to Project
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </>
        }
      />

      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold inline-flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-secondary-soft text-secondary grid place-items-center">
              <Users className="h-3.5 w-3.5" />
            </div>
            Onboarding Candidates
          </h3>
          <Badge variant="secondary" className="bg-secondary-soft text-secondary border-0 font-semibold">
            {onboardingItems.length}
          </Badge>
        </div>
        {onboardingItems.length === 0 ? (
          <div className="space-y-2">
            {onboardingLoading ? (
              <p className="text-sm text-muted-foreground">Loading onboarding candidates...</p>
            ) : onboardingError ? (
              <p className="text-sm text-destructive">Could not load onboarding candidates: {onboardingError}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No onboarding candidates yet. Use "Onboard Candidate" to start phase 1.</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-foreground">Candidate</TableHead>
                  <TableHead className="font-semibold text-foreground">Phone</TableHead>
                  <TableHead className="font-semibold text-foreground">Onboarding Status</TableHead>
                  <TableHead className="font-semibold text-foreground">State</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Ready</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onboardingItems.map((o, idx) => {
                  const c = candidateMap.get(o.candidate_id);
                  return (
                    <TableRow key={o.id} className={cn("border-b border-border/60", idx % 2 === 1 && "bg-muted/20")}>
                      <TableCell className="text-sm font-medium">{c?.name ?? "Unknown candidate"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c?.phone ?? "—"}</TableCell>
                      <TableCell>
                        {hasOnboardingStatuses ? (
                          <Select
                            value={(statusDraft[o.id] ?? o.onboarding_status ?? "__none__") || "__none__"}
                            onValueChange={(v) => setStatusDraft((p) => ({ ...p, [o.id]: v === "__none__" ? "" : v }))}
                          >
                            <SelectTrigger className="h-8 text-xs w-44">
                              <SelectValue placeholder="Select onboarding status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Not set —</SelectItem>
                              {project!.onboarding_statuses!.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={statusDraft[o.id] ?? o.onboarding_status ?? ""}
                            onChange={(e) => setStatusDraft((p) => ({ ...p, [o.id]: e.target.value }))}
                            placeholder="e.g. Ready for Project"
                            className="h-8 text-xs"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          o.status === "MovedToProject"
                            ? "border-green-500/30 text-green-600 bg-green-500/10"
                            : "border-yellow-500/30 text-yellow-600 bg-yellow-500/10"
                        )}>
                          {o.status === "MovedToProject" ? "Moved to Project" : "Onboarding"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={
                            o.status === "MovedToProject" ||
                            (statusDraft[o.id] ?? o.onboarding_status ?? "").trim().toLowerCase() === "ready for project"
                          }
                          onClick={() => {
                            void handleMarkAsReady(o.id);
                          }}
                        >
                          Mark as Ready
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary hover:bg-primary-soft"
                            title="Save onboarding status"
                            onClick={() => handleSaveOnboarding(o.id, o.onboarding_status, o.notes)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          {canManageProject && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Remove from project"
                              onClick={() => setOnboardingToRemove(o)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card p-4 sm:p-6 hover-lift">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
              <Badge className="mt-1 font-medium bg-primary/15 text-primary border border-primary/30">
                <span className="h-1.5 w-1.5 rounded-full mr-1.5 bg-primary animate-pulse" />
                {project.status}
              </Badge>
            </div>
          </div>
        </Card>
        <Card className="glass-card p-4 sm:p-6 hover-lift">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary-soft text-secondary grid place-items-center">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
              <p className="text-sm font-semibold mt-0.5">{project.location}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-card p-4 sm:p-6 hover-lift">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start date</p>
              <p className="text-sm font-semibold mt-0.5">{formatDate((project.start_date as any)?.toDate?.())}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold inline-flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary-soft text-primary grid place-items-center">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            Active assignments
          </h3>
          <Badge variant="secondary" className="bg-primary-soft text-primary border-0 font-semibold">{active.length}</Badge>
        </div>
        {active.length > 0 && (
          <div className="mb-4 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search assigned candidates by name, phone, location…"
              className="pl-9 h-10 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {active.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No active assignments</p>
            <p className="text-xs text-muted-foreground mt-1">Assign available candidates to get started.</p>
            <Button onClick={() => setMoveOpen(true)} variant="premium" size="sm" className="mt-4 shadow-brand">
              <Plus className="h-4 w-4" /> Add to Project
            </Button>
          </div>
        ) : (
          <>
            {filteredActive.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No assigned candidates match your search</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search term.</p>
              </div>
            ) : (
              <>
                {/* Mobile: stacked cards */}
                <ul className="md:hidden space-y-3">
                  {filteredActive.map((a) => {
                const c = candidateMap.get(a.candidate_id);
                const isDeleted = !!c?.is_deleted;
                return (
                  <li key={a.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full grid place-items-center text-xs font-semibold shrink-0 text-white",
                        isDeleted ? "bg-muted text-muted-foreground" : "bg-gradient-brand"
                      )}>
                        {c ? initials(c.name) : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        {c ? (
                          isDeleted ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/40 break-words">
                                {c.name}
                              </span>
                              <OwnerBadge agencyId={c.agency_id} agencyName={c.agency_id ? agencyNameMap.get(c.agency_id) : null} />
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-muted-foreground/30 text-muted-foreground bg-muted/40">
                                Deleted
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link to={`/candidates/${c.id}`} className="text-sm font-semibold hover:text-primary break-words">
                                {c.name}
                              </Link>
                              <OwnerBadge agencyId={c.agency_id} agencyName={c.agency_id ? agencyNameMap.get(c.agency_id) : null} />
                            </div>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Unknown candidate</span>
                        )}
                        <p className={cn("text-xs tabular-nums mt-0.5", isDeleted ? "text-muted-foreground" : "text-muted-foreground")}>
                          {c?.phone ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasCustomStatuses && (
                          <Select
                            value={(a as any).project_status ?? "__none__"}
                            onValueChange={(v) => handleWorkflowStatus(a.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue placeholder="— Status —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Not set —</SelectItem>
                              {project!.custom_statuses!.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {c && !isDeleted && (
                          <Button asChild variant="ghost" size="sm" className="h-9 text-primary hover:text-primary hover:bg-primary-soft">
                            <Link to={`/candidates/${c.id}`}>
                              <Eye className="h-4 w-4" /> View
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(a.id, a.candidate_id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9">
                          <UserMinus className="h-4 w-4" /> Remove
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground ml-auto">
                        {formatDate((a.assigned_at as any)?.toDate?.())}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-foreground">Candidate</TableHead>
                    <TableHead className="font-semibold text-foreground">Phone</TableHead>
                    <TableHead className="font-semibold text-foreground">Assigned</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActive.map((a, idx) => {
                    const c = candidateMap.get(a.candidate_id);
                    const isDeleted = !!c?.is_deleted;
                    return (
                      <TableRow key={a.id} className={cn("group border-b border-border/60", idx % 2 === 1 && "bg-muted/20", "hover:bg-primary-soft/40")}>
                        <TableCell>
                          {c ? (
                            isDeleted ? (
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground grid place-items-center text-xs font-semibold">
                                  {initials(c.name)}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/40">
                                  {c.name}
                                </span>
                                <OwnerBadge agencyId={c.agency_id} agencyName={c.agency_id ? agencyNameMap.get(c.agency_id) : null} />
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-muted-foreground/30 text-muted-foreground bg-muted/40">
                                  Deleted
                                </Badge>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 flex-wrap">
                                <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 group/link">
                                  <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold">
                                    {initials(c.name)}
                                  </div>
                                  <span className="text-sm font-medium group-hover/link:text-primary transition-colors">{c.name}</span>
                                </Link>
                                <OwnerBadge agencyId={c.agency_id} agencyName={c.agency_id ? agencyNameMap.get(c.agency_id) : null} />
                              </div>
                            )
                          ) : <span className="text-sm text-muted-foreground italic">Unknown candidate</span>}
                        </TableCell>
                        <TableCell className={cn("text-sm tabular-nums", isDeleted && "text-muted-foreground")}>{c?.phone ?? "—"}</TableCell>
                        <TableCell className="text-sm">{formatDate((a.assigned_at as any)?.toDate?.())}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            {hasCustomStatuses && (
                              <Select
                                value={(a as any).project_status ?? "__none__"}
                                onValueChange={(v) => handleWorkflowStatus(a.id, v)}
                              >
                                <SelectTrigger className="h-7 text-xs w-40">
                                  <SelectValue placeholder="— Status —" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— Not set —</SelectItem>
                                  {project!.custom_statuses!.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {c && !isDeleted && (
                              <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary-soft">
                                <Link to={`/candidates/${c.id}`}>
                                  <Eye className="h-4 w-4" /> View
                                </Link>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleRemove(a.id, a.candidate_id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <UserMinus className="h-4 w-4" /> Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
              </>
            )}
          </>
        )}
      </Card>

      {past.length > 0 && (
        <Card className="glass-card p-4 sm:p-6 hover-lift">
          <h3 className="font-semibold mb-4">History</h3>
          {/* Mobile: stacked cards */}
          <ul className="md:hidden space-y-3">
            {past.map((a) => {
              const c = candidateMap.get(a.candidate_id);
              const isDeleted = !!c?.is_deleted;
              return (
                <li key={a.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                      {c ? (
                        <>
                          <span className={cn("text-sm font-medium break-words", isDeleted && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                            {c.name}
                          </span>
                          <OwnerBadge agencyId={c.agency_id} agencyName={c.agency_id ? agencyNameMap.get(c.agency_id) : null} />
                          {isDeleted && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-muted-foreground/30 text-muted-foreground bg-muted/40">
                              Deleted
                            </Badge>
                          )}
                        </>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </div>
                    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground shrink-0">{a.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    <div>
                      <p className="uppercase tracking-wider text-[10px]">Assigned</p>
                      <p className="text-foreground font-medium">{formatDate((a.assigned_at as any)?.toDate?.())}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider text-[10px]">Removed</p>
                      <p className="text-foreground font-medium">{formatDate((a.removed_at as any)?.toDate?.())}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-foreground">Candidate</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">Assigned</TableHead>
                  <TableHead className="font-semibold text-foreground">Removed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.map((a, idx) => {
                  const c = candidateMap.get(a.candidate_id);
                  const isDeleted = !!c?.is_deleted;
                  return (
                    <TableRow key={a.id} className={cn("border-b border-border/60", idx % 2 === 1 && "bg-muted/20")}>
                      <TableCell className={cn("text-sm", isDeleted && "text-muted-foreground")}>
                        {c ? (
                          <span className="inline-flex items-center gap-2 flex-wrap">
                            <span className={cn(isDeleted && "line-through decoration-muted-foreground/40")}>{c.name}</span>
                            <OwnerBadge agencyId={c.agency_id} agencyName={c.agency_id ? agencyNameMap.get(c.agency_id) : null} />
                            {isDeleted && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-muted-foreground/30 text-muted-foreground bg-muted/40">
                                Deleted
                              </Badge>
                            )}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">{a.status}</Badge></TableCell>
                      <TableCell className="text-sm">{formatDate((a.assigned_at as any)?.toDate?.())}</TableCell>
                      <TableCell className="text-sm">{formatDate((a.removed_at as any)?.toDate?.())}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <ProjectFormModal open={editOpen} onOpenChange={setEditOpen} project={project} />
      <OnboardCandidatesModal
        open={onboardOpen}
        onOpenChange={setOnboardOpen}
        projectId={project.id}
        projectAgencyId={project.agency_id ?? null}
        alreadyOnboardedIds={onboardedCandidateIds}
      />
      <MoveOnboardedToProjectModal
        open={moveOpen}
        onOpenChange={setMoveOpen}
        projectId={project.id}
        candidates={allCandidates}
        onboardingItems={onboardingItems}
      />

      {/* Remove-from-project confirmation */}
      <AlertDialog open={!!onboardingToRemove} onOpenChange={(o) => { if (!o) setOnboardingToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove candidate from project?</AlertDialogTitle>
            <AlertDialogDescription>
              {onboardingToRemove && (
                <>
                  <span className="font-medium text-foreground">
                    {candidateMap.get(onboardingToRemove.candidate_id)?.name ?? "This candidate"}
                  </span>{" "}
                  will be removed from <span className="font-medium text-foreground">{project.name}</span>'s
                  onboarding
                  {onboardingToRemove.status === "MovedToProject" && " and their active assignment will be ended"}.
                  They are not deleted and can be onboarded again later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingOnboarding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleRemoveOnboarding(); }}
              disabled={removingOnboarding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingOnboarding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteConfirm(false); }}
        >
          <Card className="w-full max-w-sm p-6 space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Delete project</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete <strong className="text-foreground">{project.name}</strong>?
              All assignments and onboarding records for this project will become orphaned.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteProject(project.id);
                    toast({ title: "Project deleted" });
                    navigate("/projects", { replace: true });
                  } catch (err: any) {
                    toast({ title: "Error", description: err?.message ?? "Failed to delete project", variant: "destructive" });
                    setDeleting(false);
                    setDeleteConfirm(false);
                  }
                }}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete permanently
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
