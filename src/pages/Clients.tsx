import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { deleteDoc, doc } from "firebase/firestore";
import {
  Plus,
  UsersRound,
  Loader2,
  Pencil,
  Trash2,
  MapPin,
  FileText,
  Search,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useClients, createClient, updateClient } from "@/hooks/useClients";
import { formatDate } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import type { Client } from "@/types";

const clientSchema = z.object({
  name: z.string().trim().min(2, "Client name is required").max(100),
  company_name: z.string().trim().min(2, "Company name is required").max(150),
  company_address: z.string().trim().min(5, "Address is required").max(500),
  gst_number: z.string().trim().min(1, "GST details are required").max(50),
});

type ClientForm = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { clients, loading: cLoading } = useClients();

  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.company_name.toLowerCase().includes(term) ||
        c.gst_number.toLowerCase().includes(term)
    );
  }, [clients, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage client companies and their GST details."
        actions={
          <Button variant="premium" onClick={() => { setEditClient(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> <span className="truncate">Add client</span>
          </Button>
        }
      />

      {/* Search */}
      <Card className="glass-card p-4 sm:p-5 hover-lift">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search by client name, company, or GST number…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {cLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-16 text-center hover-lift">
          <div className="h-16 w-16 rounded-2xl bg-gradient-soft mx-auto mb-4 grid place-items-center">
            <UsersRound className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">
            {search.trim() ? "No clients match your search" : "No clients yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {search.trim()
              ? "Try adjusting your search term."
              : "Add your first client to use them when creating projects."}
          </p>
          {!search.trim() && (
            <Button variant="premium" className="mt-5" onClick={() => { setEditClient(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Add client
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="glass-card p-5 hover-lift relative group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-sm">
                  <UsersRound className="h-5 w-5" />
                </div>
              </div>

              <h3 className="font-semibold tracking-tight text-base mt-4 break-words group-hover:text-primary transition-colors">
                {c.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 break-words">
                {c.company_name}
              </p>

              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="inline-flex items-start gap-1.5 break-words">
                  <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                  <span className="break-words">{c.company_address}</span>
                </p>
                <p className="inline-flex items-center gap-1.5">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="font-mono tracking-wide">{c.gst_number}</span>
                </p>
                <p>Added {formatDate((c.created_at as any)?.toDate?.()) || "—"}</p>
              </div>

              {/* Action row */}
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2.5"
                  aria-label="Edit client"
                  onClick={() => setEditClient(c)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Delete client"
                  onClick={() => setDeleteClient(c)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ClientFormModal
        open={modalOpen || !!editClient}
        onOpenChange={(o) => {
          if (!o) { setModalOpen(false); setEditClient(null); }
        }}
        client={editClient}
      />

      <DeleteClientDialog
        client={deleteClient}
        onOpenChange={(o) => {
          if (!o) setDeleteClient(null);
        }}
      />
    </div>
  );
}

function ClientFormModal({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: Client | null;
}) {
  const { toast } = useToast();
  const isEdit = !!client;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", company_name: "", company_address: "", gst_number: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: client?.name ?? "",
        company_name: client?.company_name ?? "",
        company_address: client?.company_address ?? "",
        gst_number: client?.gst_number ?? "",
      });
    }
  }, [open, client, reset]);

  async function onSubmit(values: ClientForm) {
    try {
      if (isEdit && client) {
        await updateClient(client.id, values);
        toast({ title: "Client updated" });
      } else {
        await createClient(values);
        toast({ title: "Client created" });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "Something went wrong",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update client details."
              : "Add a new client to use when creating projects."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Client name</Label>
            <Input id="name" className="mt-1.5" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="company_name">Company name</Label>
            <Input id="company_name" className="mt-1.5" {...register("company_name")} />
            {errors.company_name && (
              <p className="text-xs text-destructive mt-1">{errors.company_name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="company_address">Company address</Label>
            <Input id="company_address" className="mt-1.5" {...register("company_address")} />
            {errors.company_address && (
              <p className="text-xs text-destructive mt-1">{errors.company_address.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="gst_number">GST number</Label>
            <Input id="gst_number" className="mt-1.5 font-mono" {...register("gst_number")} />
            {errors.gst_number && (
              <p className="text-xs text-destructive mt-1">{errors.gst_number.message}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteClientDialog({
  client,
  onOpenChange,
}: {
  client: Client | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!client) return;
    setSubmitting(true);
    try {
      const { db } = await import("@/lib/firebase");
      await deleteDoc(doc(db, "clients", client.id));
      toast({ title: "Client deleted", description: `${client.name} has been removed.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!client} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client?</AlertDialogTitle>
          <AlertDialogDescription>
            {client ? (
              <>
                <span className="font-medium text-foreground">{client.name}</span> ({client.company_name}) will be permanently deleted.
                Projects linked to this client will keep the client name but lose the link.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
