import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, where,
  doc, setDoc, getDoc,
} from "firebase/firestore";
import { initializeApp, getApp, deleteApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { Agency, AppUser, Candidate, Project, Assignment } from "@/types";

const COL = "agencies";

/** Live list of all agencies (admin-only consumer). */
export function useAgencies() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COL), orderBy("created_at", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAgencies(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Agency[]
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

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

export async function createAgency(name: string): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    name: name.trim(),
    created_at: serverTimestamp(),
  });
  return ref.id;
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
