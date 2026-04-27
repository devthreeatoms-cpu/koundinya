import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Briefcase, Edit, Plus, UserMinus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useProjects } from "@/hooks/useProjects";
import { useCandidates } from "@/hooks/useCandidates";
import { useAssignments, removeAssignment } from "@/hooks/useAssignments";
import ProjectFormModal from "@/components/projects/ProjectFormModal";
import AssignCandidatesModal from "@/components/projects/AssignCandidatesModal";
import { formatDate, initials } from "@/lib/utils-format";
import { useToast } from "@/hooks/use-toast";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { projects } = useProjects();
  const { candidates } = useCandidates();
  const { assignments } = useAssignments({ project_id: id });
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const project = projects.find((p) => p.id === id);
  const candidateMap = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

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
      <div>
        <Link to="/projects" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
        </Link>
        <Card className="p-12 text-center"><p className="text-sm text-muted-foreground">Project not found.</p></Card>
      </div>
    );
  }

  return (
    <div>
      <Link to="/projects" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4 hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
      </Link>

      <PageHeader
        title={project.name}
        description={project.client_name || "Internal project"}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4 mr-1.5" /> Edit
            </Button>
            <Button
              onClick={() => setAssignOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-brand"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Assign candidates
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-5 shadow-card">
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge className={project.status === "Active" ? "bg-primary text-primary-foreground mt-2 border-0" : "bg-muted text-muted-foreground mt-2 border-0"}>
            {project.status}
          </Badge>
        </Card>
        <Card className="p-5 shadow-card">
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="text-sm font-medium mt-2 inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" /> {project.location}</p>
        </Card>
        <Card className="p-5 shadow-card">
          <p className="text-xs text-muted-foreground">Start date</p>
          <p className="text-sm font-medium mt-2 inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-muted-foreground" /> {formatDate((project.start_date as any)?.toDate?.())}</p>
        </Card>
      </div>

      <Card className="p-5 shadow-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold inline-flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" /> Active assignments
          </h3>
          <Badge variant="secondary" className="bg-primary-soft text-primary border-0">{active.length}</Badge>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active assignments yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Candidate</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((a) => {
                const c = candidateMap.get(a.candidate_id);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      {c ? (
                        <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 hover:text-primary">
                          <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold">
                            {initials(c.name)}
                          </div>
                          <span className="text-sm font-medium">{c.name}</span>
                        </Link>
                      ) : <span className="text-sm text-muted-foreground">Unknown candidate</span>}
                    </TableCell>
                    <TableCell className="text-sm">{c?.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate((a.assigned_at as any)?.toDate?.())}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(a.id)} className="text-destructive hover:text-destructive">
                        <UserMinus className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {past.length > 0 && (
        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4">History</h3>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Candidate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Removed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {past.map((a) => {
                const c = candidateMap.get(a.candidate_id);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{c?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">{a.status}</Badge></TableCell>
                    <TableCell className="text-sm">{formatDate((a.assigned_at as any)?.toDate?.())}</TableCell>
                    <TableCell className="text-sm">{formatDate((a.removed_at as any)?.toDate?.())}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <ProjectFormModal open={editOpen} onOpenChange={setEditOpen} project={project} />
      <AssignCandidatesModal open={assignOpen} onOpenChange={setAssignOpen} projectId={project.id} />
    </div>
  );
}
