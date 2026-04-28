import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, getDoc, serverTimestamp,
  query, where, getDocs, QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment } from "@/types";
import { useAuth } from "@/context/AuthContext";

const COL = "assignments";

export function useAssignments(filter?: {
  project_id?: string;
  candidate_id?: string;
  /**
   * When true, skip the admin/agency ownership filter. Use ONLY when the
   * caller is already scoped by a specific project_id or candidate_id that
   * the user has legitimate access to (e.g. admin drilling into an
   * agency-owned project from /agencies/:id → /projects/:id).
   */
  bypassOwnerFilter?: boolean;
}) {
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
    if (!filter?.bypassOwnerFilter) {
      // Strict separation: admin sees ONLY admin-owned (agency_id == null) assignments.
      if (isAdmin) constraints.push(where("agency_id", "==", null));
      else constraints.push(where("agency_id", "==", agencyId));
    }
    const q = query(base, ...constraints);

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
  }, [filter?.project_id, filter?.candidate_id, filter?.bypassOwnerFilter, isAdmin, agencyId, authLoading]);

  return { assignments, loading };
}

export async function assignCandidates(
  projectId: string,
  candidateIds: string[],
  // ctx kept for backwards compatibility, but the assignment's agency_id is
  // ALWAYS derived from the candidate so candidate ↔ assignment ownership
  // can never drift.
  _ctx?: { agency_id?: string | null }
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

    // Derive agency_id from the candidate so assignment.agency_id always
    // matches candidate.agency_id (admin pool => null, agency => agency id).
    const candSnap = await getDoc(doc(db, "candidates", cid));
    const candAgencyId = candSnap.exists()
      ? ((candSnap.data() as any).agency_id ?? null)
      : null;

    await addDoc(collection(db, COL), {
      candidate_id: cid,
      project_id: projectId,
      status: "Active",
      assigned_at: serverTimestamp(),
      removed_at: null,
      agency_id: candAgencyId,
    });
  }
}

export async function removeAssignment(assignmentId: string, status: "Completed" | "Dropped" = "Completed") {
  await updateDoc(doc(db, COL, assignmentId), {
    status,
    removed_at: serverTimestamp(),
  });
}
