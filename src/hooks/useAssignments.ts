import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment } from "@/types";

const COL = "assignments";

export function useAssignments(filter?: { project_id?: string; candidate_id?: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q: any = collection(db, COL);
    if (filter?.project_id) q = query(q, where("project_id", "==", filter.project_id));
    if (filter?.candidate_id) q = query(q, where("candidate_id", "==", filter.candidate_id));

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
  }, [filter?.project_id, filter?.candidate_id]);

  return { assignments, loading };
}

export async function assignCandidates(projectId: string, candidateIds: string[]) {
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
    });
  }
}

export async function removeAssignment(assignmentId: string, status: "Completed" | "Dropped" = "Completed") {
  await updateDoc(doc(db, COL, assignmentId), {
    status,
    removed_at: serverTimestamp(),
  });
}
