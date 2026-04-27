import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, UserRole } from "@/types";

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
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setProfile({
            id: snap.id,
            email: data.email ?? user.email ?? "",
            role: (data.role as UserRole) ?? "agency",
            agency_id: data.agency_id ?? null,
            created_at: data.created_at ?? null,
          });
        } else {
          // No profile doc yet — treat as agency with no agency_id (will see no data).
          setProfile({
            id: user.uid,
            email: user.email ?? "",
            role: "agency",
            agency_id: null,
          });
        }
        setProfileLoading(false);
      },
      () => setProfileLoading(false)
    );
    return () => unsub();
  }, [user]);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
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
