import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, Timestamp,
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
  await addDoc(collection(db, COL), {
    ...data,
    start_date: data.start_date ? Timestamp.fromDate(data.start_date) : null,
    created_at: serverTimestamp(),
  });
}

export async function updateProject(id: string, data: Partial<Project> & { start_date?: Date | null }) {
  const payload: any = { ...data };
  if (data.start_date instanceof Date) payload.start_date = Timestamp.fromDate(data.start_date);
  await updateDoc(doc(db, COL, id), payload);
}
