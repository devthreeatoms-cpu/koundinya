import { useEffect, useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Building2,
  Loader2,
  Mail,
  Pencil,
  Trash2,
  Phone as PhoneIcon,
  RotateCcw,
  MapPin,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  useAgencies,
  createAgencyWithUser,
  softDeleteAgency,
  restoreAgency,
  updateAgencyEditPermission,
} from "@/hooks/useAgencies";
import { formatDate } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import type { Agency } from "@/types";
import EditPartnerDialog, {
  PartnerFormFields,
  EMPTY_BASE,
  PARTNER_TYPES,
} from "@/components/EditPartnerDialog";

const partnerSchema = z.object({
  // ID
  kissp_suffix: z.string().regex(/^\d{1,4}$/, "Must be 1–4 digits").optional().or(z.literal("")),
  // Basic
  name: z.string().trim().min(2, "Partner name is required").max(100),
  full_name: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  partner_type: z.string().optional().or(z.literal("")),
  city_name: z.string().trim().max(100).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  // Aadhaar
  aadhar_number: z.string().refine(val => !val || /^\d{12}$/.test(val), {
    message: "Must be exactly 12 digits",
  }).optional().or(z.literal("")),
  aadhar_name: z.string().trim().max(100).optional().or(z.literal("")),
  aadhar_dob: z.string().trim().max(50).optional().or(z.literal("")),
  aadhar_address: z.string().trim().max(500).optional().or(z.literal("")),
  // PAN
  pan_number: z.string().refine(val => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
    message: "Invalid PAN format (e.g. ABCDE1234F)",
  }).optional().or(z.literal("")),
  pan_name: z.string().trim().max(100).optional().or(z.literal("")),
  // Bank
  bank_account_name: z.string().trim().max(100).optional().or(z.literal("")),
  bank_name: z.string().trim().max(100).optional().or(z.literal("")),
  bank_account_number: z.string().refine(val => !val || /^\d{9,18}$/.test(val), {
    message: "Must be 9–18 digits",
  }).optional().or(z.literal("")),
  bank_ifsc: z.string().refine(val => !val || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val), {
    message: "Invalid IFSC (e.g. SBIN0001234)",
  }).optional().or(z.literal("")),
  bank_branch_name: z.string().trim().max(100).optional().or(z.literal("")),
  bank_account_type: z.string().optional().or(z.literal("")),
  // Company
  company_name: z.string().trim().max(100).optional().or(z.literal("")),
  company_gst: z.string().trim().max(50).optional().or(z.literal("")),
});

type PartnerForm = z.infer<typeof partnerSchema>;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AgenciesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [showInactive, setShowInactive] = useState(true);
  const { agencies, loading: aLoading } = useAgencies({ includeDeleted: showInactive, isInternal: false });

  const [agencyOpen, setAgencyOpen] = useState(false);
  const [editAgency, setEditAgency] = useState<Agency | null>(null);
  const [deleteAgency, setDeleteAgency] = useState<Agency | null>(null);

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
        title="Supply Partners"
        description="Create supply partners with sign-in credentials. Each supply partner only sees its own data."
        actions={
          <Button variant="premium" onClick={() => setAgencyOpen(true)}>
            <Plus className="h-4 w-4" /> <span className="truncate">New supply partner</span>
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 sm:px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Show inactive supply partners</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
            Deactivated supply partners stay in the database with all their data preserved.
          </p>
        </div>
        <Switch
          checked={showInactive}
          onCheckedChange={setShowInactive}
          aria-label="Show inactive supply partners"
          className="shrink-0"
        />
      </div>

      {aLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <Card className="glass-card p-16 text-center hover-lift">
          <div className="h-16 w-16 rounded-2xl bg-gradient-soft mx-auto mb-4 grid place-items-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">
            {showInactive ? "No supply partners found" : "No active supply partners"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {showInactive
              ? "Create your first supply partner to get started."
              : "Toggle \"Show inactive\" to see deactivated ones, or create a new supply partner."}
          </p>
          <Button variant="premium" className="mt-5" onClick={() => setAgencyOpen(true)}>
            <Plus className="h-4 w-4" /> New supply partner
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((a) => {
            const inactive = !!a.is_deleted;
            return (
              <Card
                key={a.id}
                className={cn("glass-card p-5 hover-lift relative group", inactive && "opacity-75")}
              >
                <Link
                  to={`/supply-partners/${a.id}`}
                  className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Open ${a.name}`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className={cn("h-11 w-11 rounded-xl text-white grid place-items-center shadow-sm", inactive ? "bg-muted-foreground/60" : "bg-gradient-brand")}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {inactive && (
                      <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground bg-muted/40">Inactive</Badge>
                    )}
                    {a.partner_type && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">{a.partner_type}</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <h3 className={cn("font-semibold tracking-tight text-base break-words transition-colors", inactive ? "text-muted-foreground" : "group-hover:text-primary")}>
                    {a.name}
                  </h3>
                  {a.kissp_id && (
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {a.kissp_id}
                    </span>
                  )}
                </div>
                {a.full_name && a.full_name !== a.name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{a.full_name}</p>
                )}

                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {a.email && (
                    <p className="inline-flex items-center gap-1.5 break-all">
                      <Mail className="h-3 w-3 shrink-0" /> {a.email}
                    </p>
                  )}
                  {a.phone && (
                    <p className="inline-flex items-center gap-1.5">
                      <PhoneIcon className="h-3 w-3 shrink-0" /> {a.phone}
                    </p>
                  )}
                  {a.city_name && (
                    <p className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" /> {a.city_name}
                    </p>
                  )}
                  <p>Added {formatDate((a.created_at as any)?.toDate?.()) || "—"}</p>
                </div>

                <div className="mt-4 flex items-center gap-2 relative z-10">
                  <Button
                    variant="outline" size="sm" className="px-2.5"
                    aria-label="Edit supply partner"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditAgency(a); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {inactive ? (
                    <Button
                      variant="outline" size="sm"
                      className="px-2.5 text-primary hover:text-primary hover:bg-primary-soft"
                      aria-label="Reactivate supply partner"
                      onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { await restoreAgency(a.id); } catch {/* noop */} }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label="Deactivate supply partner"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteAgency(a); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Can edit candidates toggle */}
                <div
                  className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-2 relative z-10"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Can edit candidates</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Allow this partner to edit or delete their own candidates</p>
                  </div>
                  <Switch
                    checked={!!a.can_edit_candidates}
                    onCheckedChange={async (val) => {
                      try { await updateAgencyEditPermission(a.id, val); } catch {/* noop */}
                    }}
                    aria-label="Toggle candidate edit permission"
                    className="shrink-0"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreatePartnerDialog open={agencyOpen} onOpenChange={setAgencyOpen} agencies={agencies} />
      <EditPartnerDialog agency={editAgency} onOpenChange={(o) => { if (!o) setEditAgency(null); }} />
      <DeletePartnerDialog agency={deleteAgency} onOpenChange={(o) => { if (!o) setDeleteAgency(null); }} />
    </div>
  );
}

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreatePartnerDialog({ open, onOpenChange, agencies }: { open: boolean; onOpenChange: (v: boolean) => void; agencies: Agency[] }) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { ...EMPTY_BASE, password: "" },
  });

  const nextSuffix = useMemo(() => {
    const nums = agencies
      .map((a) => a.kissp_id)
      .filter(Boolean)
      .map((id) => { const m = id!.match(/^KISSP(\d+)$/); return m ? parseInt(m[1], 10) : 0; });
    return String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(3, "0");
  }, [agencies]);

  useEffect(() => {
    if (open) reset({ ...EMPTY_BASE, password: "", kissp_suffix: nextSuffix });
  }, [open, reset, nextSuffix]);

  async function onSubmit(v: PartnerForm) {
    try {
      await createAgencyWithUser({
        kissp_id: v.kissp_suffix ? `KISSP${v.kissp_suffix.padStart(3, "0")}` : null,
        name: v.name,
        full_name: v.full_name || null,
        email: v.email,
        phone: v.phone || null,
        partner_type: v.partner_type || null,
        city_name: v.city_name || null,
        aadhar_number: v.aadhar_number || null,
        aadhar_name: v.aadhar_name || null,
        aadhar_dob: v.aadhar_dob || null,
        aadhar_address: v.aadhar_address || null,
        pan_number: v.pan_number || null,
        pan_name: v.pan_name || null,
        bank_account_name: v.bank_account_name || null,
        bank_name: v.bank_name || null,
        bank_account_number: v.bank_account_number || null,
        bank_ifsc: v.bank_ifsc || null,
        bank_branch_name: v.bank_branch_name || null,
        bank_account_type: v.bank_account_type || null,
        company_name: v.company_name || null,
        company_gst: v.company_gst || null,
        password: v.password,
      });
      toast({ title: "Supply partner created", description: `${v.email} can now sign in.` });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Could not create supply partner", description: err?.message ?? "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-4 sm:p-5 border-b border-border shrink-0">
          <DialogTitle>New supply partner</DialogTitle>
          <DialogDescription>Fill in the partner's details. Only Partner Name, Email, and Password are required.</DialogDescription>
        </DialogHeader>
        <form id="create-partner-form" onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
          <PartnerFormFields register={register} watch={watch} setValue={setValue} errors={errors} showPassword />
        </form>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 sm:p-5 pt-0 border-t border-border/60 bg-background shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button form="create-partner-form" type="submit" variant="premium" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create supply partner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Deactivate dialog ────────────────────────────────────────────────────────

function DeletePartnerDialog({ agency, onOpenChange }: { agency: Agency | null; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!agency) return;
    setSubmitting(true);
    try {
      await softDeleteAgency(agency.id);
      toast({ title: "Supply partner deactivated", description: `${agency.name} can no longer sign in. Their data is preserved.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!agency} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate this supply partner?</AlertDialogTitle>
          <AlertDialogDescription>
            {agency && (
              <><span className="font-medium text-foreground">{agency.name}</span> will be marked inactive. Their users will no longer be able to sign in. All candidates, projects, and assignments are preserved and remain visible to admins.</>
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
