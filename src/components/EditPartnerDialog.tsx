import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  UserCircle2,
  BadgeCheck,
  CreditCard,
  Landmark,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useToast } from "@/hooks/use-toast";
import { updateAgency } from "@/hooks/useAgencies";
import { cn } from "@/lib/utils";
import type { Agency } from "@/types";

export const PARTNER_TYPES = [
  "Individual",
  "Proprietorship",
  "Partnership Firm",
  "Private Limited Company",
  "LLP",
  "Other",
];

export const ACCOUNT_TYPES = ["Savings", "Current"];

export const editSchema = z.object({
  kissp_suffix: z.string().regex(/^\d{1,4}$/, "Must be 1–4 digits").optional().or(z.literal("")),
  name: z.string().trim().min(2, "Partner name is required").max(100),
  full_name: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  partner_type: z.string().optional().or(z.literal("")),
  city_name: z.string().trim().max(100).optional().or(z.literal("")),
  aadhar_number: z.string().refine(val => !val || /^\d{12}$/.test(val), {
    message: "Must be exactly 12 digits",
  }).optional().or(z.literal("")),
  aadhar_name: z.string().trim().max(100).optional().or(z.literal("")),
  aadhar_dob: z.string().trim().max(50).optional().or(z.literal("")),
  aadhar_address: z.string().trim().max(500).optional().or(z.literal("")),
  pan_number: z.string().refine(val => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
    message: "Invalid PAN format (e.g. ABCDE1234F)",
  }).optional().or(z.literal("")),
  pan_name: z.string().trim().max(100).optional().or(z.literal("")),
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
  company_name: z.string().trim().max(100).optional().or(z.literal("")),
  company_gst: z.string().trim().max(50).optional().or(z.literal("")),
});

export type EditPartnerForm = z.infer<typeof editSchema>;

export const EMPTY_BASE = {
  kissp_suffix: "",
  name: "", full_name: "", email: "", phone: "", partner_type: "", city_name: "",
  aadhar_number: "", aadhar_name: "", aadhar_dob: "", aadhar_address: "",
  pan_number: "", pan_name: "",
  bank_account_name: "", bank_name: "", bank_account_number: "",
  bank_ifsc: "", bank_branch_name: "", bank_account_type: "",
  company_name: "", company_gst: "",
};

export function FE({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function Sec({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function PartnerFormFields<T extends Record<string, any>>({
  register, watch, setValue, errors, showPassword,
}: {
  register: any; watch: any; setValue: any; errors: any; showPassword?: boolean;
}) {
  const aadharVal = watch("aadhar_number") || "";
  const panVal = watch("pan_number") || "";
  const isAadharValid = /^\d{12}$/.test(aadharVal);
  const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal);
  const kisspSuffix = watch("kissp_suffix") || "";

  return (
    <div className="space-y-4">
      {/* ── Basic Info ── */}
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <Sec icon={<UserCircle2 className="h-3.5 w-3.5" />} title="Basic Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partner ID</Label>
            <div className="flex items-center mt-1.5">
              <span className="inline-flex items-center h-10 px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm font-mono font-semibold text-muted-foreground select-none">
                KISSP
              </span>
              <Input
                id="kissp_suffix"
                inputMode="numeric"
                placeholder="001"
                maxLength={4}
                className={cn("rounded-l-none font-mono w-28", errors.kissp_suffix && "border-destructive")}
                {...register("kissp_suffix")}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue("kissp_suffix", e.target.value.replace(/\D/g, "").slice(0, 4), { shouldValidate: true })}
              />
              {kisspSuffix && (
                <span className="ml-3 text-xs font-mono text-primary font-semibold bg-primary/10 px-2 py-1 rounded-md">
                  KISSP{kisspSuffix.padStart(3, "0")}
                </span>
              )}
            </div>
            <FE message={errors.kissp_suffix?.message} />
          </div>
          <div>
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partner Name *</Label>
            <Input id="name" placeholder="e.g. ABC Suppliers" className="mt-1.5" {...register("name")} />
            <FE message={errors.name?.message} />
          </div>
          <div>
            <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
            <Input id="full_name" placeholder="Contact person's full name" className="mt-1.5" {...register("full_name")} />
            <FE message={errors.full_name?.message} />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address *</Label>
            <Input id="email" type="email" placeholder="partner@email.com" className="mt-1.5" {...register("email")} />
            <FE message={errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
            <Input id="phone" placeholder="+91 98765 43210" className="mt-1.5" {...register("phone")} />
            <FE message={errors.phone?.message} />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partner Type</Label>
            <Select value={watch("partner_type") || ""} onValueChange={(v) => setValue("partner_type", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                {PARTNER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="city_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City Name</Label>
            <Input id="city_name" placeholder="e.g. Hyderabad" className="mt-1.5" {...register("city_name")} />
          </div>
          {showPassword && (
            <div className="sm:col-span-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Login Password *</Label>
              <Input id="password" type="text" placeholder="At least 6 characters" className="mt-1.5" {...register("password")} />
              <p className="text-[11px] text-muted-foreground mt-1">Share this with the supply partner — they can change it later.</p>
              <FE message={errors.password?.message} />
            </div>
          )}
        </div>
      </div>

      {/* ── Aadhaar ── */}
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <Sec icon={<BadgeCheck className="h-3.5 w-3.5" />} title="Aadhaar Details" sub="Optional" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="aadhar_number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aadhaar Number</Label>
            <Input
              id="aadhar_number"
              inputMode="numeric"
              placeholder="12 digits"
              className={cn("mt-1.5",
                aadharVal && !isAadharValid && "border-destructive",
                aadharVal && isAadharValid && "border-green-500"
              )}
              {...register("aadhar_number")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue("aadhar_number", e.target.value.replace(/\D/g, "").slice(0, 12), { shouldValidate: true })}
            />
            {aadharVal && (
              <p className={cn("text-[11px] font-medium mt-1", isAadharValid ? "text-green-600" : "text-amber-600")}>
                {isAadharValid ? "Valid" : "Must be 12 digits"}
              </p>
            )}
            <FE message={errors.aadhar_number?.message} />
          </div>
          <div>
            <Label htmlFor="aadhar_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name As Per Aadhaar</Label>
            <Input id="aadhar_name" placeholder="Name on Aadhaar card" className="mt-1.5" {...register("aadhar_name")} />
          </div>
          <div>
            <Label htmlFor="aadhar_dob" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Birth (As Per Aadhaar)</Label>
            <Input id="aadhar_dob" type="date" className="mt-1.5" {...register("aadhar_dob")} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="aadhar_address" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address (As Per Aadhaar)</Label>
            <Textarea id="aadhar_address" rows={2} placeholder="Full address as on Aadhaar" className="mt-1.5 resize-none" {...register("aadhar_address")} />
          </div>
        </div>
      </div>

      {/* ── PAN ── */}
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <Sec icon={<CreditCard className="h-3.5 w-3.5" />} title="PAN Details" sub="Optional" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pan_number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PAN Number</Label>
            <Input
              id="pan_number"
              placeholder="ABCDE1234F"
              className={cn("mt-1.5 uppercase",
                panVal && !isPanValid && "border-destructive",
                panVal && isPanValid && "border-green-500"
              )}
              {...register("pan_number")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue("pan_number", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10), { shouldValidate: true })}
            />
            {panVal && (
              <p className={cn("text-[11px] font-medium mt-1", isPanValid ? "text-green-600" : "text-amber-600")}>
                {isPanValid ? "Valid" : "Invalid PAN format"}
              </p>
            )}
            <FE message={errors.pan_number?.message} />
          </div>
          <div>
            <Label htmlFor="pan_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name As Per PAN</Label>
            <Input id="pan_name" placeholder="Name on PAN card" className="mt-1.5" {...register("pan_name")} />
          </div>
        </div>
      </div>

      {/* ── Bank ── */}
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <Sec icon={<Landmark className="h-3.5 w-3.5" />} title="Bank Details" sub="Optional" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bank_account_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name As Per Bank Account</Label>
            <Input id="bank_account_name" placeholder="Account holder name" className="mt-1.5" {...register("bank_account_name")} />
          </div>
          <div>
            <Label htmlFor="bank_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name of the Bank</Label>
            <Input id="bank_name" placeholder="e.g. State Bank of India" className="mt-1.5" {...register("bank_name")} />
          </div>
          <div>
            <Label htmlFor="bank_account_number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Account Number</Label>
            <Input
              id="bank_account_number"
              inputMode="numeric"
              placeholder="9–18 digit account number"
              className="mt-1.5"
              {...register("bank_account_number")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue("bank_account_number", e.target.value.replace(/\D/g, "").slice(0, 18), { shouldValidate: true })}
            />
            <FE message={errors.bank_account_number?.message} />
          </div>
          <div>
            <Label htmlFor="bank_ifsc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IFSC Code</Label>
            <Input
              id="bank_ifsc"
              placeholder="e.g. SBIN0001234"
              className="mt-1.5 uppercase"
              {...register("bank_ifsc")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue("bank_ifsc", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11), { shouldValidate: true })}
            />
            <FE message={errors.bank_ifsc?.message} />
          </div>
          <div>
            <Label htmlFor="bank_branch_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Branch Name</Label>
            <Input id="bank_branch_name" placeholder="e.g. MG Road Branch" className="mt-1.5" {...register("bank_branch_name")} />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Type</Label>
            <Select value={watch("bank_account_type") || ""} onValueChange={(v) => setValue("bank_account_type", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Savings / Current" /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Company ── */}
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <Sec icon={<Building2 className="h-3.5 w-3.5" />} title="Company Details" sub="Optional" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Name</Label>
            <Input id="company_name" placeholder="Registered company name" className="mt-1.5" {...register("company_name")} />
          </div>
          <div>
            <Label htmlFor="company_gst" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Registration / GST Number</Label>
            <Input id="company_gst" placeholder="GST or registration number" className="mt-1.5 uppercase" {...register("company_gst")} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditPartnerDialog({
  agency,
  onOpenChange,
}: {
  agency: Agency | null;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditPartnerForm>({
    resolver: zodResolver(editSchema),
    defaultValues: EMPTY_BASE,
  });

  useEffect(() => {
    if (agency) {
      reset({
        kissp_suffix: agency.kissp_id?.replace(/^KISSP/, "") ?? "",
        name: agency.name ?? "",
        full_name: agency.full_name ?? "",
        email: agency.email ?? "",
        phone: agency.phone ?? "",
        partner_type: agency.partner_type ?? "",
        city_name: agency.city_name ?? "",
        aadhar_number: agency.aadhar_number ?? "",
        aadhar_name: agency.aadhar_name ?? "",
        aadhar_dob: agency.aadhar_dob ?? "",
        aadhar_address: agency.aadhar_address ?? "",
        pan_number: agency.pan_number ?? "",
        pan_name: agency.pan_name ?? "",
        bank_account_name: agency.bank_account_name ?? "",
        bank_name: agency.bank_name ?? "",
        bank_account_number: agency.bank_account_number ?? "",
        bank_ifsc: agency.bank_ifsc ?? "",
        bank_branch_name: agency.bank_branch_name ?? "",
        bank_account_type: agency.bank_account_type ?? "",
        company_name: agency.company_name ?? "",
        company_gst: agency.company_gst ?? "",
      });
    }
  }, [agency, reset]);

  async function onSubmit(v: EditPartnerForm) {
    if (!agency) return;
    try {
      await updateAgency(agency.id, {
        kissp_id: v.kissp_suffix ? `KISSP${v.kissp_suffix.padStart(3, "0")}` : null,
        name: v.name,
        full_name: v.full_name || null,
        email: v.email || null,
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
      });
      toast({ title: "Supply partner updated" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={!!agency} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-4 sm:p-5 border-b border-border shrink-0">
          <DialogTitle>Edit supply partner</DialogTitle>
          <DialogDescription>Update this supply partner's details.</DialogDescription>
        </DialogHeader>
        <form
          id="edit-partner-form"
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4"
        >
          <PartnerFormFields register={register} watch={watch} setValue={setValue} errors={errors} />
        </form>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 sm:p-5 pt-0 border-t border-border/60 bg-background shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button form="edit-partner-form" type="submit" variant="premium" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
