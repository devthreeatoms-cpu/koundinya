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
    const constraints: QueryConstraint[] = [where("is_deleted", "==", false)];
    // Strict separation: admin sees ONLY admin-owned data (agency_id == null).
    // Agency users see only their own data.
    if (isAdmin) constraints.push(where("agency_id", "==", null));
    else constraints.push(where("agency_id", "==", agencyId));
    const q = query(collection(db, COL), ...constraints);
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
  }, [isAdmin, agencyId, authLoading]);

  return { candidates, loading };
}

/**
 * Returns ALL candidates (incl. soft-deleted), filtered by agency for non-admins.
 * Used for resolving names in assignment history.
 */
export function useAllCandidates(opts?: { bypassOwnerFilter?: boolean }) {
  const { isAdmin, agencyId, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const bypass = !!opts?.bypassOwnerFilter;

  useEffect(() => {
    if (authLoading) return;
    if (!bypass && !isAdmin && !agencyId) {
      setCandidates([]);
      setLoading(false);
      return;
    }
    // Admin sees only admin-owned (agency_id == null); agency sees only own.
    // bypass=true returns the full collection (used by detail pages where the
    // parent record is already access-checked).
    const constraints: QueryConstraint[] = bypass
      ? []
      : [
          isAdmin
            ? where("agency_id", "==", null)
            : where("agency_id", "==", agencyId),
        ];
    const q = constraints.length
      ? query(collection(db, COL), ...constraints)
      : query(collection(db, COL));
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
  }, [isAdmin, agencyId, authLoading, bypass]);

  return { candidates, loading };
}

/**
 * Combined candidate pool visible to the current user:
 * - Admin: all non-deleted candidates (admin-owned + every agency).
 * - Agency: own agency candidates + admin pool (agency_id == null).
 *
 * Each candidate keeps its real `agency_id`, so callers can label origin
 * (Admin pool vs. specific agency name).
 */
export function useCombinedCandidatePool() {
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
    const q = query(collection(db, COL), where("is_deleted", "==", false));
    const unsub = onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[];
        if (!isAdmin) {
          // Agency users see admin-owned (null) + their own agency.
          list = list.filter(
            (c) => c.agency_id == null || c.agency_id === agencyId
          );
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
 * Admin-only: returns all non-deleted candidates that BELONG to an agency
 * (agency_id != null). Used for the "Agency Candidates" tab.
 */
export function useAgencyOwnedCandidates() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { setCandidates([]); setLoading(false); return; }
    const q = query(
      collection(db, COL),
      where("is_deleted", "==", false),
      where("agency_id", "!=", null)
    );
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
  }, [isAdmin, authLoading]);

  return { candidates, loading };
}

/**
 * Live single-candidate fetch by ID, bypassing list-level agency filters.
 * Useful for detail pages so admins can drill into agency-owned candidates
 * via /agencies/:id without being blocked by the strict admin filter.
 */
export function useCandidateById(id: string | undefined) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setCandidate(null); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, COL, id),
      (snap) => {
        setCandidate(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Candidate) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [id]);

  return { candidate, loading };
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
