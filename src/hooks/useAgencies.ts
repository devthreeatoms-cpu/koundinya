import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, where,
  doc, setDoc, getDoc, updateDoc,
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
  name: string;
  email?: string | null;
  phone?: string | null;
}): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    is_deleted: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

/** Update editable fields on an agency. Stamps updated_at. */
export async function updateAgency(
  id: string,
  data: { name?: string; email?: string | null; phone?: string | null }
) {
  const payload: Record<string, any> = { updated_at: serverTimestamp() };
  if (typeof data.name === "string") payload.name = data.name.trim();
  if (data.email !== undefined) payload.email = data.email?.trim() || null;
  if (data.phone !== undefined) payload.phone = data.phone?.trim() || null;
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

    const unsubP = onSnapshot(
      query(collection(db, "projects"), where("agency_id", "==", agencyId)),
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
    const unsubA = onSnapshot(
      query(collection(db, "assignments"), where("agency_id", "==", agencyId)),
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
