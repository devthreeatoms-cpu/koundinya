import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
  query, where, QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Project } from "@/types";
import { useAuth } from "@/context/AuthContext";

const COL = "projects";

export function useProjects(opts?: { bypassOwnerFilter?: boolean }) {
  const { isAdmin, isInternal, agencyId, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const bypass = !!opts?.bypassOwnerFilter;

  // Internal team members should see ALL projects (same as admin) so they
  // can view, create, and assign candidates to any project.
  const hasFullAccess = isAdmin || isInternal;

  useEffect(() => {
    if (authLoading) return;
    if (!bypass && !hasFullAccess && !agencyId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    // Admin and internal team see all projects; supply partners only see
    // projects tagged with their own agency_id.
    const constraints: QueryConstraint[] = bypass || hasFullAccess
      ? []
      : [where("agency_id", "==", agencyId)];
    const q = constraints.length
      ? query(collection(db, COL), ...constraints)
      : query(collection(db, COL));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Project[];
        list.sort((a, b) => {
          const ta = (a.created_at as any)?.toMillis?.() ?? 0;
          const tb = (b.created_at as any)?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setProjects(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [hasFullAccess, agencyId, authLoading, bypass]);

  return { projects, loading };
}

/**
 * Live single-project fetch by ID, bypassing list-level agency filters.
 * Used by detail pages so admins can drill into agency-owned projects
 * via /agencies/:id without being blocked by the strict admin filter.
 */
export function useProjectById(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setProject(null); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, COL, id),
      (snap) => {
        setProject(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Project) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [id]);

  return { project, loading };
}

export async function createProject(
  data: {
    name: string;
    client_name?: string;
    client_id?: string | null;
    location: string;
    start_date?: Date | null;
    status: string;
    custom_statuses?: string[];
    onboarding_statuses?: string[];
  },
  ctx: { agency_id: string | null }
) {
  await addDoc(collection(db, COL), {
    ...data,
    start_date: data.start_date ? Timestamp.fromDate(data.start_date) : null,
    custom_statuses: data.custom_statuses ?? [],
    onboarding_statuses: data.onboarding_statuses ?? [],
    agency_id: ctx.agency_id ?? null,
    created_at: serverTimestamp(),
  });
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, "start_date">> & { start_date?: Date | null }
) {
  const payload: any = { ...data };
  if (data.start_date instanceof Date) payload.start_date = Timestamp.fromDate(data.start_date);

  await updateDoc(doc(db, COL, id), payload);
}

export async function deleteProject(id: string) {
  await deleteDoc(doc(db, COL, id));
}
