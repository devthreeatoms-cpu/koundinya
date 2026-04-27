import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  Bike,
  FileText,
  Briefcase,
  Calendar,
  Tag,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCandidateById } from "@/hooks/useCandidates";
import { useProjects, useProjectById } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import CandidateFormModal from "@/components/candidates/CandidateFormModal";
import { formatDate, initials } from "@/lib/utils-format";
import type { CandidateStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const statusStyles: Record<CandidateStatus, string> = {
  New: "bg-secondary/15 text-secondary border border-secondary/30",
  Contacted: "bg-warning/15 text-warning border border-warning/30",
  Assigned: "bg-primary/15 text-primary border border-primary/30",
  Rejected: "bg-destructive/15 text-destructive border border-destructive/30",
};

const statusDot: Record<CandidateStatus, string> = {
  New: "bg-secondary",
  Contacted: "bg-warning",
  Assigned: "bg-primary",
  Rejected: "bg-destructive",
};

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const { candidate, loading: cLoading } = useCandidateById(id);
  const { projects } = useProjects();
  const { assignments } = useAssignments({ candidate_id: id });
  const [editOpen, setEditOpen] = useState(false);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  if (cLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="space-y-4">
        <Link
          to="/candidates"
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
        </Link>
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Candidate not found.</p>
        </Card>
      </div>
    );
  }

  const isAvailable = !assignments.some((a) => a.status === "Active");

  return (
    <div className="space-y-6">
      <Link
        to="/candidates"
        className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
      </Link>

      <PageHeader
        title={candidate.name}
        description={`Source: ${candidate.source}`}
        actions={
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-card relative overflow-hidden p-0 hover-lift lg:col-span-1">
          <div className="h-20 bg-gradient-brand" />
          <div className="px-6 pb-6 -mt-10">
            <div className="h-20 w-20 rounded-2xl bg-white p-1 shadow-elevated">
              <div className="h-full w-full rounded-xl bg-gradient-brand text-white grid place-items-center text-2xl font-bold">
                {initials(candidate.name)}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold tracking-tight">{candidate.name}</h2>
              <Badge className={cn("font-medium gap-1.5", statusStyles[candidate.status])}>
                <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[candidate.status])} />
                {candidate.status}
              </Badge>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Phone</p>
                  <p className="text-sm font-medium tabular-nums">{candidate.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-secondary-soft text-secondary grid place-items-center">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Location</p>
                  <p className="text-sm font-medium">{candidate.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent grid place-items-center">
                  <Bike className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Transport</p>
                  <p className="text-sm font-medium">{candidate.has_bike ? "Has bike" : "No bike"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground grid place-items-center">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Source</p>
                  <p className="text-sm font-medium">{candidate.source}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Availability
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "mt-2",
                  isAvailable
                    ? "border-primary/40 text-primary bg-primary-soft"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mr-1.5",
                    isAvailable ? "bg-primary animate-pulse" : "bg-muted-foreground"
                  )}
                />
                {isAvailable ? "Available" : "Currently assigned"}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4 sm:p-6 hover-lift lg:col-span-2">
          <h3 className="font-semibold inline-flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-primary-soft text-primary grid place-items-center">
              <FileText className="h-3.5 w-3.5" />
            </div>
            Notes
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {candidate.notes?.trim() || "No notes yet."}
          </p>
        </Card>
      </div>

      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <h3 className="font-semibold inline-flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-primary-soft text-primary grid place-items-center">
            <Briefcase className="h-3.5 w-3.5" />
          </div>
          Assignment history
        </h3>
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="md:hidden space-y-3">
              {assignments.map((a) => {
                const p = projectMap.get(a.project_id);
                return (
                  <li key={a.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {p ? (
                          <Link to={`/projects/${p.id}`} className="text-sm font-semibold hover:text-primary break-words">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unknown</span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0",
                          a.status === "Active"
                            ? "border-primary/40 text-primary bg-primary-soft"
                            : "border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {a.status}
                      </Badge>
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
                    <TableHead className="font-semibold text-foreground">Project</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">Assigned</TableHead>
                    <TableHead className="font-semibold text-foreground">Removed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a, idx) => {
                    const p = projectMap.get(a.project_id);
                    return (
                      <TableRow
                        key={a.id}
                        className={cn(
                          "border-b border-border/60",
                          idx % 2 === 1 && "bg-muted/20"
                        )}
                      >
                        <TableCell>
                          {p ? (
                            <Link
                              to={`/projects/${p.id}`}
                              className="text-sm font-medium hover:text-primary transition-colors"
                            >
                              {p.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              a.status === "Active"
                                ? "border-primary/40 text-primary bg-primary-soft"
                                : "border-muted-foreground/30 text-muted-foreground"
                            }
                          >
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate((a.assigned_at as any)?.toDate?.())}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate((a.removed_at as any)?.toDate?.())}
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

      <CandidateFormModal open={editOpen} onOpenChange={setEditOpen} candidate={candidate} />
    </div>
  );
}
