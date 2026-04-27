import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Briefcase, MapPin, Calendar, Users, ArrowUpRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import ProjectFormModal from "@/components/projects/ProjectFormModal";
import type { Project } from "@/types";
import { formatDate } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const { projects, loading } = useProjects();
  const { assignments } = useAssignments();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      if (a.status === "Active") m.set(a.project_id, (m.get(a.project_id) ?? 0) + 1);
    }
    return m;
  }, [assignments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !(p.client_name ?? "").toLowerCase().includes(term) &&
        !p.location.toLowerCase().includes(term)
      )
        return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track active engagements and assign your workforce."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            variant="premium"
          >
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      <Card className="glass-card p-5 hover-lift">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search by name, client, or location…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-16 text-center hover-lift">
          <div className="h-16 w-16 rounded-2xl bg-gradient-soft mx-auto mb-4 grid place-items-center">
            <Briefcase className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first project to start assigning candidates.
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            variant="premium"
            className="mt-5"
          >
            <Plus className="h-4 w-4" /> New project
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, idx) => {
            const activeCount = counts.get(p.id) ?? 0;
            const isActive = p.status === "Active";
            return (
              <Link to={`/projects/${p.id}`} key={p.id} className="group block animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <Card
                  className={cn(
                    "glass-card relative overflow-hidden p-0 hover-lift h-full transition-all duration-300",
                    "hover:shadow-elevated hover:-translate-y-1 hover:border-primary/30"
                  )}
                >
                  {/* Gradient strip */}
                  <div
                    className={cn(
                      "h-1.5 w-full",
                      isActive ? "bg-gradient-brand" : "bg-muted-foreground/30"
                    )}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={cn(
                          "h-11 w-11 rounded-xl grid place-items-center text-white shadow-sm transition-transform duration-300 group-hover:scale-110",
                          isActive ? "bg-gradient-brand" : "bg-muted-foreground/60"
                        )}
                      >
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <Badge
                        className={cn(
                          "font-medium",
                          isActive
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-muted text-muted-foreground border border-border"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full mr-1.5",
                            isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/60"
                          )}
                        />
                        {p.status}
                      </Badge>
                    </div>

                    <h3 className="font-semibold tracking-tight text-base group-hover:text-primary transition-colors truncate">
                      {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {p.client_name || "Internal project"}
                    </p>

                    <div className="space-y-2 mt-4 text-xs text-muted-foreground">
                      <p className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {p.location}
                      </p>
                      <p className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Starts{" "}
                        {formatDate((p.start_date as any)?.toDate?.())}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground leading-none">
                            Assigned
                          </p>
                          <p className="text-sm font-semibold tabular-nums">{activeCount}</p>
                        </div>
                      </div>
                      <div className="text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0">
                        <ArrowUpRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <ProjectFormModal open={modalOpen} onOpenChange={setModalOpen} project={editing} />
    </div>
  );
}
