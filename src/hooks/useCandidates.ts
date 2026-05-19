import { useEffect, useState } from "react";
import {
  collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp,
  getDocs, QueryConstraint, setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Candidate } from "@/types";
import { normalizePhone } from "@/lib/utils-format";
import { useAuth } from "@/context/AuthContext";

const COL = "candidates";

function sortByCreated(list: Candidate[]) {
  return list.sort((a, b) => {
    const ta = (a.created_at as any)?.toMillis?.() ?? 0;
    const tb = (b.created_at as any)?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

/**
 * Returns candidates the current user is allowed to see.
 * - Admin: all non-deleted admin-owned candidates (agency_id == null).
 * - Agency: only candidates whose agency_id == current user's agency_id.
 * - Anyone with no profile/agency_id and not admin: nothing.
 */
export function useCandidates() {
  const { isAdmin, agencyId, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // While auth is resolving, keep loading=true so downstream
    // consumers never see a flash of empty/stale data.
    if (authLoading) { setLoading(true); return; }

    if (!isAdmin && !agencyId) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const constraints: QueryConstraint[] = [where("is_deleted", "==", false)];
    if (isAdmin) constraints.push(where("agency_id", "==", null));
    else constraints.push(where("agency_id", "==", agencyId));
    const q = query(collection(db, COL), ...constraints);

    // Reset loading BEFORE subscribing so we never display stale data
    // during the window between starting the subscription and first snapshot.
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCandidates(sortByCreated(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[]));
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
    if (authLoading) { setLoading(true); return; }

    if (!bypass && !isAdmin && !agencyId) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const constraints: QueryConstraint[] = bypass
      ? []
      : [isAdmin ? where("agency_id", "==", null) : where("agency_id", "==", agencyId)];
    const q = constraints.length
      ? query(collection(db, COL), ...constraints)
      : query(collection(db, COL));

    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCandidates(sortByCreated(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[]));
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
 * Each candidate keeps its real `agency_id`, so callers can label origin.
 */
export function useCombinedCandidatePool() {
  const { isAdmin, agencyId, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) { setLoading(true); return; }

    if (!isAdmin && !agencyId) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, COL), where("is_deleted", "==", false));
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[];
        if (!isAdmin) {
          list = list.filter((c) => c.agency_id == null || c.agency_id === agencyId);
        }
        setCandidates(sortByCreated(list));
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
 * (agency_id != null). Used for the "Agency Candidates" tab and dashboard totals.
 */
export function useAgencyOwnedCandidates() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) { setLoading(true); return; }

    if (!isAdmin) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, COL),
      where("is_deleted", "==", false),
      where("agency_id", "!=", null)
    );
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCandidates(sortByCreated(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[]));
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
  const [dupPhone, dupAadhar, dupPan, dupKisfs] = await Promise.all([
    getDocs(query(collection(db, COL), where("phone", "==", phone))),
    data.aadhar_number
      ? getDocs(query(collection(db, COL), where("aadhar_number", "==", data.aadhar_number)))
      : Promise.resolve(null),
    data.pan_number
      ? getDocs(query(collection(db, COL), where("pan_number", "==", data.pan_number)))
      : Promise.resolve(null),
    data.kisfs_id
      ? getDocs(query(collection(db, COL), where("kisfs_id", "==", data.kisfs_id)))
      : Promise.resolve(null),
  ]);
  if (!dupPhone.empty) throw new Error("A candidate with this phone number already exists.");
  if (dupAadhar && !dupAadhar.empty) throw new Error("A candidate with this Aadhar number already exists.");
  if (dupPan && !dupPan.empty) throw new Error("A candidate with this PAN number already exists.");
  if (dupKisfs && !dupKisfs.empty) throw new Error(`${data.kisfs_id} is already assigned to another candidate.`);

  if (data.aadhar_number && !/^\d{12}$/.test(data.aadhar_number)) {
    throw new Error("Enter valid 12-digit Aadhar number");
  }
  if (data.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan_number)) {
    throw new Error("Enter valid PAN format (ABCDE1234F)");
  }

  // No auto-generation — kisfs_id is whatever the admin explicitly set, or null.
  await setDoc(doc(collection(db, COL)), {
    ...data,
    phone,
    is_deleted: false,
    status: data.status || "New",
    agency_id: ctx.agency_id ?? null,
    created_at: serverTimestamp(),
  });
}

/** Returns true if a candidate with this KISFS ID already exists (excludes the given candidateId). */
export async function isKisfsIdTaken(kisfsId: string, excludeCandidateId?: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, COL), where("kisfs_id", "==", kisfsId)));
  return snap.docs.some((d) => d.id !== (excludeCandidateId ?? ""));
}

export async function updateCandidate(id: string, data: Partial<Candidate>) {
  const payload: any = { ...data };
  if (data.phone) payload.phone = normalizePhone(data.phone);

  if (data.aadhar_number && !/^\d{12}$/.test(data.aadhar_number)) {
    throw new Error("Enter valid 12-digit Aadhar number");
  }
  if (data.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan_number)) {
    throw new Error("Enter valid PAN format (ABCDE1234F)");
  }

  const normalizedPhone = payload.phone as string | undefined;
  const [dupPhone, dupAadhar, dupPan, dupKisfs] = await Promise.all([
    normalizedPhone
      ? getDocs(query(collection(db, COL), where("phone", "==", normalizedPhone)))
      : Promise.resolve(null),
    data.aadhar_number
      ? getDocs(query(collection(db, COL), where("aadhar_number", "==", data.aadhar_number)))
      : Promise.resolve(null),
    data.pan_number
      ? getDocs(query(collection(db, COL), where("pan_number", "==", data.pan_number)))
      : Promise.resolve(null),
    data.kisfs_id
      ? getDocs(query(collection(db, COL), where("kisfs_id", "==", data.kisfs_id)))
      : Promise.resolve(null),
  ]);
  if (dupPhone && dupPhone.docs.some((d) => d.id !== id))
    throw new Error("A candidate with this phone number already exists.");
  if (dupAadhar && dupAadhar.docs.some((d) => d.id !== id))
    throw new Error("A candidate with this Aadhar number already exists.");
  if (dupPan && dupPan.docs.some((d) => d.id !== id))
    throw new Error("A candidate with this PAN number already exists.");
  if (dupKisfs && dupKisfs.docs.some((d) => d.id !== id))
    throw new Error(`${data.kisfs_id} is already assigned to another candidate.`);

  await updateDoc(doc(db, COL, id), payload);
}

export async function softDeleteCandidate(id: string) {
  await updateDoc(doc(db, COL, id), { is_deleted: true });
}

export async function blocklistCandidate(id: string) {
  await updateDoc(doc(db, COL, id), { is_blocklisted: true });
}

export async function unblocklistCandidate(id: string) {
  await updateDoc(doc(db, COL, id), { is_blocklisted: false });
}
