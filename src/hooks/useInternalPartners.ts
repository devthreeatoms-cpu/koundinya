import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, serverTimestamp,
  doc, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { InternalPartner } from "@/types";

const COL = "internal_partners";

export function useInternalPartners(opts: { includeDeleted?: boolean } = {}) {
  const includeDeleted = !!opts.includeDeleted;
  const [partners, setPartners] = useState<InternalPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COL),
      (snap) => {
        let list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as any) })
        ) as InternalPartner[];
        if (!includeDeleted) list = list.filter((p) => !p.is_deleted);
        list.sort(
          (x, y) =>
            ((y.created_at as any)?.toMillis?.() ?? 0) -
            ((x.created_at as any)?.toMillis?.() ?? 0)
        );
        setPartners(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [includeDeleted]);

  return { partners, loading };
}

export async function createInternalPartner(input: {
  full_name: string;
  position: string;
  phone: string;
  employee_id: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    full_name: input.full_name.trim(),
    position: input.position.trim(),
    phone: input.phone.trim(),
    employee_id: input.employee_id.trim(),
    is_deleted: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateInternalPartner(
  id: string,
  data: { full_name?: string; position?: string; phone?: string; employee_id?: string }
) {
  const payload: Record<string, any> = { updated_at: serverTimestamp() };
  if (data.full_name !== undefined) payload.full_name = data.full_name.trim();
  if (data.position !== undefined) payload.position = data.position.trim();
  if (data.phone !== undefined) payload.phone = data.phone.trim();
  if (data.employee_id !== undefined) payload.employee_id = data.employee_id.trim();
  await updateDoc(doc(db, COL, id), payload);
}

export async function softDeleteInternalPartner(id: string) {
  await updateDoc(doc(db, COL, id), {
    is_deleted: true,
    updated_at: serverTimestamp(),
  });
}

export async function restoreInternalPartner(id: string) {
  await updateDoc(doc(db, COL, id), {
    is_deleted: false,
    updated_at: serverTimestamp(),
  });
}
