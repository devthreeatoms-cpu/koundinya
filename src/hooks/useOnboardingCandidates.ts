import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendAppEmail } from "@/lib/resend-client";
import type { Candidate, OnboardingCandidate } from "@/types";
import { assignCandidates } from "@/hooks/useAssignments";
import { updateCandidate } from "@/hooks/useCandidates";

const COL = "onboarding_candidates";

export function useOnboardingCandidates(projectId?: string) {
  const [items, setItems] = useState<OnboardingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    const q = query(collection(db, COL), where("project_id", "==", projectId));
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OnboardingCandidate[];
        list.sort((a, b) => ((b.created_at as any)?.toMillis?.() ?? 0) - ((a.created_at as any)?.toMillis?.() ?? 0));
        setItems(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err?.message ?? "Failed to load onboarding candidates.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [projectId]);

  return { items, loading, error };
}

/**
 * Live onboarding records for a single candidate (across every project they
 * have been onboarded to). Used by the candidate detail history.
 */
export function useOnboardingByCandidate(candidateId?: string) {
  const [items, setItems] = useState<OnboardingCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, COL), where("candidate_id", "==", candidateId));
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OnboardingCandidate[];
        list.sort((a, b) => ((b.created_at as any)?.toMillis?.() ?? 0) - ((a.created_at as any)?.toMillis?.() ?? 0));
        setItems(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [candidateId]);

  return { items, loading };
}

export function useAllOnboardingCandidates() {
  const [items, setItems] = useState<OnboardingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, COL));
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OnboardingCandidate[];
        list.sort((a, b) => ((b.created_at as any)?.toMillis?.() ?? 0) - ((a.created_at as any)?.toMillis?.() ?? 0));
        setItems(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err?.message ?? "Failed to load onboarding candidates.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { items, loading, error };
}

export async function addCandidatesToOnboarding(
  projectId: string,
  candidateIds: string[],
  ctx?: { userId?: string | null; agency_id?: string | null }
) {
  if (candidateIds.length === 0) return;
  let inserted = 0;

  const existing = await getDocs(query(collection(db, COL), where("project_id", "==", projectId)));
  const existingIds = new Set(
    existing.docs
      .map((d) => (d.data() as any).candidate_id)
      .filter(Boolean)
  );

  for (const candidateId of candidateIds) {
    if (existingIds.has(candidateId)) continue;
    const candidateSnap = await getDoc(doc(db, "candidates", candidateId));
    const candAgencyId = candidateSnap.exists()
      ? ((candidateSnap.data() as any).agency_id ?? null)
      : null;
    const writeAgencyId = ctx?.agency_id !== undefined ? ctx.agency_id : candAgencyId;
    await addDoc(collection(db, COL), {
      project_id: projectId,
      candidate_id: candidateId,
      agency_id: writeAgencyId,
      onboarding_status: "New",
      notes: null,
      status: "Onboarding",
      moved_to_project_at: null,
      assignment_id: null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: ctx?.userId ?? null,
      updated_by: ctx?.userId ?? null,
    });
    inserted++;
  }
  return inserted;
}

export async function updateOnboardingEntry(
  id: string,
  payload: Partial<Pick<OnboardingCandidate, "onboarding_status" | "notes">>,
  ctx?: { userId?: string | null }
) {
  await updateDoc(doc(db, COL, id), {
    ...payload,
    updated_at: serverTimestamp(),
    updated_by: ctx?.userId ?? null,
  });
}

/**
 * Removes a candidate from a project's onboarding by deleting the junction
 * record. (Admins / internal team only — enforced by security rules.)
 */
export async function deleteOnboardingEntry(id: string) {
  await deleteDoc(doc(db, COL, id));
}

function isFullyKyc(candidate: Candidate) {
  const hasAadhar = !!candidate.aadhar_number;
  const hasPan = !!candidate.pan_number;
  const aadharVerified = candidate.aadhar_verified !== false;
  const panVerified = candidate.pan_verified !== false;
  const hasBankDetails = !!candidate.bank_account_number && !!candidate.bank_ifsc;
  return hasAadhar && hasPan && aadharVerified && panVerified && hasBankDetails;
}

async function notifyProjectAssignment(candidate: Candidate, projectName: string) {
  const email = candidate.email?.trim();
  if (!email) return;

  const safeName = candidate.name?.trim() || "Candidate";
  const safeProject = projectName.trim() || "your project";
  const subject = `You have been assigned to ${safeProject}`;
  const text = [
    `Hello ${safeName},`,
    "",
    `You have been assigned to the project "${safeProject}".`,
    "",
    "If you have any doubts, please contact the team.",
  ].join("\n");
  const html = `
    <p>Hello ${safeName},</p>
    <p>You have been assigned to the project "<strong>${safeProject}</strong>".</p>
    <p>If you have any doubts, please contact the team.</p>
  `;

  await sendAppEmail({ to: email, subject, text, html });
}

export async function moveOnboardedToProject(params: {
  projectId: string;
  onboardingIds: string[];
  kisfsByCandidateId: Record<string, string>;
  userId?: string | null;
}) {
  const { projectId, onboardingIds, kisfsByCandidateId, userId } = params;
  if (onboardingIds.length === 0) return;
  const projectSnap = await getDoc(doc(db, "projects", projectId));
  const projectName = projectSnap.exists()
    ? ((projectSnap.data() as any).name ?? "your project")
    : "your project";

  for (const onboardingId of onboardingIds) {
    const onboardingSnap = await getDoc(doc(db, COL, onboardingId));
    if (!onboardingSnap.exists()) continue;
    const onboarding = { id: onboardingSnap.id, ...(onboardingSnap.data() as any) } as OnboardingCandidate;
    if (onboarding.project_id !== projectId) continue;
    if (onboarding.status === "MovedToProject") continue;
    if ((onboarding.onboarding_status || "").trim().toLowerCase() !== "ready for project") continue;

    const candidateSnap = await getDoc(doc(db, "candidates", onboarding.candidate_id));
    if (!candidateSnap.exists()) throw new Error("Candidate not found.");
    const candidate = { id: candidateSnap.id, ...(candidateSnap.data() as any) } as Candidate;

    if (!candidate.email?.trim()) {
      throw new Error(`Candidate ${candidate.name} has no email. Add an email before assigning to a project.`);
    }

    if (!isFullyKyc(candidate)) {
      throw new Error(`Candidate ${candidate.name} does not have fully verified KYC or is missing bank details.`);
    }

    const kisfsId = kisfsByCandidateId[candidate.id];
    if (!kisfsId) throw new Error(`Missing KISFS ID for ${candidate.name}.`);

    await updateCandidate(candidate.id, { kisfs_id: kisfsId });
    await assignCandidates(projectId, [candidate.id]);

    await updateDoc(doc(db, COL, onboarding.id), {
      status: "MovedToProject",
      assignment_id: null,
      moved_to_project_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      updated_by: userId ?? null,
    });

    try {
      await notifyProjectAssignment(candidate, projectName);
    } catch (err) {
      console.warn("Project assignment email failed:", err);
    }
  }
}

export async function resetOnboardingAfterProjectRemoval(params: {
  projectId: string;
  candidateId: string;
  userId?: string | null;
}) {
  const { projectId, candidateId, userId } = params;
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("project_id", "==", projectId),
      where("candidate_id", "==", candidateId)
    )
  );
  if (snap.empty) return;

  for (const d of snap.docs) {
    await updateDoc(doc(db, COL, d.id), {
      status: "Onboarding",
      moved_to_project_at: null,
      assignment_id: null,
      updated_at: serverTimestamp(),
      updated_by: userId ?? null,
    });
  }
}

export function getNextKisfsSuffix(candidates: Candidate[]) {
  const used = new Set<number>();
  for (const c of candidates) {
    const m = (c.kisfs_id ?? "").match(/^KISFS(\d{3,4})$/);
    if (m) used.add(Number(m[1]));
  }
  for (let n = 170; n <= 9999; n++) {
    if (!used.has(n)) return String(n);
  }
  return "170";
}

export function useTakenKisfsSet(candidates: Candidate[]) {
  return useMemo(() => {
    const s = new Set<string>();
    for (const c of candidates) {
      if (c.kisfs_id) s.add(c.kisfs_id.toUpperCase());
    }
    return s;
  }, [candidates]);
}
