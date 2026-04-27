import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit, Phone, MapPin, Bike, FileText, Briefcase } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCandidates } from "@/hooks/useCandidates";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import CandidateFormModal from "@/components/candidates/CandidateFormModal";
import { formatDate, initials } from "@/lib/utils-format";
import type { CandidateStatus } from "@/types";

const statusStyles: Record<CandidateStatus, string> = {
  New: "bg-secondary-soft text-secondary border-0",
  Contacted: "bg-accent/10 text-accent border-0",
  Assigned: "bg-primary text-primary-foreground border-0",
  Rejected: "bg-destructive/10 text-destructive border-0",
};

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const { candidates } = useCandidates();
  const { projects } = useProjects();
  const { assignments } = useAssignments({ candidate_id: id });
  const [editOpen, setEditOpen] = useState(false);

  const candidate = candidates.find((c) => c.id === id);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  if (!candidate) {
    return (
      <div>
        <Link to="/candidates" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
        </Link>
        <Card className="p-12 text-center"><p className="text-sm text-muted-foreground">Candidate not found.</p></Card>
      </div>
    );
  }

  const isAvailable = !assignments.some((a) => a.status === "Active");

  return (
    <div>
      <Link to="/candidates" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4 hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
      </Link>

      <PageHeader
        title={candidate.name}
        description={`Source: ${candidate.source}`}
        actions={
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-1.5" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="p-6 shadow-card lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-brand text-white grid place-items-center text-xl font-semibold shadow-brand">
              {initials(candidate.name)}
            </div>
            <div>
              <p className="font-semibold">{candidate.name}</p>
              <Badge className={`${statusStyles[candidate.status]} mt-1`}>{candidate.status}</Badge>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {candidate.phone}</p>
            <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {candidate.location}</p>
            <p className="inline-flex items-center gap-2">
              <Bike className="h-4 w-4 text-muted-foreground" /> {candidate.has_bike ? "Has bike" : "No bike"}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Availability</p>
            <Badge variant="outline" className={`mt-2 ${isAvailable ? "border-primary/40 text-primary" : "border-muted-foreground/30 text-muted-foreground"}`}>
              {isAvailable ? "Available" : "Currently assigned"}
            </Badge>
          </div>
        </Card>

        <Card className="p-6 shadow-card lg:col-span-2">
          <h3 className="font-semibold inline-flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-primary" /> Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {candidate.notes?.trim() || "No notes."}
          </p>
        </Card>
      </div>

      <Card className="p-5 shadow-card">
        <h3 className="font-semibold inline-flex items-center gap-2 mb-4">
          <Briefcase className="h-4 w-4 text-primary" /> Assignment history
        </h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No assignments yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Removed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => {
                const p = projectMap.get(a.project_id);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      {p ? (
                        <Link to={`/projects/${p.id}`} className="text-sm font-medium hover:text-primary">{p.name}</Link>
                      ) : <span className="text-sm text-muted-foreground">Unknown</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={a.status === "Active" ? "border-primary/40 text-primary" : "border-muted-foreground/30 text-muted-foreground"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate((a.assigned_at as any)?.toDate?.())}</TableCell>
                    <TableCell className="text-sm">{formatDate((a.removed_at as any)?.toDate?.())}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <CandidateFormModal open={editOpen} onOpenChange={setEditOpen} candidate={candidate} />
    </div>
  );
}
