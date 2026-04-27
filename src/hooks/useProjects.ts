import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, Timestamp,
  getDoc, getDocs, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Project } from "@/types";

const COL = "projects";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COL),
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
  }, []);

  return { projects, loading };
}

export async function createProject(data: {
  name: string;
  client_name?: string;
  location: string;
  start_date?: Date | null;
  status: "Active" | "Completed";
}) {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    start_date: data.start_date ? Timestamp.fromDate(data.start_date) : null,
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
