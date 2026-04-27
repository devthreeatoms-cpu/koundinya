import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, Timestamp,
  getDoc, getDocs, query, where, QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Project } from "@/types";
import { useAuth } from "@/context/AuthContext";

const COL = "projects";

export function useProjects(opts?: { bypassOwnerFilter?: boolean }) {
  const { isAdmin, agencyId, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const bypass = !!opts?.bypassOwnerFilter;

  useEffect(() => {
    if (authLoading) return;
    if (!bypass && !isAdmin && !agencyId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    // Strict separation: admin sees ONLY admin-owned data (agency_id == null).
    // bypass=true is used only on detail screens that already access-check a
    // specific agency-owned record.
    const constraints: QueryConstraint[] = bypass
      ? []
      : [
          isAdmin
            ? where("agency_id", "==", null)
            : where("agency_id", "==", agencyId),
        ];
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
  }, [isAdmin, agencyId, authLoading, bypass]);

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
    location: string;
    start_date?: Date | null;
    status: "Active" | "Completed";
  },
  ctx: { agency_id: string | null }
) {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    start_date: data.start_date ? Timestamp.fromDate(data.start_date) : null,
    agency_id: ctx.agency_id ?? null,
    created_at: serverTimestamp(),
  });
  // If created already in Completed state, make sure no stray active assignments linger.
  if (data.status === "Completed") {
    await releaseActiveAssignments(ref.id);
  }
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, "start_date">> & { start_date?: Date | null }
) {
  const payload: any = { ...data };
  if (data.start_date instanceof Date) payload.start_date = Timestamp.fromDate(data.start_date);

  // Detect transition into "Completed" so we can release assigned candidates.
  let shouldRelease = false;
  if (data.status === "Completed") {
    try {
      const snap = await getDoc(doc(db, COL, id));
      const prevStatus = (snap.data() as any)?.status;
      if (prevStatus !== "Completed") shouldRelease = true;
    } catch {
      shouldRelease = true;
    }
  }

  await updateDoc(doc(db, COL, id), payload);

  if (shouldRelease) {
    await releaseActiveAssignments(id);
  }
}

/**
 * Marks all Active assignments for a project as Completed and stamps
 * a removal time. This effectively "releases" those candidates so they
 * become Available again across the app (Available = no Active assignment).
 */
async function releaseActiveAssignments(projectId: string) {
  const snap = await getDocs(
    query(
      collection(db, "assignments"),
      where("project_id", "==", projectId),
      where("status", "==", "Active")
    )
  );
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(doc(db, "assignments", d.id), {
        status: "Completed",
        removed_at: serverTimestamp(),
      })
    )
  );
}
