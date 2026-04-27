import { useEffect, useState } from "react";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp,
  getDocs, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Candidate } from "@/types";
import { normalizePhone } from "@/lib/utils-format";

const COL = "candidates";

export function useCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COL), where("is_deleted", "==", false));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[];
        list.sort((a, b) => {
          const ta = (a.created_at as any)?.toMillis?.() ?? 0;
          const tb = (b.created_at as any)?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setCandidates(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { candidates, loading };
}

/**
 * Returns ALL candidates including soft-deleted ones.
 * Use this for assignment history lookups so deleted candidates still
 * render with their original name + a "(Deleted)" label.
 */
export function useAllCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COL));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[];
        list.sort((a, b) => {
          const ta = (a.created_at as any)?.toMillis?.() ?? 0;
          const tb = (b.created_at as any)?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setCandidates(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { candidates, loading };
}

export async function createCandidate(data: Omit<Candidate, "id" | "created_at" | "is_deleted">) {
  const phone = normalizePhone(data.phone);
  // uniqueness check (client-side; Firestore rules should enforce as well)
  const existing = await getDocs(query(collection(db, COL), where("phone", "==", phone)));
  if (!existing.empty) {
    throw new Error("A candidate with this phone number already exists.");
  }
  await addDoc(collection(db, COL), {
    ...data,
    phone,
    is_deleted: false,
    status: data.status || "New",
    created_at: serverTimestamp(),
  });
}

export async function updateCandidate(id: string, data: Partial<Candidate>) {
  const payload: any = { ...data };
  if (data.phone) payload.phone = normalizePhone(data.phone);
  await updateDoc(doc(db, COL, id), payload);
}

export async function softDeleteCandidate(id: string) {
  await updateDoc(doc(db, COL, id), { is_deleted: true });
}
