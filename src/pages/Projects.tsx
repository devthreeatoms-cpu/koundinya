import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Briefcase, MapPin, Calendar } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { useAssignments } from "@/hooks/useAssignments";
import ProjectFormModal from "@/components/projects/ProjectFormModal";
import type { Project } from "@/types";
import { formatDate } from "@/lib/utils-format";

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
      if (term &&
        !p.name.toLowerCase().includes(term) &&
        !(p.client_name ?? "").toLowerCase().includes(term) &&
        !p.location.toLowerCase().includes(term)
      ) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Track active engagements and assign your workforce."
        actions={
          <Button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-brand"
          >
            <Plus className="h-4 w-4 mr-1.5" /> New project
          </Button>
        }
      />

      <Card className="p-4 shadow-card mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, client, or location…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link to={`/projects/${p.id}`} key={p.id}>
              <Card className="p-5 shadow-card hover:shadow-elevated transition-shadow border-border/70 h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center text-white">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <Badge
                    className={
                      p.status === "Active"
                        ? "bg-primary text-primary-foreground border-0"
                        : "bg-muted text-muted-foreground border-0"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
                <h3 className="font-semibold tracking-tight">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{p.client_name || "Internal"}</p>

                <div className="space-y-1.5 mt-4 text-xs text-muted-foreground">
                  <p className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {p.location}</p>
                  <p className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Starts {formatDate((p.start_date as any)?.toDate?.())}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Active assignments</span>
                  <span className="text-sm font-semibold text-primary">{counts.get(p.id) ?? 0}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectFormModal open={modalOpen} onOpenChange={setModalOpen} project={editing} />
    </div>
  );
}
