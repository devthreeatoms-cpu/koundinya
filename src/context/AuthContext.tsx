import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, UserRole } from "@/types";

/**
 * Hard-coded admin emails. Any user signing in with one of these emails
 * is auto-bootstrapped into the `users` collection with role: "admin"
 * (only if no profile doc exists for them yet).
 */
const ADMIN_EMAILS = ["admin@gmail.com"];

interface AuthContextValue {
  user: User | null;
  profile: AppUser | null;
  role: UserRole | null;
  agencyId: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) setProfile(null);
    });
    return () => unsub();
  }, []);

  // Subscribe to /users/{uid} profile doc.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setProfile({
            id: snap.id,
            email: data.email ?? user.email ?? "",
            role: (data.role as UserRole) ?? "agency",
            agency_id: data.agency_id ?? null,
            created_at: data.created_at ?? null,
          });
          setProfileLoading(false);
          return;
        }

        // No profile doc yet.
        // 1. If this user's email is in the admin allow-list, auto-create
        //    an admin profile so they get full access immediately.
        const email = (user.email ?? "").toLowerCase();
        if (email && ADMIN_EMAILS.includes(email)) {
          try {
            await setDoc(ref, {
              email,
              role: "admin",
              agency_id: null,
              created_at: serverTimestamp(),
            });
            // The onSnapshot above will fire again with the new doc.
            return;
          } catch {
            // fall through to default below
          }
        }

        // 2. Otherwise treat as an agency user with no agency_id (sees nothing
        //    until an admin assigns them via the Agencies page).
        setProfile({
          id: user.uid,
          email: user.email ?? "",
          role: "agency",
          agency_id: null,
        });
        setProfileLoading(false);
      },
      () => setProfileLoading(false)
    );
    return () => unsub();
  }, [user]);

  // If the signed-in agency user's agency gets soft-deleted while logged in,
  // immediately sign them out. Admins are unaffected.
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role === "admin") return;
    if (!profile.agency_id) return;
    const unsub = onSnapshot(
      doc(db, "agencies", profile.agency_id),
      (snap) => {
        if (snap.exists() && (snap.data() as any).is_deleted) {
          signOut(auth).catch(() => {/* noop */});
        }
      }
    );
    return () => unsub();
  }, [user, profile]);

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Block deactivated-agency users immediately. Admins are always allowed.
    try {
      const profileSnap = await getDoc(doc(db, "users", cred.user.uid));
      const data = profileSnap.exists() ? (profileSnap.data() as any) : null;
      const role: UserRole = data?.role ?? "agency";
      const agencyId: string | null = data?.agency_id ?? null;
      if (role !== "admin" && agencyId) {
        const agSnap = await getDoc(doc(db, "agencies", agencyId));
        const ag = agSnap.exists() ? (agSnap.data() as any) : null;
        if (ag?.is_deleted) {
          await signOut(auth);
          throw new Error(
            "Your account is deactivated. Contact admin."
          );
        }
      }
    } catch (err: any) {
      if (err?.message === "Your account is deactivated. Contact admin.") {
        throw err;
      }
      // Non-fatal lookup failure: allow sign-in to proceed.
    }
  }
  async function logout() {
    await signOut(auth);
  }

  const role = profile?.role ?? null;
  const agencyId = profile?.agency_id ?? null;
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        agencyId,
        isAdmin,
        loading: loading || (!!user && profileLoading && !profile),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
