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
  GraduationCap,
  User,
  Hash,
  ShieldCheck,
  Landmark,
  UserCog,
  Building2,
  ShieldBan,
  ShieldCheck as ShieldOk,
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
import { useCandidateById, blocklistCandidate, unblocklistCandidate } from "@/hooks/useCandidates";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import { useOnboardingByCandidate } from "@/hooks/useOnboardingCandidates";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import CandidateFormModal from "@/components/candidates/CandidateFormModal";
import { formatDate, initials } from "@/lib/utils-format";
import type { CandidateStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
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

const statusStyles: Record<CandidateStatus, string> = {
  New: "bg-secondary/15 text-secondary border border-secondary/30",
  Contacted: "bg-warning/15 text-warning border border-warning/30",
  Assigned: "bg-primary/15 text-primary border border-primary/30",
  Rejected: "bg-destructive/15 text-destructive border border-destructive/30",
  "Call Back": "bg-accent/15 text-accent border border-accent/30",
  "Follow Up": "bg-warning/15 text-warning border border-warning/30",
  "On Hold": "bg-muted text-muted-foreground border border-border",
  "Interview Pending": "bg-primary/15 text-primary border border-primary/30",
  "Not Answering": "bg-destructive/15 text-destructive border border-destructive/30",
  "Not Interested": "bg-destructive/15 text-destructive border border-destructive/30",
  "Not Responding": "bg-destructive/15 text-destructive border border-destructive/30",
};

const statusDot: Record<CandidateStatus, string> = {
  New: "bg-secondary",
  Contacted: "bg-warning",
  Assigned: "bg-primary",
  Rejected: "bg-destructive",
  "Call Back": "bg-accent",
  "Follow Up": "bg-warning",
  "On Hold": "bg-muted-foreground",
  "Interview Pending": "bg-primary",
  "Not Answering": "bg-destructive",
  "Not Interested": "bg-destructive",
  "Not Responding": "bg-destructive",
};

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, agencyId, canEditCandidates } = useAuth();
  const { toast } = useToast();
  const { candidate, loading: cLoading } = useCandidateById(id);
  const bypass = isAdmin && !!candidate?.agency_id;
  const { projects } = useProjects({ bypassOwnerFilter: bypass });
  const { assignments } = useAssignments({ candidate_id: id, bypassOwnerFilter: bypass });
  const { items: onboardingRecords } = useOnboardingByCandidate(id);
  const [editOpen, setEditOpen] = useState(false);
  const [blocklistOpen, setBlocklistOpen] = useState(false);
  const [blocklistLoading, setBlocklistLoading] = useState(false);

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
  const isBlocklisted = !!candidate.is_blocklisted;

  async function handleBlocklistToggle() {
    setBlocklistLoading(true);
    try {
      if (isBlocklisted) {
        await unblocklistCandidate(candidate.id);
        toast({ title: "Removed from blocklist" });
      } else {
        await blocklistCandidate(candidate.id);
        toast({ title: "Candidate blocklisted" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setBlocklistLoading(false);
      setBlocklistOpen(false);
    }
  }

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
          (isAdmin || (candidate?.agency_id === agencyId && canEditCandidates)) ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  isBlocklisted
                    ? "border-success/40 text-success hover:bg-success/10"
                    : "border-destructive/40 text-destructive hover:bg-destructive/10"
                )}
                onClick={() => setBlocklistOpen(true)}
              >
                {isBlocklisted ? (
                  <><ShieldOk className="h-4 w-4" /> Remove blocklist</>
                ) : (
                  <><ShieldBan className="h-4 w-4" /> Blocklist</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4" /> Edit
              </Button>
            </div>
          ) : undefined
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
              {isBlocklisted && (
                <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10 font-semibold gap-1">
                  <ShieldBan className="h-3 w-3" /> Blocklisted
                </Badge>
              )}
            </div>
            {candidate.kisfs_id && (
              <p className="mt-1 text-xs font-mono font-semibold text-primary tracking-widest">
                {candidate.kisfs_id}
              </p>
            )}

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Phone</p>
                  <p className={cn("text-sm font-medium tabular-nums mt-0.5", !candidate.phone && "text-muted-foreground italic")}>
                    {candidate.phone || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Email</p>
                  <p className={cn("text-sm font-medium mt-0.5 break-words", !candidate.email && "text-muted-foreground italic")}>
                    {candidate.email || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-secondary-soft text-secondary grid place-items-center">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Location</p>
                  {candidate.state ? (
                    <div className="mt-0.5 space-y-0.5">
                      {candidate.area_name && (
                        <p className="text-sm font-medium break-words">{candidate.area_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground break-words">
                        {[candidate.district, candidate.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <p className={cn("text-sm font-medium mt-0.5 break-words", !candidate.location && "text-muted-foreground italic")}>
                      {candidate.location || "Not provided"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent grid place-items-center">
                  <Bike className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Transport</p>
                  <p className="text-sm font-medium mt-0.5">{candidate.has_bike ? "Has bike" : "No bike"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Age</p>
                  <p className={cn("text-sm font-medium mt-0.5", candidate.age == null && "text-muted-foreground italic")}>
                    {candidate.age != null ? `${candidate.age} years` : "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-secondary-soft text-secondary grid place-items-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Gender</p>
                  <p className={cn("text-sm font-medium mt-0.5", !candidate.gender && "text-muted-foreground italic")}>
                    {candidate.gender || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent grid place-items-center">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Qualification</p>
                  <p className={cn("text-sm font-medium mt-0.5 break-words", !candidate.qualification && "text-muted-foreground italic")}>
                    {candidate.qualification || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground grid place-items-center">
                  <Hash className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Pincode</p>
                  <p className={cn("text-sm font-medium tabular-nums mt-0.5", !candidate.pincode && "text-muted-foreground italic")}>
                    {candidate.pincode || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Registered On</p>
                  <p className={cn("text-sm font-medium tabular-nums mt-0.5", !candidate.created_at && "text-muted-foreground italic")}>
                    {candidate.created_at ? formatDate((candidate.created_at as any)?.toDate?.()) : "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground grid place-items-center shrink-0">
                  {candidate.source === "Internal Team"
                    ? <UserCog className="h-4 w-4" />
                    : <Building2 className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Source</p>
                  <p className="text-sm font-medium mt-0.5 break-words">
                    {candidate.source_member_name || candidate.source || "Not provided"}
                  </p>
                  {candidate.source_member_name && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{candidate.source}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 grid place-items-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none flex items-center gap-1">
                    Aadhar Number
                    {candidate.aadhar_verified && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-green-500/20 text-green-600 font-semibold">Verified</span>
                    )}
                  </p>
                  <p className={cn("text-sm font-medium mt-0.5", !candidate.aadhar_number && "text-muted-foreground italic")}>
                    {candidate.aadhar_number || "Not provided"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 grid place-items-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none flex items-center gap-1">
                    PAN Number
                    {candidate.pan_verified && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-green-500/20 text-green-600 font-semibold">Verified</span>
                    )}
                  </p>
                  <p className={cn("text-sm font-medium tracking-wider mt-0.5", !candidate.pan_number && "text-muted-foreground italic")}>
                    {candidate.pan_number || "Not provided"}
                  </p>
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

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="glass-card p-4 sm:p-6 hover-lift">
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

          <Card className="glass-card p-4 sm:p-6 hover-lift">
              <h3 className="font-semibold inline-flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <Landmark className="h-3.5 w-3.5" />
                </div>
                Bank Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <BankField label="Name as per bank account" value={candidate.bank_account_name} />
                <BankField label="Bank name" value={candidate.bank_name} />
                <BankField label="Account number" value={candidate.bank_account_number} mono />
                <BankField label="IFSC code" value={candidate.bank_ifsc} mono />
              </div>
            </Card>
        </div>
      </div>

      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <h3 className="font-semibold inline-flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-secondary-soft text-secondary grid place-items-center">
            <UserCog className="h-3.5 w-3.5" />
          </div>
          Onboarding history
        </h3>
        {onboardingRecords.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Not onboarded to any project yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="md:hidden space-y-3">
              {onboardingRecords.map((o) => {
                const p = projectMap.get(o.project_id);
                const moved = o.status === "MovedToProject";
                return (
                  <li key={o.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
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
                          moved
                            ? "border-primary/40 text-primary bg-primary-soft"
                            : "border-secondary/40 text-secondary bg-secondary-soft"
                        )}
                      >
                        {moved ? "Moved to project" : "Onboarding"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                      <div>
                        <p className="uppercase tracking-wider text-[10px]">Stage</p>
                        <p className="text-foreground font-medium">{o.onboarding_status || "—"}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wider text-[10px]">Onboarded</p>
                        <p className="text-foreground font-medium">{formatDate((o.created_at as any)?.toDate?.())}</p>
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
                    <TableHead className="font-semibold text-foreground">Stage</TableHead>
                    <TableHead className="font-semibold text-foreground">State</TableHead>
                    <TableHead className="font-semibold text-foreground">Onboarded</TableHead>
                    <TableHead className="font-semibold text-foreground">Moved to project</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onboardingRecords.map((o, idx) => {
                    const p = projectMap.get(o.project_id);
                    const moved = o.status === "MovedToProject";
                    return (
                      <TableRow
                        key={o.id}
                        className={cn("border-b border-border/60", idx % 2 === 1 && "bg-muted/20")}
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
                        <TableCell className="text-sm">{o.onboarding_status || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              moved
                                ? "border-primary/40 text-primary bg-primary-soft"
                                : "border-secondary/40 text-secondary bg-secondary-soft"
                            }
                          >
                            {moved ? "Moved to project" : "Onboarding"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate((o.created_at as any)?.toDate?.())}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate((o.moved_to_project_at as any)?.toDate?.())}
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

      <AlertDialog open={blocklistOpen} onOpenChange={setBlocklistOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocklisted ? "Remove from blocklist?" : "Blocklist this candidate?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocklisted ? (
                <>
                  <span className="font-medium text-foreground">{candidate.name}</span> will be removed from the blocklist and marked available again.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">{candidate.name}</span> will be blocklisted. They will be flagged across all views and cannot be assigned to projects.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blocklistLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBlocklistToggle(); }}
              disabled={blocklistLoading}
              className={isBlocklisted
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {blocklistLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isBlocklisted ? "Remove blocklist" : "Blocklist"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BankField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  const filled = !!value;
  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        filled
          ? "border-border/60 bg-muted/30"
          : "border-dashed border-border/40 bg-transparent"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      {filled ? (
        <p className={cn("text-sm font-medium mt-0.5", mono && "font-mono tracking-wider")}>
          {value}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground/50 mt-0.5 italic">Not filled yet</p>
      )}
    </div>
  );
}
