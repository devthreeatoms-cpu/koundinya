import { useEffect, useState } from "react";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp,
  getDocs, QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Candidate } from "@/types";
import { normalizePhone } from "@/lib/utils-format";
import { useAuth } from "@/context/AuthContext";

const COL = "candidates";

/**
 * Returns candidates the current user is allowed to see.
 * - Admin: all non-deleted candidates.
 * - Agency: only candidates whose agency_id == current user's agency_id.
 * - Anyone with no profile/agency_id and not admin: nothing.
 */
export function useCandidates() {
  const { isAdmin, agencyId, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    // Agency user without agency_id sees nothing.
    if (!isAdmin && !agencyId) {
      setCandidates([]);
      setLoading(false);
      return;
    }
    // Admin: fetch ALL non-deleted candidates and filter client-side, treating
    // any record without an agency_id (legacy data) OR with agency_id == null
    // as admin-owned. This way pre-existing data created before agencies still
    // shows up on the admin dashboard.
    // Agency: server-side filter by their agency_id (strict isolation).
    const constraints: QueryConstraint[] = [where("is_deleted", "==", false)];
    if (!isAdmin) constraints.push(where("agency_id", "==", agencyId));
    const q = query(collection(db, COL), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[];
        if (isAdmin) {
          list = list.filter((c) => !c.agency_id); // null, undefined, or ""
        }
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
  }, [isAdmin, agencyId, authLoading]);

  return { candidates, loading };
}

/**
 * Returns ALL candidates (incl. soft-deleted), filtered by agency for non-admins.
 * Used for resolving names in assignment history.
 */
export function useAllCandidates() {
  const { isAdmin, agencyId, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !agencyId) {
      setCandidates([]);
      setLoading(false);
      return;
    }
    // Same isolation rule as useCandidates: admin sees admin-owned (incl. legacy
    // records without agency_id); agency sees only their own.
    const constraints: QueryConstraint[] = [];
    if (!isAdmin) constraints.push(where("agency_id", "==", agencyId));
    const q = constraints.length
      ? query(collection(db, COL), ...constraints)
      : query(collection(db, COL));
    const unsub = onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[];
        if (isAdmin) {
          list = list.filter((c) => !c.agency_id);
        }
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
  }, [isAdmin, agencyId, authLoading]);

  return { candidates, loading };
}

export async function createCandidate(
  data: Omit<Candidate, "id" | "created_at" | "is_deleted" | "agency_id">,
  ctx: { agency_id: string | null }
) {
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
    agency_id: ctx.agency_id ?? null,
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
