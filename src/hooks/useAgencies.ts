import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, where,
  doc, setDoc, getDoc, updateDoc, getDocs,
} from "firebase/firestore";
import { initializeApp, getApp, deleteApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { Agency, AppUser, Candidate, Project, Assignment } from "@/types";

const COL = "agencies";

/**
 * Live list of agencies (admin-only consumer).
 * By default excludes soft-deleted agencies; pass { includeDeleted: true }
 * to also return deactivated ones (for the "show inactive" toggle).
 */
export function useAgencies(opts: { includeDeleted?: boolean } = {}) {
  const includeDeleted = !!opts.includeDeleted;
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Order client-side; some legacy docs may not have created_at yet.
    const unsub = onSnapshot(
      collection(db, COL),
      (snap) => {
        let list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as any) })
        ) as Agency[];
        if (!includeDeleted) list = list.filter((a) => !a.is_deleted);
        list.sort(
          (x, y) =>
            ((y.created_at as any)?.toMillis?.() ?? 0) -
            ((x.created_at as any)?.toMillis?.() ?? 0)
        );
        setAgencies(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [includeDeleted]);

  return { agencies, loading };
}

/** Live list of all app users (admin-only consumer). */
export function useAllUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AppUser[]
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { users, loading };
}

export async function createAgency(input: {
  kissp_id?: string | null;
  name: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  partner_type?: string | null;
  city_name?: string | null;
  aadhar_number?: string | null;
  aadhar_name?: string | null;
  aadhar_dob?: string | null;
  aadhar_address?: string | null;
  pan_number?: string | null;
  pan_name?: string | null;
  bank_account_name?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch_name?: string | null;
  bank_account_type?: string | null;
  company_name?: string | null;
  company_gst?: string | null;
}): Promise<string> {
  const kisspId = input.kissp_id?.trim() || null;
  const aadharNum = input.aadhar_number?.trim() || null;
  const panNum = input.pan_number?.trim() || null;

  const [dupKissp, dupAadhar, dupPan] = await Promise.all([
    kisspId ? getDocs(query(collection(db, COL), where("kissp_id", "==", kisspId))) : Promise.resolve(null),
    aadharNum ? getDocs(query(collection(db, COL), where("aadhar_number", "==", aadharNum))) : Promise.resolve(null),
    panNum ? getDocs(query(collection(db, COL), where("pan_number", "==", panNum))) : Promise.resolve(null),
  ]);
  if (dupKissp && !dupKissp.empty) throw new Error(`${kisspId} is already assigned to another supply partner.`);
  if (dupAadhar && !dupAadhar.empty) throw new Error("A supply partner with this Aadhar number already exists.");
  if (dupPan && !dupPan.empty) throw new Error("A supply partner with this PAN number already exists.");

  const ref = await addDoc(collection(db, COL), {
    kissp_id: kisspId,
    name: input.name.trim(),
    full_name: input.full_name?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    partner_type: input.partner_type || null,
    city_name: input.city_name?.trim() || null,
    aadhar_number: aadharNum,
    aadhar_name: input.aadhar_name?.trim() || null,
    aadhar_dob: input.aadhar_dob?.trim() || null,
    aadhar_address: input.aadhar_address?.trim() || null,
    pan_number: panNum,
    pan_name: input.pan_name?.trim() || null,
    bank_account_name: input.bank_account_name?.trim() || null,
    bank_name: input.bank_name?.trim() || null,
    bank_account_number: input.bank_account_number?.trim() || null,
    bank_ifsc: input.bank_ifsc?.trim() || null,
    bank_branch_name: input.bank_branch_name?.trim() || null,
    bank_account_type: input.bank_account_type || null,
    company_name: input.company_name?.trim() || null,
    company_gst: input.company_gst?.trim() || null,
    is_deleted: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Combined: create agency record + Firebase Auth user in one go.
 * The user's email/password become the agency's sign-in credentials.
 */
export async function createAgencyWithUser(input: Parameters<typeof createAgency>[0] & {
  password: string;
}): Promise<string> {
  const { password, ...agencyData } = input;
  const agencyId = await createAgency(agencyData);
  await createAgencyUser({
    email: input.email!,
    password,
    agency_id: agencyId,
  });
  return agencyId;
}

/** Update editable fields on an agency. Stamps updated_at. */
export async function updateAgency(
  id: string,
  data: Partial<{
    kissp_id: string | null;
    name: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    partner_type: string | null;
    city_name: string | null;
    aadhar_number: string | null;
    aadhar_name: string | null;
    aadhar_dob: string | null;
    aadhar_address: string | null;
    pan_number: string | null;
    pan_name: string | null;
    bank_account_name: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_ifsc: string | null;
    bank_branch_name: string | null;
    bank_account_type: string | null;
    company_name: string | null;
    company_gst: string | null;
  }>
) {
  const str = (v?: string | null) => v?.trim() || null;
  const newKissp = data.kissp_id !== undefined ? str(data.kissp_id) : undefined;
  const newAadhar = data.aadhar_number !== undefined ? str(data.aadhar_number) : undefined;
  const newPan = data.pan_number !== undefined ? str(data.pan_number) : undefined;

  const [dupKissp, dupAadhar, dupPan] = await Promise.all([
    newKissp ? getDocs(query(collection(db, COL), where("kissp_id", "==", newKissp))) : Promise.resolve(null),
    newAadhar ? getDocs(query(collection(db, COL), where("aadhar_number", "==", newAadhar))) : Promise.resolve(null),
    newPan ? getDocs(query(collection(db, COL), where("pan_number", "==", newPan))) : Promise.resolve(null),
  ]);
  if (dupKissp && dupKissp.docs.some((d) => d.id !== id))
    throw new Error(`${newKissp} is already assigned to another supply partner.`);
  if (dupAadhar && dupAadhar.docs.some((d) => d.id !== id))
    throw new Error("A supply partner with this Aadhar number already exists.");
  if (dupPan && dupPan.docs.some((d) => d.id !== id))
    throw new Error("A supply partner with this PAN number already exists.");

  const payload: Record<string, any> = { updated_at: serverTimestamp() };
  if (newKissp !== undefined) payload.kissp_id = newKissp;
  if (data.name !== undefined) payload.name = data.name!.trim();
  if (data.full_name !== undefined) payload.full_name = str(data.full_name);
  if (data.email !== undefined) payload.email = str(data.email);
  if (data.phone !== undefined) payload.phone = str(data.phone);
  if (data.partner_type !== undefined) payload.partner_type = data.partner_type || null;
  if (data.city_name !== undefined) payload.city_name = str(data.city_name);
  if (newAadhar !== undefined) payload.aadhar_number = newAadhar;
  if (data.aadhar_name !== undefined) payload.aadhar_name = str(data.aadhar_name);
  if (data.aadhar_dob !== undefined) payload.aadhar_dob = str(data.aadhar_dob);
  if (data.aadhar_address !== undefined) payload.aadhar_address = str(data.aadhar_address);
  if (newPan !== undefined) payload.pan_number = newPan;
  if (data.pan_name !== undefined) payload.pan_name = str(data.pan_name);
  if (data.bank_account_name !== undefined) payload.bank_account_name = str(data.bank_account_name);
  if (data.bank_name !== undefined) payload.bank_name = str(data.bank_name);
  if (data.bank_account_number !== undefined) payload.bank_account_number = str(data.bank_account_number);
  if (data.bank_ifsc !== undefined) payload.bank_ifsc = str(data.bank_ifsc);
  if (data.bank_branch_name !== undefined) payload.bank_branch_name = str(data.bank_branch_name);
  if (data.bank_account_type !== undefined) payload.bank_account_type = data.bank_account_type || null;
  if (data.company_name !== undefined) payload.company_name = str(data.company_name);
  if (data.company_gst !== undefined) payload.company_gst = str(data.company_gst);
  await updateDoc(doc(db, COL, id), payload);
}

/**
 * Soft-delete (deactivate) an agency. Data for candidates/projects/assignments
 * is intentionally NOT touched so admins retain full historical visibility.
 */
export async function softDeleteAgency(id: string) {
  await updateDoc(doc(db, COL, id), {
    is_deleted: true,
    updated_at: serverTimestamp(),
  });
}

/** Reactivate a previously soft-deleted agency. */
export async function restoreAgency(id: string) {
  await updateDoc(doc(db, COL, id), {
    is_deleted: false,
    updated_at: serverTimestamp(),
  });
}

/**
 * Creates a Firebase Auth user for an agency, then writes their /users/{uid}
 * profile doc. Uses a SECONDARY Firebase app instance so the currently
 * signed-in admin's session is not replaced.
 */
export async function createAgencyUser(params: {
  email: string;
  password: string;
  agency_id: string;
}) {
  const primary = getApp();
  const secondaryName = "secondary-agency-user-create";
  const secondaryApp =
    getApps().find((a) => a.name === secondaryName) ??
    initializeApp(primary.options, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      params.email.trim(),
      params.password
    );
    await setDoc(doc(db, "users", cred.user.uid), {
      email: params.email.trim(),
      role: "agency",
      agency_id: params.agency_id,
      created_at: serverTimestamp(),
    });
    // sign the secondary instance out so its credentials aren't held in memory
    await signOut(secondaryAuth);
  } finally {
    // best-effort cleanup; safe to ignore failure
    try {
      await deleteApp(secondaryApp);
    } catch {
      /* noop */
    }
  }
}

/** Admin-only: load a single agency by id. */
export function useAgency(agencyId: string | undefined) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) {
      setAgency(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, COL, agencyId))
      .then((snap) => {
        if (cancelled) return;
        setAgency(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Agency) : null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [agencyId]);

  return { agency, loading };
}

/** Admin-only: live data for ONE agency (projects, candidates, assignments, users). */
export function useAgencyData(agencyId: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) {
      setProjects([]); setCandidates([]); setAssignments([]); setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let p = false, c = false, a = false, u = false;
    const done = () => { if (p && c && a && u) setLoading(false); };

    // Fetch ALL projects so cross-agency assignments (e.g. agency candidate
    // assigned to an admin-owned project) can resolve their project name.
    const unsubP = onSnapshot(
      collection(db, "projects"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Project[];
        list.sort((x, y) => ((y.created_at as any)?.toMillis?.() ?? 0) - ((x.created_at as any)?.toMillis?.() ?? 0));
        setProjects(list);
        p = true; done();
      },
      () => { p = true; done(); }
    );
    const unsubC = onSnapshot(
      query(collection(db, "candidates"), where("agency_id", "==", agencyId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Candidate[];
        list.sort((x, y) => ((y.created_at as any)?.toMillis?.() ?? 0) - ((x.created_at as any)?.toMillis?.() ?? 0));
        setCandidates(list);
        c = true; done();
      },
      () => { c = true; done(); }
    );
    // Fetch ALL assignments and filter to this agency's candidates client-side.
    // Doing it this way catches assignments whose own agency_id has drifted
    // (e.g. assigned to a project owned by admin or another agency) so the
    // candidate's true assignment status is always reflected.
    const unsubA = onSnapshot(
      collection(db, "assignments"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Assignment[];
        list.sort((x, y) => ((y.assigned_at as any)?.toMillis?.() ?? 0) - ((x.assigned_at as any)?.toMillis?.() ?? 0));
        setAssignments(list);
        a = true; done();
      },
      () => { a = true; done(); }
    );
    const unsubU = onSnapshot(
      query(collection(db, "users"), where("agency_id", "==", agencyId)),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AppUser[]);
        u = true; done();
      },
      () => { u = true; done(); }
    );

    return () => { unsubP(); unsubC(); unsubA(); unsubU(); };
  }, [agencyId]);

  return { projects, candidates, assignments, users, loading };
}
