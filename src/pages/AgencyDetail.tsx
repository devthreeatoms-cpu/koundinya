import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Users as UsersIcon,
  ClipboardList,
  Mail,
  ShieldCheck,
  Loader2,
  MapPin,
  Eye,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuth } from "@/context/AuthContext";
import { useAgency, useAgencyData } from "@/hooks/useAgencies";
import { formatDate, initials } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

export default function AgencyDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, loading: authLoading } = useAuth();
  const { agency, loading: aLoading } = useAgency(id);
  const {
    projects,
    candidates,
    assignments,
    users,
    loading: dLoading,
  } = useAgencyData(id);

  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates]
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === "Active"),
    [assignments]
  );

  // candidate_id -> active project (used by the Candidates section to show
  // "Assigned to <project>" or "Available" inline).
  const candidateAssignmentMap = useMemo(() => {
    const m = new Map<string, { projectId: string; projectName: string }>();
    for (const a of activeAssignments) {
      const p = projectMap.get(a.project_id);
      m.set(a.candidate_id, {
        projectId: a.project_id,
        projectName: p?.name ?? "Unknown project",
      });
    }
    return m;
  }, [activeAssignments, projectMap]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  if (aLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="space-y-4">
        <Link
          to="/agencies"
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to agencies
        </Link>
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Agency not found.</p>
        </Card>
      </div>
    );
  }

  const visibleCandidates = candidates.filter((c) => !c.is_deleted);

  return (
    <div className="space-y-6">
      <Link
        to="/agencies"
        className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to agencies
      </Link>

      <PageHeader
        title={agency.name}
        description={`Created ${formatDate((agency.created_at as any)?.toDate?.()) || "—"}`}
      />

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          icon={<Briefcase className="h-5 w-5" />}
          label="Projects"
          value={projects.length}
          tone="brand"
          loading={dLoading}
        />
        <StatCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Candidates"
          value={visibleCandidates.length}
          tone="secondary"
          loading={dLoading}
        />
        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Active assignments"
          value={activeAssignments.length}
          tone="accent"
          loading={dLoading}
        />
      </div>

      {/* Projects */}
      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <SectionHeader
          icon={<Briefcase className="h-3.5 w-3.5" />}
          title="Projects"
          count={projects.length}
        />
        {dLoading ? (
          <SkeletonRows />
        ) : projects.length === 0 ? (
          <EmptyState text="No projects in this agency yet." />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="md:hidden space-y-3">
              {projects.map((p) => {
                const isActive = p.status === "Active";
                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold break-words">{p.name}</p>
                        {p.client_name && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {p.client_name}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 font-medium",
                          isActive
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-muted text-muted-foreground border border-border"
                        )}
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{p.location}</span>
                      </span>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-9 text-primary hover:text-primary hover:bg-primary-soft shrink-0"
                      >
                        <Link to={`/projects/${p.id}`}>
                          <Eye className="h-4 w-4" /> View
                        </Link>
                      </Button>
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
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Client</TableHead>
                    <TableHead className="font-semibold text-foreground">Location</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p, idx) => {
                    const isActive = p.status === "Active";
                    return (
                      <TableRow
                        key={p.id}
                        className={cn(
                          "border-b border-border/60",
                          idx % 2 === 1 && "bg-muted/20",
                          "hover:bg-primary-soft/40"
                        )}
                      >
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.client_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {p.location}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "font-medium",
                              isActive
                                ? "bg-primary/15 text-primary border border-primary/30"
                                : "bg-muted text-muted-foreground border border-border"
                            )}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary hover:bg-primary-soft"
                          >
                            <Link to={`/projects/${p.id}`}>
                              <Eye className="h-4 w-4" /> View
                            </Link>
                          </Button>
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

      {/* Candidates */}
      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <SectionHeader
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          title="Candidates"
          count={visibleCandidates.length}
        />
        {dLoading ? (
          <SkeletonRows />
        ) : visibleCandidates.length === 0 ? (
          <EmptyState text="No candidates in this agency yet." />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="md:hidden space-y-3">
              {visibleCandidates.map((c) => {
                const a = candidateAssignmentMap.get(c.id);
                return (
                  <li
                    key={c.id}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold break-words">{c.name}</p>
                        {a ? (
                          <Link
                            to={`/projects/${a.projectId}`}
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5 break-words"
                          >
                            Assigned to {a.projectName}
                          </Link>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Not assigned to any project
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/50">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium",
                          a
                            ? "border-warning/40 text-warning bg-warning/10"
                            : "border-primary/40 text-primary bg-primary-soft"
                        )}
                      >
                        {a ? "Assigned" : "Available"}
                      </Badge>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-9 text-primary hover:text-primary hover:bg-primary-soft"
                      >
                        <Link to={`/candidates/${c.id}`}>
                          <Eye className="h-4 w-4" /> View
                        </Link>
                      </Button>
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
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCandidates.map((c, idx) => {
                    const a = candidateAssignmentMap.get(c.id);
                    return (
                      <TableRow
                        key={c.id}
                        className={cn(
                          "border-b border-border/60",
                          idx % 2 === 1 && "bg-muted/20",
                          "hover:bg-primary-soft/40"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-semibold">
                              {initials(c.name)}
                            </div>
                            <span className="text-sm font-medium">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {a ? (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-warning/40 text-warning bg-warning/10 font-medium"
                              >
                                Assigned
                              </Badge>
                              <Link
                                to={`/projects/${a.projectId}`}
                                className="text-xs text-primary hover:underline truncate max-w-[14rem]"
                                title={a.projectName}
                              >
                                {a.projectName}
                              </Link>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-primary/40 text-primary bg-primary-soft font-medium"
                            >
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary hover:bg-primary-soft"
                          >
                            <Link to={`/candidates/${c.id}`}>
                              <Eye className="h-4 w-4" /> View
                            </Link>
                          </Button>
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

      {/* Active assignments */}
      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <SectionHeader
          icon={<ClipboardList className="h-3.5 w-3.5" />}
          title="Active assignments"
          count={activeAssignments.length}
        />
        {dLoading ? (
          <SkeletonRows />
        ) : activeAssignments.length === 0 ? (
          <EmptyState text="No active assignments for this agency." />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="md:hidden space-y-3">
              {activeAssignments.map((a) => {
                const c = candidateMap.get(a.candidate_id);
                const p = projectMap.get(a.project_id);
                return (
                  <li
                    key={a.id}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {c ? (
                          <p className="text-sm font-semibold break-words">{c.name}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Unknown</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">
                          {p ? p.name : <span className="italic">Unknown project</span>}
                        </p>
                      </div>
                      {c && (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-9 text-primary hover:text-primary hover:bg-primary-soft shrink-0"
                        >
                          <Link to={`/candidates/${c.id}`}>
                            <Eye className="h-4 w-4" /> View
                          </Link>
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                      Assigned{" "}
                      <span className="font-medium text-foreground">
                        {formatDate((a.assigned_at as any)?.toDate?.())}
                      </span>
                    </p>
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
                    <TableHead className="font-semibold text-foreground">Project</TableHead>
                    <TableHead className="font-semibold text-foreground">Assigned</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAssignments.map((a, idx) => {
                    const c = candidateMap.get(a.candidate_id);
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
                          {c ? (
                            <span className="text-sm font-medium">{c.name}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p ? p.name : <span className="text-muted-foreground italic">Unknown</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate((a.assigned_at as any)?.toDate?.())}
                        </TableCell>
                        <TableCell className="text-right">
                          {c && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary-soft"
                            >
                              <Link to={`/candidates/${c.id}`}>
                                <Eye className="h-4 w-4" /> View
                              </Link>
                            </Button>
                          )}
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

      {/* Users */}
      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <SectionHeader
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          title="Users"
          count={users.length}
        />
        {dLoading ? (
          <SkeletonRows />
        ) : users.length === 0 ? (
          <EmptyState text="No users invited to this agency yet." />
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-all">{u.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {u.role === "admin" ? "Global admin" : agency.name}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground"
                >
                  {u.role === "admin" ? "Admin" : "Agency"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "brand" | "secondary" | "accent";
  loading: boolean;
}) {
  const toneCls =
    tone === "brand"
      ? "bg-gradient-brand text-white"
      : tone === "secondary"
      ? "bg-secondary-soft text-secondary"
      : "bg-accent/10 text-accent";
  return (
    <Card className="glass-card p-3 sm:p-5 hover-lift">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-xl grid place-items-center shadow-sm shrink-0", toneCls)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-6 w-10 mt-1" />
          ) : (
            <p className="text-lg sm:text-xl font-bold mt-0.5 tabular-nums">{value}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold inline-flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary-soft text-primary grid place-items-center">
          {icon}
        </div>
        {title}
      </h3>
      <Badge variant="secondary" className="bg-primary-soft text-primary border-0 font-semibold">
        {count}
      </Badge>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
