import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Client } from "@/types";

const COL = "clients";

/**
 * Live list of all clients (admin-only consumer).
 */
export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COL), orderBy("created_at", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClients(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Client[]
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { clients, loading };
}

export async function createClient(input: {
  name: string;
  company_name: string;
  company_address: string;
  gst_number: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    name: input.name.trim(),
    company_name: input.company_name.trim(),
    company_address: input.company_address.trim(),
    gst_number: input.gst_number.trim().toUpperCase(),
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClient(
  id: string,
  data: Partial<Omit<Client, "id" | "created_at">>
) {
  const payload: Record<string, any> = {};
  if (typeof data.name === "string") payload.name = data.name.trim();
  if (typeof data.company_name === "string") payload.company_name = data.company_name.trim();
  if (typeof data.company_address === "string") payload.company_address = data.company_address.trim();
  if (typeof data.gst_number === "string") payload.gst_number = data.gst_number.trim().toUpperCase();
  await updateDoc(doc(db, COL, id), payload);
}
