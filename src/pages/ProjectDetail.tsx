import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Briefcase, Edit, Plus, UserMinus, Users, Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useProjects } from "@/hooks/useProjects";
import { useAllCandidates } from "@/hooks/useCandidates";
import { useAssignments, removeAssignment } from "@/hooks/useAssignments";
import ProjectFormModal from "@/components/projects/ProjectFormModal";
import AssignCandidatesModal from "@/components/projects/AssignCandidatesModal";
import { formatDate, initials } from "@/lib/utils-format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { projects } = useProjects();
  const { candidates: allCandidates } = useAllCandidates();
  const { assignments } = useAssignments({ project_id: id });
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const project = projects.find((p) => p.id === id);
  // Use the full candidate list (incl. soft-deleted) so historical
  // assignments still show the candidate's name with a "(Deleted)" tag.
  const candidateMap = useMemo(() => new Map(allCandidates.map((c) => [c.id, c])), [allCandidates]);

  const active = assignments.filter((a) => a.status === "Active");
  const past = assignments.filter((a) => a.status !== "Active");

  async function handleRemove(assignmentId: string) {
    try {
      await removeAssignment(assignmentId, "Completed");
      toast({ title: "Candidate removed from project" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
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

  const isActive = project.status === "Active";

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
            <Button onClick={() => setAssignOpen(true)} variant="premium">
              <Plus className="h-4 w-4" /> Assign candidates
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card p-4 sm:p-6 hover-lift">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl grid place-items-center text-white shadow-sm", isActive ? "bg-gradient-brand" : "bg-muted-foreground/60")}>
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
              <Badge className={cn("mt-1 font-medium", isActive ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-border")}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/60")} />
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
        {active.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No active assignments</p>
            <p className="text-xs text-muted-foreground mt-1">Assign available candidates to get started.</p>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="md:hidden space-y-3">
              {active.map((a) => {
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
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-muted-foreground/30 text-muted-foreground bg-muted/40">
                                Deleted
                              </Badge>
                            </div>
                          ) : (
                            <Link to={`/candidates/${c.id}`} className="text-sm font-semibold hover:text-primary break-words block">
                              {c.name}
                            </Link>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Unknown candidate</span>
                        )}
                        <p className={cn("text-xs tabular-nums mt-0.5", isDeleted ? "text-muted-foreground" : "text-muted-foreground")}>
                          {c?.phone ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                      <p className="text-[11px] text-muted-foreground">
                        Assigned <span className="font-medium text-foreground">{formatDate((a.assigned_at as any)?.toDate?.())}</span>
                      </p>
                      <div className="flex items-center gap-1">
                        {c && !isDeleted && (
                          <Button asChild variant="ghost" size="sm" className="h-9 text-primary hover:text-primary hover:bg-primary-soft">
                            <Link to={`/candidates/${c.id}`}>
                              <Eye className="h-4 w-4" /> View
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(a.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9">
                          <UserMinus className="h-4 w-4" /> Remove
                        </Button>
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
                    <TableHead className="font-semibold text-foreground">Phone</TableHead>
                    <TableHead className="font-semibold text-foreground">Assigned</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((a, idx) => {
                    const c = candidateMap.get(a.candidate_id);
                    const isDeleted = !!c?.is_deleted;
                    return (
                      <TableRow key={a.id} className={cn("group border-b border-border/60", idx % 2 === 1 && "bg-muted/20", "hover:bg-primary-soft/40")}>
                        <TableCell>
                          {c ? (
                            isDeleted ? (
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground grid place-items-center text-xs font-semibold">
                                  {initials(c.name)}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/40">
                                  {c.name}
                                </span>
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-muted-foreground/30 text-muted-foreground bg-muted/40">
                                  Deleted
                                </Badge>
                              </div>
                            ) : (
                              <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 group/link">
                                <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold">
                                  {initials(c.name)}
                                </div>
                                <span className="text-sm font-medium group-hover/link:text-primary transition-colors">{c.name}</span>
                              </Link>
                            )
                          ) : <span className="text-sm text-muted-foreground italic">Unknown candidate</span>}
                        </TableCell>
                        <TableCell className={cn("text-sm tabular-nums", isDeleted && "text-muted-foreground")}>{c?.phone ?? "—"}</TableCell>
                        <TableCell className="text-sm">{formatDate((a.assigned_at as any)?.toDate?.())}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            {c && !isDeleted && (
                              <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary-soft">
                                <Link to={`/candidates/${c.id}`}>
                                  <Eye className="h-4 w-4" /> View
                                </Link>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleRemove(a.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
                          <span className="inline-flex items-center gap-2">
                            <span className={cn(isDeleted && "line-through decoration-muted-foreground/40")}>{c.name}</span>
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
      <AssignCandidatesModal open={assignOpen} onOpenChange={setAssignOpen} projectId={project.id} />
    </div>
  );
}
