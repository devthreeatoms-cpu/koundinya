import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, Timestamp,
  getDoc, getDocs, query, where, QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Project } from "@/types";
import { useAuth } from "@/context/AuthContext";

const COL = "projects";

export function useProjects() {
  const { isAdmin, agencyId, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !agencyId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    // Admin only sees admin-owned (agency_id == null) projects here.
    // To view a specific agency's projects, admin uses the Agencies drill-down page.
    const constraints: QueryConstraint[] = [
      where("agency_id", "==", isAdmin ? null : agencyId),
    ];
    const q = query(collection(db, COL), ...constraints);
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
  }, [isAdmin, agencyId, authLoading]);

  return { projects, loading };
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
