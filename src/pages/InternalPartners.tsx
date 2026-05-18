import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  UserCog,
  Loader2,
  Pencil,
  Trash2,
  RotateCcw,
  Phone as PhoneIcon,
  BadgeCheck,
  Briefcase,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import {
  useInternalPartners,
  createInternalPartner,
  updateInternalPartner,
  softDeleteInternalPartner,
  restoreInternalPartner,
} from "@/hooks/useInternalPartners";
import { formatDate } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import type { InternalPartner } from "@/types";

const partnerSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  position: z.string().trim().min(1, "Position is required").max(100),
  phone: z.string().trim().min(6, "Phone is required").max(30),
  employee_id: z.string().trim().min(1, "Employee ID is required").max(50),
});
type PartnerForm = z.infer<typeof partnerSchema>;

export default function InternalPartnersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [showInactive, setShowInactive] = useState(false);
  const { partners, loading } = useInternalPartners({ includeDeleted: showInactive });

  const [addOpen, setAddOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<InternalPartner | null>(null);
  const [deletePartner, setDeletePartner] = useState<InternalPartner | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Team"
        description="Manage internal team members who operate the platform on behalf of the organisation."
        actions={
          <Button variant="premium" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> <span className="truncate">Add member</span>
          </Button>
        }
      />

      {/* Filter toggle */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 sm:px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Show inactive members</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
            Deactivated members are preserved in the database but cannot be assigned.
          </p>
        </div>
        <Switch
          checked={showInactive}
          onCheckedChange={setShowInactive}
          aria-label="Show inactive members"
          className="shrink-0"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : partners.length === 0 ? (
        <Card className="glass-card p-16 text-center hover-lift">
          <div className="h-16 w-16 rounded-2xl bg-gradient-soft mx-auto mb-4 grid place-items-center">
            <UserCog className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">
            {showInactive ? "No team members found" : "No active team members"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {showInactive
              ? "Add your first internal team member to get started."
              : "Toggle \"Show inactive\" to see deactivated members, or add a new one."}
          </p>
          <Button variant="premium" className="mt-5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add member
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => {
            const inactive = !!p.is_deleted;
            return (
              <Card
                key={p.id}
                className={cn(
                  "glass-card p-5 hover-lift",
                  inactive && "opacity-75"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "h-11 w-11 rounded-xl text-white grid place-items-center shadow-sm shrink-0",
                      inactive ? "bg-muted-foreground/60" : "bg-gradient-brand"
                    )}
                  >
                    <UserCog className="h-5 w-5" />
                  </div>
                  {inactive && (
                    <Badge
                      variant="outline"
                      className="border-muted-foreground/30 text-muted-foreground bg-muted/40"
                    >
                      Inactive
                    </Badge>
                  )}
                </div>

                <h3
                  className={cn(
                    "font-semibold tracking-tight text-base mt-4 break-words",
                    inactive && "text-muted-foreground"
                  )}
                >
                  {p.full_name}
                </h3>

                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 shrink-0" /> {p.position}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <PhoneIcon className="h-3 w-3 shrink-0" /> {p.phone}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="h-3 w-3 shrink-0" /> ID: {p.employee_id}
                  </p>
                  <p>Added {formatDate((p.created_at as any)?.toDate?.()) || "—"}</p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2.5"
                    aria-label="Edit member"
                    onClick={() => setEditPartner(p)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {inactive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2.5 text-primary hover:text-primary hover:bg-primary/10"
                      aria-label="Reactivate member"
                      onClick={async () => {
                        try { await restoreInternalPartner(p.id); } catch {/* noop */}
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label="Deactivate member"
                      onClick={() => setDeletePartner(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddPartnerDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditPartnerDialog
        partner={editPartner}
        onOpenChange={(open) => { if (!open) setEditPartner(null); }}
      />
      <DeactivatePartnerDialog
        partner={deletePartner}
        onOpenChange={(open) => { if (!open) setDeletePartner(null); }}
      />
    </div>
  );
}

function AddPartnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { full_name: "", position: "", phone: "", employee_id: "" },
  });

  async function onSubmit(values: PartnerForm) {
    try {
      await createInternalPartner(values);
      toast({ title: "Team member added" });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not add member",
        description: err?.message ?? "Something went wrong",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Add an internal team member. They can add candidates, create projects, clients, and assign candidates to projects.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" placeholder="e.g. Ravi Kumar" className="mt-1.5" {...register("full_name")} />
            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Input id="position" placeholder="e.g. Operations Manager" className="mt-1.5" {...register("position")} />
            {errors.position && <p className="text-xs text-destructive mt-1">{errors.position.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" placeholder="+91 98765 43210" className="mt-1.5" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <Label htmlFor="employee_id">Employee ID</Label>
            <Input id="employee_id" placeholder="e.g. EMP-001" className="mt-1.5" {...register("employee_id")} />
            {errors.employee_id && <p className="text-xs text-destructive mt-1">{errors.employee_id.message}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPartnerDialog({
  partner,
  onOpenChange,
}: {
  partner: InternalPartner | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { full_name: "", position: "", phone: "", employee_id: "" },
  });

  useEffect(() => {
    if (partner) {
      reset({
        full_name: partner.full_name ?? "",
        position: partner.position ?? "",
        phone: partner.phone ?? "",
        employee_id: partner.employee_id ?? "",
      });
    }
  }, [partner, reset]);

  async function onSubmit(values: PartnerForm) {
    if (!partner) return;
    try {
      await updateInternalPartner(partner.id, values);
      toast({ title: "Member updated" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={!!partner} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit team member</DialogTitle>
          <DialogDescription>Update this member's details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="edit-full_name">Full name</Label>
            <Input id="edit-full_name" className="mt-1.5" {...register("full_name")} />
            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="edit-position">Position</Label>
            <Input id="edit-position" className="mt-1.5" {...register("position")} />
            {errors.position && <p className="text-xs text-destructive mt-1">{errors.position.message}</p>}
          </div>
          <div>
            <Label htmlFor="edit-phone">Phone number</Label>
            <Input id="edit-phone" className="mt-1.5" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <Label htmlFor="edit-employee_id">Employee ID</Label>
            <Input id="edit-employee_id" className="mt-1.5" {...register("employee_id")} />
            {errors.employee_id && <p className="text-xs text-destructive mt-1">{errors.employee_id.message}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeactivatePartnerDialog({
  partner,
  onOpenChange,
}: {
  partner: InternalPartner | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!partner) return;
    setSubmitting(true);
    try {
      await softDeleteInternalPartner(partner.id);
      toast({ title: "Member deactivated", description: `${partner.full_name} has been marked inactive.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!partner} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate this team member?</AlertDialogTitle>
          <AlertDialogDescription>
            {partner && (
              <>
                <span className="font-medium text-foreground">{partner.full_name}</span> will be marked
                inactive. Their record is preserved and can be reactivated at any time.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
