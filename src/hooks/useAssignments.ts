import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp,
  query, where, getDocs, QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment } from "@/types";
import { useAuth } from "@/context/AuthContext";

const COL = "assignments";

export function useAssignments(filter?: { project_id?: string; candidate_id?: string }) {
  const { isAdmin, agencyId, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !agencyId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    const base = collection(db, COL);
    const constraints: QueryConstraint[] = [];
    if (filter?.project_id) constraints.push(where("project_id", "==", filter.project_id));
    if (filter?.candidate_id) constraints.push(where("candidate_id", "==", filter.candidate_id));
    if (!isAdmin) constraints.push(where("agency_id", "==", agencyId));
    const q = constraints.length ? query(base, ...constraints) : query(base);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Assignment[];
        list.sort((a, b) => {
          const ta = (a.assigned_at as any)?.toMillis?.() ?? 0;
          const tb = (b.assigned_at as any)?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setAssignments(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.project_id, filter?.candidate_id, isAdmin, agencyId, authLoading]);

  return { assignments, loading };
}

export async function assignCandidates(
  projectId: string,
  candidateIds: string[],
  ctx: { agency_id: string | null }
) {
  for (const cid of candidateIds) {
    // check no active assignment
    const existing = await getDocs(
      query(
        collection(db, COL),
        where("candidate_id", "==", cid),
        where("status", "==", "Active")
      )
    );
    if (!existing.empty) continue; // skip already-active candidates
    await addDoc(collection(db, COL), {
      candidate_id: cid,
      project_id: projectId,
      status: "Active",
      assigned_at: serverTimestamp(),
      removed_at: null,
      agency_id: ctx.agency_id ?? null,
    });
  }
}

export async function removeAssignment(assignmentId: string, status: "Completed" | "Dropped" = "Completed") {
  await updateDoc(doc(db, COL, assignmentId), {
    status,
    removed_at: serverTimestamp(),
  });
}
