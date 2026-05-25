import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, serverTimestamp, query, orderBy,
  doc, deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const COL = "project_statuses";

export interface ProjectStatusItem {
  id: string;
  name: string;
  created_at?: any;
}

export function useProjectStatuses() {
  const { isAdmin, isInternal } = useAuth();
  const [statuses, setStatuses] = useState<ProjectStatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COL), orderBy("created_at", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStatuses(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProjectStatusItem[]
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  async function addStatus(name: string) {
    if (!isAdmin && !isInternal) throw new Error("Only admins and internal team can add statuses");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Status name is required");
    if (statuses.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("This status already exists");
    }
    await addDoc(collection(db, COL), {
      name: trimmed,
      created_at: serverTimestamp(),
    });
  }

  async function removeStatus(id: string) {
    if (!isAdmin) throw new Error("Only admins can remove statuses");
    await deleteDoc(doc(db, COL, id));
  }

  return { statuses, loading, addStatus, removeStatus, isAdmin, isInternal };
}
