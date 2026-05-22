import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { createCandidate, updateCandidate, isKisfsIdTaken } from "@/hooks/useCandidates";
import { useAgencies } from "@/hooks/useAgencies";
import { useAuth } from "@/context/AuthContext";
import type { Candidate, CandidateStatus } from "@/types";
import {
  Loader2,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Landmark,
  MapPin,
  Lock,
  User,
  CreditCard,
  Bike,
  FileText,
  ChevronRight,
  Check,
  ChevronsUpDown,
  UserCog,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  state: z.string().trim().min(1, "State is required").max(100),
  district: z.string().trim().min(1, "District is required").max(100),
  area_name: z.string().trim().min(1, "Area is required").max(100),
  has_bike: z.boolean(),
  source: z.string().trim().min(1, "Source is required").max(50),
  status: z.enum([
    "New",
    "Contacted",
    "Assigned",
    "Rejected",
    "Call Back",
    "Follow Up",
    "On Hold",
    "Interview Pending",
    "Not Answering",
    "Not Interested",
    "Not Responding",
  ]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  aadhar_number: z.string().refine(val => !val || /^\d{12}$/.test(val), {
    message: "Enter valid 12-digit Aadhar number",
  }).optional().or(z.literal("")),
  pan_number: z.string().refine(val => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
    message: "Enter valid PAN format (ABCDE1234F)",
  }).optional().or(z.literal("")),
  bank_account_name: z.string().trim().max(100).optional().or(z.literal("")),
  bank_name: z.string().trim().max(100).optional().or(z.literal("")),
  bank_account_number: z.string().trim().refine(val => !val || /^\d{9,18}$/.test(val), {
    message: "Enter valid account number (9–18 digits)",
  }).optional().or(z.literal("")),
  bank_ifsc: z.string().trim().refine(val => !val || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val), {
    message: "Enter valid IFSC code (e.g. SBIN0001234)",
  }).optional().or(z.literal("")),
  source_member_id: z.string().optional().or(z.literal("")),
  kisfs_suffix: z.string().regex(/^\d{1,4}$/, "Must be 1–4 digits").optional().or(z.literal("")),
  age: z
    .string()
    .min(1, "Age is required")
    .refine((val) => /^\d{1,3}$/.test(val) && +val >= 14 && +val <= 99, {
      message: "Enter a valid age (14–99)",
    }),
  gender: z
    .string()
    .min(1, "Gender is required")
    .refine((v) => ["Male", "Female", "Other"].includes(v), {
      message: "Select a valid gender",
    }),
  qualification: z.string().trim().min(1, "Qualification is required").max(100),
  pincode: z
    .string()
    .min(1, "Pincode is required")
    .refine((val) => /^\d{6}$/.test(val), { message: "Enter valid 6-digit pincode" }),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: Candidate | null;
}

const STATUSES: CandidateStatus[] = [
  "New",
  "Contacted",
  "Assigned",
  "Rejected",
  "Call Back",
  "Follow Up",
  "On Hold",
  "Interview Pending",
  "Not Answering",
  "Not Interested",
  "Not Responding",
];
const SOURCES = [
  "Internal Team",
  "Supplier Partners",
  "Apna",
  "Job Hai",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "Other",
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" /> {message}
    </p>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function LocationStep({
  step,
  label,
  done,
  active,
  locked,
  children,
}: {
  step: number;
  label: string;
  done: boolean;
  active: boolean;
  locked: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
            done && "bg-green-500 text-white",
            active && !done && "bg-primary text-white shadow-sm",
            locked && "bg-muted text-muted-foreground border border-border"
          )}
        >
          {done ? <CheckCircle className="h-4 w-4" /> : locked ? <Lock className="h-3 w-3" /> : step}
        </div>
        {step < 3 && (
          <div className={cn("w-px flex-1 mt-1 min-h-[12px]", done ? "bg-green-400" : "bg-border")} />
        )}
      </div>
      <div className="flex-1 pb-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1.5", locked ? "text-muted-foreground" : "text-foreground")}>
          {label}
        </p>
        <div className={cn(locked && "opacity-50 pointer-events-none")}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CandidateFormModal({ open, onOpenChange, candidate }: Props) {
  const { toast } = useToast();
  const { agencyId, isAdmin } = useAuth();
  const isEdit = !!candidate;

  const { agencies: internalPartners } = useAgencies({ isInternal: true, includeDeleted: false });
  const { agencies } = useAgencies({ isInternal: false, includeDeleted: false });
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false);
  const [agencyPopoverOpen, setAgencyPopoverOpen] = useState(false);
  const [kisfsCheck, setKisfsCheck] = useState<"idle" | "checking" | "taken" | "ok">("idle");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      state: "",
      district: "",
      area_name: "",
      has_bike: false,
      source: "Internal Team",
      status: "New",
      notes: "",
      aadhar_number: "",
      pan_number: "",
      bank_account_name: "",
      bank_name: "",
      bank_account_number: "",
      bank_ifsc: "",
      source_member_id: "",
      kisfs_suffix: "",
      age: "",
      gender: "",
      qualification: "",
      pincode: "",
    },
  });

  const stateVal = watch("state") || "";
  const districtVal = watch("district") || "";
  const areaVal = watch("area_name") || "";
  const aadharVal = watch("aadhar_number") || "";
  const panVal = watch("pan_number") || "";
  const sourceVal = watch("source") || "";
  const sourceMemberId = watch("source_member_id") || "";
  const kifssSuffix = watch("kisfs_suffix") || "";

  const isAadharValid = aadharVal.length === 12 && /^\d{12}$/.test(aadharVal);
  const isPanValid = panVal.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal);

  const districtLocked = !stateVal;
  const areaLocked = !stateVal || !districtVal.trim();
  const locationComplete = !!stateVal && !!districtVal.trim() && !!areaVal.trim();

  useEffect(() => {
    if (open) {
      reset({
        name: candidate?.name ?? "",
        phone: candidate?.phone ?? "",
        email: candidate?.email ?? "",
        state: candidate?.state ?? "",
        district: candidate?.district ?? "",
        area_name: candidate?.area_name ?? "",
        has_bike: candidate?.has_bike ?? false,
        source: candidate?.source ?? (isAdmin ? "Internal Team" : "Supplier Partners"),
        status: candidate?.status ?? "New",
        notes: candidate?.notes ?? "",
        aadhar_number: candidate?.aadhar_number ?? "",
        pan_number: candidate?.pan_number ?? "",
        bank_account_name: candidate?.bank_account_name ?? "",
        bank_name: candidate?.bank_name ?? "",
        bank_account_number: candidate?.bank_account_number ?? "",
        bank_ifsc: candidate?.bank_ifsc ?? "",
        source_member_id: candidate?.source_member_id ?? (!isAdmin && agencyId ? agencyId : ""),
        kisfs_suffix: candidate?.kisfs_id?.replace(/^KISFS/, "") ?? "",
        age: candidate?.age != null ? String(candidate.age) : "",
        gender: (candidate?.gender as "" | "Male" | "Female" | "Other" | undefined) ?? "",
        qualification: candidate?.qualification ?? "",
        pincode: candidate?.pincode ?? "",
      });
    }
  }, [open, candidate, reset, isAdmin, agencyId]);

  // Real-time KISFS ID availability check (admin only, debounced 400 ms)
  useEffect(() => {
    if (!isAdmin || !kifssSuffix) { setKisfsCheck("idle"); return; }
    setKisfsCheck("checking");
    const kisfsId = `KISFS${kifssSuffix.padStart(3, "0")}`;
    const timer = setTimeout(async () => {
      try {
        const taken = await isKisfsIdTaken(kisfsId, candidate?.id);
        setKisfsCheck(taken ? "taken" : "ok");
      } catch {
        setKisfsCheck("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [kifssSuffix, isAdmin, candidate?.id]);

  function onInvalidSubmit(formErrors: Record<string, any>) {
    const firstKey = Object.keys(formErrors)[0];
    if (!firstKey) return;
    const firstMsg = formErrors[firstKey]?.message as string | undefined;
    toast({
      title: "Please fix the highlighted fields",
      description: firstMsg ?? "Some required fields are missing or invalid.",
      variant: "destructive",
    });
    setTimeout(() => {
      const form = document.getElementById("candidate-form");
      if (!form) return;
      const byName = form.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
      const byId = document.getElementById(firstKey) as HTMLElement | null;
      const firstErrorMsg = form.querySelector(".text-destructive") as HTMLElement | null;
      const target = byName ?? byId ?? firstErrorMsg;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof (target as HTMLInputElement).focus === "function") {
        try { (target as HTMLInputElement).focus({ preventScroll: true }); } catch { /* ignore */ }
      }
    }, 0);
  }

  async function onSubmit(values: FormValues) {
    // Admins must pick a source member ONLY for Internal Team / Supplier Partners
    const needsSourceMember =
      isAdmin &&
      (values.source === "Internal Team" || values.source === "Supplier Partners");
    if (needsSourceMember && !values.source_member_id) {
      const msg = values.source === "Internal Team"
        ? "Select an internal team member"
        : "Select a supply partner";
      setError("source_member_id", { message: msg });
      toast({
        title: "Please fix the highlighted fields",
        description: msg,
        variant: "destructive",
      });
      setTimeout(() => {
        const form = document.getElementById("candidate-form");
        const target =
          (form?.querySelector('[name="source_member_id"]') as HTMLElement | null) ??
          (form?.querySelector(".text-destructive") as HTMLElement | null);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }

    try {
      // Resolve source member id + display name
      let source_member_id: string | null = values.source_member_id || null;
      let source_member_name: string | null = null;

      if (isAdmin && source_member_id) {
        source_member_name = values.source === "Internal Team"
          ? (internalPartners.find(p => p.id === source_member_id)?.name ?? null)
          : (agencies.find(a => a.id === source_member_id)?.name ?? null);
      } else if (!isAdmin && agencyId) {
        source_member_id = agencyId;
        source_member_name = agencies.find(a => a.id === agencyId)?.name ?? null;
      }

      const { kisfs_suffix, ...restValues } = values;
      // Admins can set/clear the ID. Non-admins editing leave it untouched
      // (undefined keeps Firestore from overwriting the existing value).
      // Non-admins creating pass null so the counter auto-generates.
      const kisfs_id: string | null | undefined = isAdmin
        ? (kisfs_suffix ? `KISFS${kisfs_suffix.padStart(3, "0")}` : null)
        : isEdit
          ? undefined
          : null;

      const finalPayload: Record<string, any> = {
        ...restValues,
        email: values.email?.trim() || null,
        aadhar_number: values.aadhar_number || null,
        pan_number: values.pan_number || null,
        aadhar_verified: !!values.aadhar_number && isAadharValid,
        pan_verified: !!values.pan_number && isPanValid,
        bank_account_name: values.bank_account_name || null,
        bank_name: values.bank_name || null,
        bank_account_number: values.bank_account_number || null,
        bank_ifsc: values.bank_ifsc ? values.bank_ifsc.toUpperCase() : null,
        age: values.age ? Number(values.age) : null,
        gender: values.gender || null,
        qualification: values.qualification?.trim() || null,
        pincode: values.pincode || null,
        source_member_id,
        source_member_name,
      };
      if (kisfs_id !== undefined) finalPayload.kisfs_id = kisfs_id;

      if (isEdit && candidate) {
        await updateCandidate(candidate.id, finalPayload);
        toast({ title: "Candidate updated" });
      } else {
        if (!isAdmin && !agencyId) {
          toast({
            title: "Account not linked to an agency",
            description: "Your user profile is missing an agency link. Please contact admin to fix your account.",
            variant: "destructive",
          });
          return;
        }
        await createCandidate(finalPayload, { agency_id: isAdmin ? null : agencyId });
        toast({ title: "Candidate added" });
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
      <DialogContent className="max-w-2xl p-0 gap-0 flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-4 border-b border-border bg-gradient-soft shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-brand">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {isEdit ? "Edit candidate" : "Add candidate"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5 text-muted-foreground">
                {isEdit
                  ? "Update candidate details."
                  : "Create a new candidate record. Phone numbers must be unique."}
              </DialogDescription>
            </div>
            {isEdit && candidate?.kisfs_id && (
              <span className="ml-auto text-xs font-mono font-bold text-primary tracking-widest bg-primary/10 px-2 py-1 rounded-lg">
                {candidate.kisfs_id}
              </span>
            )}
          </div>
        </DialogHeader>

        <form
          id="candidate-form"
          onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1"
        >
          {/* ── Personal Details ── */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <SectionHeader icon={<User className="h-3.5 w-3.5" />} title="Personal Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Ravi Kumar"
                  className={cn("mt-1.5", errors.name && "border-destructive focus-visible:ring-destructive/20")}
                  {...register("name")}
                />
                <FieldError message={errors.name?.message} />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  className={cn("mt-1.5", errors.phone && "border-destructive focus-visible:ring-destructive/20")}
                  {...register("phone")}
                />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. ravi.kumar@email.com"
                  className={cn("mt-1.5", errors.email && "border-destructive focus-visible:ring-destructive/20")}
                  {...register("email")}
                />
                <FieldError message={errors.email?.message} />
              </div>
              <div>
                <Label htmlFor="age" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Age <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="age"
                  inputMode="numeric"
                  placeholder="e.g. 25"
                  maxLength={3}
                  className={cn("mt-1.5", errors.age && "border-destructive focus-visible:ring-destructive/20")}
                  {...register("age")}
                  onChange={(e) =>
                    setValue("age", e.target.value.replace(/\D/g, "").slice(0, 3), {
                      shouldValidate: true,
                    })
                  }
                />
                <FieldError message={errors.age?.message} />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gender <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch("gender") ?? ""}
                  onValueChange={(v) =>
                    setValue("gender", v as "" | "Male" | "Female" | "Other", { shouldValidate: true })
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "mt-1.5",
                      errors.gender && "border-destructive focus-visible:ring-destructive/20"
                    )}
                  >
                    <SelectValue placeholder="Select gender…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.gender?.message} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="qualification" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Qualification <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="qualification"
                  placeholder="e.g. 12th Pass, B.Com, ITI"
                  className={cn("mt-1.5", errors.qualification && "border-destructive focus-visible:ring-destructive/20")}
                  {...register("qualification")}
                />
                <FieldError message={errors.qualification?.message} />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Source
                </Label>
                <Select
                  value={watch("source")}
                  onValueChange={(v) => {
                    setValue("source", v);
                    setValue("source_member_id", "");
                    clearErrors("source_member_id");
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Source member selection (admin only) ── */}
              {isAdmin && sourceVal === "Internal Team" && (
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Internal Team Member <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={memberPopoverOpen}
                        className={cn(
                          "w-full justify-between mt-1.5 font-normal h-10",
                          !sourceMemberId && "text-muted-foreground",
                          errors.source_member_id && "border-destructive"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {sourceMemberId ? (
                            <>
                              <UserCog className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">
                                {internalPartners.find(p => p.id === sourceMemberId)?.name ?? "Select a team member…"}
                              </span>
                            </>
                          ) : "Select a team member…"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command>
                        <CommandInput placeholder="Search team members…" className="h-9" />
                        <CommandList>
                          <CommandEmpty>No team members found.</CommandEmpty>
                          <CommandGroup>
                            {internalPartners.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.name} ${p.position ?? ""}`}
                                onSelect={() => {
                                  setValue("source_member_id", p.id, { shouldValidate: true });
                                  clearErrors("source_member_id");
                                  setMemberPopoverOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4 shrink-0", sourceMemberId === p.id ? "opacity-100" : "opacity-0")} />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{p.name}</p>
                                  {p.position && <p className="text-xs text-muted-foreground truncate">{p.position}</p>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FieldError message={errors.source_member_id?.message} />
                </div>
              )}

              {isAdmin && sourceVal === "Supplier Partners" && (
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Supply Partner <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={agencyPopoverOpen} onOpenChange={setAgencyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={agencyPopoverOpen}
                        className={cn(
                          "w-full justify-between mt-1.5 font-normal h-10",
                          !sourceMemberId && "text-muted-foreground",
                          errors.source_member_id && "border-destructive"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {sourceMemberId ? (
                            <>
                              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">
                                {agencies.find(a => a.id === sourceMemberId)?.name ?? "Select a supply partner…"}
                              </span>
                            </>
                          ) : "Select a supply partner…"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command>
                        <CommandInput placeholder="Search supply partners…" className="h-9" />
                        <CommandList>
                          <CommandEmpty>No supply partners found.</CommandEmpty>
                          <CommandGroup>
                            {agencies.map((a) => (
                              <CommandItem
                                key={a.id}
                                value={`${a.name} ${a.city_name ?? ""}`}
                                onSelect={() => {
                                  setValue("source_member_id", a.id, { shouldValidate: true });
                                  clearErrors("source_member_id");
                                  setAgencyPopoverOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4 shrink-0", sourceMemberId === a.id ? "opacity-100" : "opacity-0")} />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{a.name}</p>
                                  {a.city_name && <p className="text-xs text-muted-foreground truncate">{a.city_name}</p>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FieldError message={errors.source_member_id?.message} />
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as CandidateStatus)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Location ── */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <SectionHeader
              icon={<MapPin className="h-3.5 w-3.5" />}
              title="Location"
              subtitle="Select state, then district, then area"
            />

            {/* Live breadcrumb */}
            {(stateVal || districtVal || areaVal) && (
              <div className="flex items-center gap-1 flex-wrap text-xs font-medium mb-4 px-3 py-2 bg-primary/5 rounded-lg border border-primary/15">
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <span className={cn(stateVal ? "text-foreground" : "text-muted-foreground")}>
                  {stateVal || "State"}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className={cn(districtVal ? "text-foreground" : "text-muted-foreground")}>
                  {districtVal || "District"}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className={cn(areaVal ? "text-foreground" : "text-muted-foreground")}>
                  {areaVal || "Area"}
                </span>
                {locationComplete && <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-1" />}
              </div>
            )}

            <div className="space-y-0">
              {/* Step 1 — State */}
              <LocationStep
                step={1}
                label="State"
                done={!!stateVal}
                active={!stateVal}
                locked={false}
              >
                <Select
                  value={stateVal}
                  onValueChange={(v) => {
                    setValue("state", v, { shouldValidate: true });
                    setValue("district", "", { shouldValidate: false });
                    setValue("area_name", "", { shouldValidate: false });
                  }}
                >
                  <SelectTrigger className={cn(errors.state && "border-destructive")}>
                    <SelectValue placeholder="Select a state…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.state?.message} />
              </LocationStep>

              {/* Step 2 — District */}
              <LocationStep
                step={2}
                label="District"
                done={!!districtVal.trim() && !!stateVal}
                active={!!stateVal && !districtVal.trim()}
                locked={districtLocked}
              >
                <Input
                  id="district"
                  placeholder={districtLocked ? "Select a state first" : "e.g. Bangalore Urban"}
                  disabled={districtLocked}
                  className={cn(errors.district && !districtLocked && "border-destructive focus-visible:ring-destructive/20")}
                  {...register("district")}
                />
                {!districtLocked && <FieldError message={errors.district?.message} />}
              </LocationStep>

              {/* Step 3 — Area */}
              <LocationStep
                step={3}
                label="Area Name"
                done={locationComplete}
                active={!!stateVal && !!districtVal.trim() && !areaVal.trim()}
                locked={areaLocked}
              >
                <Input
                  id="area_name"
                  placeholder={areaLocked ? "Fill district first" : "e.g. Koramangala"}
                  disabled={areaLocked}
                  className={cn(errors.area_name && !areaLocked && "border-destructive focus-visible:ring-destructive/20")}
                  {...register("area_name")}
                />
                {!areaLocked && <FieldError message={errors.area_name?.message} />}
              </LocationStep>
            </div>

            {/* Pincode */}
            <div className="mt-4">
              <Label htmlFor="pincode" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pincode <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pincode"
                inputMode="numeric"
                placeholder="6 digits"
                maxLength={6}
                className={cn(
                  "mt-1.5 sm:max-w-[12rem] font-mono tracking-wider",
                  errors.pincode && "border-destructive focus-visible:ring-destructive/20"
                )}
                {...register("pincode")}
                onChange={(e) =>
                  setValue("pincode", e.target.value.replace(/\D/g, "").slice(0, 6), {
                    shouldValidate: true,
                  })
                }
              />
              <FieldError message={errors.pincode?.message} />
            </div>
          </div>

          {/* ── Identity Documents ── */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <SectionHeader icon={<CreditCard className="h-3.5 w-3.5" />} title="Identity Documents" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="aadhar_number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aadhar Number
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="aadhar_number"
                    inputMode="numeric"
                    placeholder="12 digits"
                    className={cn(
                      aadharVal && !isAadharValid && "border-destructive focus-visible:ring-destructive/20",
                      aadharVal && isAadharValid && "border-green-500 focus-visible:ring-green-500/20"
                    )}
                    {...register("aadhar_number")}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 12);
                      setValue("aadhar_number", val, { shouldValidate: true });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData("text");
                      const val = text.replace(/[^0-9]/g, "").slice(0, 12);
                      setValue("aadhar_number", val, { shouldValidate: true });
                    }}
                  />
                  {aadharVal && isAadharValid && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Must be exactly 12 digits</p>
                <FieldError message={errors.aadhar_number?.message} />
                {aadharVal && (
                  <p className={cn("text-[11px] font-medium mt-0.5", isAadharValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                    Aadhar: {isAadharValid ? "Verified" : "Pending"}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="pan_number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  PAN Number
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="pan_number"
                    placeholder="ABCDE1234F"
                    className={cn(
                      panVal && !isPanValid && "border-destructive focus-visible:ring-destructive/20",
                      panVal && isPanValid && "border-green-500 focus-visible:ring-green-500/20"
                    )}
                    {...register("pan_number")}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                      setValue("pan_number", val, { shouldValidate: true });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData("text");
                      const val = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                      setValue("pan_number", val, { shouldValidate: true });
                    }}
                  />
                  {panVal && isPanValid && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Format: ABCDE1234F</p>
                <FieldError message={errors.pan_number?.message} />
                {panVal && (
                  <p className={cn("text-[11px] font-medium mt-0.5", isPanValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                    PAN: {isPanValid ? "Verified" : "Pending"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Transport ── */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <SectionHeader icon={<Bike className="h-3.5 w-3.5" />} title="Transport" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Has bike</p>
                <p className="text-xs text-muted-foreground mt-0.5">Candidate owns their own two-wheeler</p>
              </div>
              <Select
                value={watch("has_bike") ? "yes" : "no"}
                onValueChange={(v) => setValue("has_bike", v === "yes")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Bank Details ── */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <SectionHeader
              icon={<Landmark className="h-3.5 w-3.5" />}
              title="Bank Details"
              subtitle="Optional — fill in if available"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank_account_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name as per bank account
                </Label>
                <Input
                  id="bank_account_name"
                  placeholder="Full name on bank account"
                  className="mt-1.5"
                  {...register("bank_account_name")}
                />
              </div>
              <div>
                <Label htmlFor="bank_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bank name
                </Label>
                <Input
                  id="bank_name"
                  placeholder="e.g. State Bank of India"
                  className="mt-1.5"
                  {...register("bank_name")}
                />
              </div>
              <div>
                <Label htmlFor="bank_account_number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account number
                </Label>
                <Input
                  id="bank_account_number"
                  inputMode="numeric"
                  placeholder="9–18 digit account number"
                  className={cn(
                    "mt-1.5",
                    errors.bank_account_number && "border-destructive focus-visible:ring-destructive/20"
                  )}
                  {...register("bank_account_number")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 18);
                    setValue("bank_account_number", val, { shouldValidate: true });
                  }}
                />
                <FieldError message={errors.bank_account_number?.message} />
              </div>
              <div>
                <Label htmlFor="bank_ifsc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  IFSC code
                </Label>
                <Input
                  id="bank_ifsc"
                  placeholder="e.g. SBIN0001234"
                  className={cn(
                    "mt-1.5 uppercase",
                    errors.bank_ifsc && "border-destructive focus-visible:ring-destructive/20"
                  )}
                  {...register("bank_ifsc")}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
                    setValue("bank_ifsc", val, { shouldValidate: true });
                  }}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Format: SBIN0001234 (11 characters)</p>
                <FieldError message={errors.bank_ifsc?.message} />
              </div>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <SectionHeader icon={<FileText className="h-3.5 w-3.5" />} title="Notes" subtitle="Optional" />
            <Textarea
              id="notes"
              rows={3}
              placeholder="Any additional notes about this candidate…"
              className="resize-none"
              {...register("notes")}
            />
          </div>
        </form>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 sm:p-5 pt-0 border-t border-border/60 bg-background shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            variant="premium"
            disabled={isSubmitting || kisfsCheck === "taken" || (isAdmin && !!kifssSuffix && kisfsCheck === "checking")}
            onClick={handleSubmit(onSubmit, onInvalidSubmit)}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add candidate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
