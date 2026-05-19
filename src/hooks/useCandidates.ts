import { useEffect, useState } from "react";
import {
  collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp,
  getDocs, QueryConstraint, writeBatch, getDoc, setDoc,
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

/**
 * Fixes all KISFS ID problems in one pass:
 *   1. Candidates with no ID → assigns a new sequential one.
 *   2. Duplicate IDs → keeps the oldest candidate's ID, reassigns the rest.
 * Returns the total number of candidates that were updated.
 */
export async function bulkAssignKisfsIds(): Promise<number> {
  const snap = await getDocs(query(collection(db, COL)));
  const allDocs = snap.docs;

  // First pass: build a set of IDs already claimed (first occurrence wins).
  const claimed = new Set<string>();
  const toReassign: (typeof allDocs[number])[] = [];

  // Sort by created_at ascending so the oldest record keeps its ID.
  const sorted = [...allDocs].sort((a, b) => {
    const ta = (a.data().created_at as any)?.toMillis?.() ?? 0;
    const tb = (b.data().created_at as any)?.toMillis?.() ?? 0;
    return ta - tb;
  });

  for (const d of sorted) {
    const kisfs = d.data().kisfs_id as string | null | undefined;
    if (!kisfs) {
      toReassign.push(d); // missing — needs an ID
    } else if (claimed.has(kisfs)) {
      toReassign.push(d); // duplicate — reassign
    } else {
      claimed.add(kisfs); // first occurrence — keep
    }
  }

  if (toReassign.length === 0) return 0;

  // Start the counter from the highest value currently in use so new IDs
  // don't collide with anything that was just kept.
  const counterRef = doc(db, "counters", "candidates");
  const counterSnap = await getDoc(counterRef);
  let counter = counterSnap.exists() ? (counterSnap.data().count as number) : 0;

  for (const d of allDocs) {
    const kisfs = d.data().kisfs_id as string | null | undefined;
    if (kisfs) {
      const m = kisfs.match(/^KISFS0*(\d+)$/);
      if (m) counter = Math.max(counter, parseInt(m[1], 10));
    }
  }

  const batch = writeBatch(db);
  for (const d of toReassign) {
    counter += 1;
    batch.update(d.ref, { kisfs_id: `KISFS${String(counter).padStart(4, "0")}` });
  }
  batch.set(counterRef, { count: counter }, { merge: true });
  await batch.commit();
  return toReassign.length;
}

export async function bulkUpdateKycData() {
  const snapshot = await getDocs(query(collection(db, COL), where("is_deleted", "==", false)));
  
  const targets = snapshot.docs.filter(docSnap => {
    const data = docSnap.data();
    return !data.aadhar_number && !data.pan_number;
  });

  if (targets.length === 0) return 0;

  const fullKycCount = Math.floor(targets.length * 0.4);
  const aadharOnlyCount = Math.floor(targets.length * 0.2);
  const panOnlyCount = Math.floor(targets.length * 0.2);

  const generateAadhar = () => {
    let res = "";
    for (let i = 0; i < 12; i++) res += Math.floor(Math.random() * 10);
    return res;
  };

  const generatePan = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const getLetter = () => letters[Math.floor(Math.random() * letters.length)];
    const getDigit = () => Math.floor(Math.random() * 10).toString();
    return getLetter() + getLetter() + getLetter() + getLetter() + getLetter() +
           getDigit() + getDigit() + getDigit() + getDigit() +
           getLetter();
  };

  const usedAadhar = new Set<string>();
  const usedPan = new Set<string>();

  const getUniqueAadhar = () => {
    let candidate = generateAadhar();
    while (usedAadhar.has(candidate)) candidate = generateAadhar();
    usedAadhar.add(candidate);
    return candidate;
  };

  const getUniquePan = () => {
    let candidate = generatePan();
    while (usedPan.has(candidate)) candidate = generatePan();
    usedPan.add(candidate);
    return candidate;
  };

  const shuffled = [...targets].sort(() => Math.random() - 0.5);

  let updated = 0;
  for (let i = 0; i < shuffled.length; i++) {
    const docSnap = shuffled[i];
    const payload: Partial<Candidate> = {};

    if (i < fullKycCount) {
      payload.aadhar_number = getUniqueAadhar();
      payload.pan_number = getUniquePan();
      payload.aadhar_verified = true;
      payload.pan_verified = true;
    } else if (i < fullKycCount + aadharOnlyCount) {
      payload.aadhar_number = getUniqueAadhar();
      payload.aadhar_verified = true;
      payload.pan_number = null;
      payload.pan_verified = false;
    } else if (i < fullKycCount + aadharOnlyCount + panOnlyCount) {
      payload.pan_number = getUniquePan();
      payload.pan_verified = true;
      payload.aadhar_number = null;
      payload.aadhar_verified = false;
    } else {
      continue;
    }

    await updateDoc(docSnap.ref, payload);
    updated++;
  }

  return updated;
}

// ─── Dev / Admin utilities ────────────────────────────────────────────────────

/** Delete every candidate document and reset the sequential counter to 0. */
export async function clearAllCandidates(): Promise<void> {
  const snap = await getDocs(collection(db, COL));
  const CHUNK = 490; // Firestore batch limit
  for (let i = 0; i < snap.docs.length; i += CHUNK) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await setDoc(doc(db, "counters", "candidates"), { count: 0 });
}

const SEED_ROWS = [
  { name: "Ravi Kumar",       phone: "9876543201", state: "Karnataka",       district: "Bangalore Urban",  area_name: "Koramangala",   has_bike: true,  source: "Internal Team",    status: "New",       aadhar: "234567890123", pan: "RKVKR1234A" },
  { name: "Priya Sharma",     phone: "9876543202", state: "Maharashtra",     district: "Mumbai",           area_name: "Andheri",       has_bike: false, source: "Internal Team",    status: "Contacted", aadhar: "345678901234", pan: null          },
  { name: "Amit Singh",       phone: "9876543203", state: "Delhi",           district: "Delhi",            area_name: "Rohini",        has_bike: true,  source: "Internal Team",    status: "New",       aadhar: null,           pan: "AMTSG9012C"  },
  { name: "Sunita Patel",     phone: "9876543204", state: "Gujarat",         district: "Ahmedabad",        area_name: "Satellite",     has_bike: false, source: "Internal Team",    status: "Assigned",  aadhar: "456789012345", pan: "SNPAT3456D"  },
  { name: "Mohammed Hussain", phone: "9876543205", state: "Telangana",       district: "Hyderabad",        area_name: "Banjara Hills", has_bike: true,  source: "Supplier Partners", status: "New",       aadhar: null,           pan: null          },
  { name: "Lakshmi Devi",     phone: "9876543206", state: "Tamil Nadu",      district: "Chennai",          area_name: "T Nagar",       has_bike: false, source: "Internal Team",    status: "Contacted", aadhar: "567890123456", pan: "LKDVI2345F"  },
  { name: "Rajesh Nair",      phone: "9876543207", state: "Kerala",          district: "Ernakulam",        area_name: "Kakkanad",      has_bike: true,  source: "Supplier Partners", status: "New",       aadhar: "678901234567", pan: null          },
  { name: "Anita Desai",      phone: "9876543208", state: "Maharashtra",     district: "Pune",             area_name: "Kothrud",       has_bike: false, source: "Internal Team",    status: "Rejected",  aadhar: null,           pan: null          },
  { name: "Suresh Verma",     phone: "9876543209", state: "Rajasthan",       district: "Jaipur",           area_name: "Malviya Nagar", has_bike: true,  source: "Internal Team",    status: "Contacted", aadhar: "789012345678", pan: "SRVMA4567I"  },
  { name: "Kavitha Reddy",    phone: "9876543210", state: "Andhra Pradesh",  district: "Krishna",          area_name: "Governorpet",   has_bike: false, source: "Supplier Partners", status: "New",       aadhar: null,           pan: "KVRED8901J"  },
  { name: "Manish Kumar",     phone: "9876543211", state: "Uttar Pradesh",   district: "Lucknow",          area_name: "Hazratganj",    has_bike: true,  source: "Internal Team",    status: "Assigned",  aadhar: "890123456789", pan: "MNSHM2346K"  },
  { name: "Pooja Mehta",      phone: "9876543212", state: "Gujarat",         district: "Surat",            area_name: "Adajan",        has_bike: false, source: "Supplier Partners", status: "New",       aadhar: null,           pan: null          },
  { name: "Deepak Yadav",     phone: "9876543213", state: "Madhya Pradesh",  district: "Bhopal",           area_name: "MP Nagar",      has_bike: true,  source: "Internal Team",    status: "New",       aadhar: "901234567890", pan: "DPKYD5678L"  },
  { name: "Sneha Iyer",       phone: "9876543214", state: "Tamil Nadu",      district: "Coimbatore",       area_name: "RS Puram",      has_bike: false, source: "Internal Team",    status: "Contacted", aadhar: "123456789012", pan: "SNHIY3456M"  },
  { name: "Arjun Pillai",     phone: "9876543215", state: "Kerala",          district: "Thiruvananthapuram", area_name: "Kowdiar",     has_bike: true,  source: "Supplier Partners", status: "New",       aadhar: "234567890124", pan: null          },
] as const;

/** Create a fresh set of 15 diverse test candidates with sequential KISFS IDs. */
export async function seedTestCandidates(): Promise<number> {
  const batch = writeBatch(db);
  SEED_ROWS.forEach((s, i) => {
    const ref = doc(collection(db, COL));
    batch.set(ref, {
      name: s.name,
      phone: normalizePhone(s.phone),
      state: s.state,
      district: s.district,
      area_name: s.area_name,
      has_bike: s.has_bike,
      source: s.source,
      status: s.status,
      notes: null,
      aadhar_number: s.aadhar ?? null,
      pan_number: s.pan ?? null,
      aadhar_verified: !!s.aadhar,
      pan_verified: !!s.pan,
      bank_account_name: null,
      bank_name: null,
      bank_account_number: null,
      bank_ifsc: null,
      source_member_id: null,
      source_member_name: null,
      kisfs_id: `KISFS${String(i + 1).padStart(4, "0")}`,
      is_deleted: false,
      agency_id: null,
      created_at: serverTimestamp(),
    });
  });
  batch.set(doc(db, "counters", "candidates"), { count: SEED_ROWS.length });
  await batch.commit();
  return SEED_ROWS.length;
}
