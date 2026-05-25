import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, doc, getDoc, serverTimestamp,
  query, where, getDocs, QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment } from "@/types";
import { useAuth } from "@/context/AuthContext";

const COL = "assignments";

export function useAssignments(filter?: {
  project_id?: string;
  candidate_id?: string;
  /**
   * When true, skip the admin/agency ownership filter. Use ONLY when the
   * caller is already scoped by a specific project_id or candidate_id that
   * the user has legitimate access to (e.g. admin drilling into an
   * agency-owned project from /agencies/:id → /projects/:id).
   */
  bypassOwnerFilter?: boolean;
}) {
  const { isAdmin, isInternal, agencyId, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Internal team members have the same assignment visibility as admins.
  const hasFullAccess = isAdmin || isInternal;

  useEffect(() => {
    if (authLoading) { setLoading(true); return; }
    if (!hasFullAccess && !agencyId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    const base = collection(db, COL);
    const constraints: QueryConstraint[] = [];
    if (filter?.project_id) constraints.push(where("project_id", "==", filter.project_id));
    if (filter?.candidate_id) constraints.push(where("candidate_id", "==", filter.candidate_id));
    if (!filter?.bypassOwnerFilter && !hasFullAccess) {
      // Supply partners see only their own assignments.
      constraints.push(where("agency_id", "==", agencyId));
    }
    const q = query(base, ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Assignment[];
        list.sort((a, b) => {
          const ta = (a.assigned_at as any)?.toMillis?.() ?? 0;
          const tb = (b.assigned_at as any)?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setAssignments(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.project_id, filter?.candidate_id, filter?.bypassOwnerFilter, hasFullAccess, agencyId, authLoading]);

  return { assignments, loading };
}

export async function assignCandidates(
  projectId: string,
  candidateIds: string[],
  // ctx kept for backwards compatibility, but the assignment's agency_id is
  // ALWAYS derived from the candidate so candidate ↔ assignment ownership
  // can never drift.
  _ctx?: { agency_id?: string | null }
) {
  // Fetch project details to include the project name in the email
  const projSnap = await getDoc(doc(db, "projects", projectId));
  const projData = projSnap.exists() ? (projSnap.data() as any) : null;
  const projectName = projData?.name || "a project";

  for (const cid of candidateIds) {
    // check no active assignment
    const existing = await getDocs(
      query(
        collection(db, COL),
        where("candidate_id", "==", cid),
        where("status", "==", "Active")
      )
    );
    if (!existing.empty) continue; // skip already-active candidates

    // Derive agency_id from the candidate so assignment.agency_id always
    // matches candidate.agency_id (admin pool => null, agency => agency id).
    const candSnap = await getDoc(doc(db, "candidates", cid));
    const candData = candSnap.exists() ? (candSnap.data() as any) : null;
    const candAgencyId = candData?.agency_id ?? null;

    await addDoc(collection(db, COL), {
      candidate_id: cid,
      project_id: projectId,
      status: "Active",
      assigned_at: serverTimestamp(),
      removed_at: null,
      agency_id: candAgencyId,
    });

    // Send email notification to the candidate
    if (candData?.email) {
      try {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: candData.email,
            subject: "Project Assignment Notification",
            html: `<p>Hello ${candData.name || "Candidate"},</p>
                   <p>You have been assigned to the project: <strong>${projectName}</strong>.</p>
                   <p>Please log in or contact your administrator for more details.</p>`,
          }),
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error("API Error Response:", errData);
          if (response.status === 404) {
            window.alert("Email failed to send locally. Make sure you run 'npx vercel dev' instead of 'npm run dev' to test emails.");
          } else {
            window.alert(`Email API failed with status ${response.status}`);
          }
        }
      } catch (err) {
        console.error("Failed to send assignment email to candidate:", err);
        window.alert("Network error: Failed to send assignment email.");
      }
    }
  }
}

export async function removeAssignment(assignmentId: string, status: "Completed" | "Dropped" = "Completed") {
  await updateDoc(doc(db, COL, assignmentId), {
    status,
    removed_at: serverTimestamp(),
  });
}

export async function updateAssignmentProjectStatus(assignmentId: string, projectStatus: string | null) {
  await updateDoc(doc(db, COL, assignmentId), { project_status: projectStatus });
}
