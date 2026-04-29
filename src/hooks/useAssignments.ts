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
    if (authLoading) { setLoading(true); return; }
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

export async function bulkRebuildAssignments() {
  // 1. Complete active assignments
  const assignSnap = await getDocs(query(collection(db, "assignments"), where("status", "==", "Active")));
  for (const docSnap of assignSnap.docs) {
    await updateDoc(docSnap.ref, {
      status: "Completed",
      removed_at: serverTimestamp()
    });
  }

  // 2. Select FULL KYC candidates
  const candSnap = await getDocs(query(collection(db, "candidates"), where("is_deleted", "==", false)));
  const fullKycCandidates = candSnap.docs.filter(docSnap => {
    const data = docSnap.data();
    return !!data.aadhar_number && !!data.pan_number;
  });

  if (fullKycCandidates.length === 0) return 0;

  // 3. Get projects
  const projSnap = await getDocs(query(collection(db, "projects"), where("is_deleted", "==", false)));
  if (projSnap.empty) return 0;

  const projects = projSnap.docs;

  // 4. Create new assignments (random ~60%)
  const countToAssign = Math.floor(fullKycCandidates.length * 0.6);
  const candidatesToAssign = [...fullKycCandidates].sort(() => Math.random() - 0.5).slice(0, countToAssign);

  let updated = 0;
  for (const candDoc of candidatesToAssign) {
    const candData = candDoc.data();
    const randomProj = projects[Math.floor(Math.random() * projects.length)];

    await addDoc(collection(db, "assignments"), {
      candidate_id: candDoc.id,
      project_id: randomProj.id,
      agency_id: candData.agency_id ?? null,
      status: "Active",
      assigned_at: serverTimestamp(),
      removed_at: null
    });
    updated++;
  }

  return updated;
}
