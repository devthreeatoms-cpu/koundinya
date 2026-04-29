import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import { createCandidate, updateCandidate } from "@/hooks/useCandidates";
import { useAuth } from "@/context/AuthContext";
import type { Candidate, CandidateStatus } from "@/types";
import { Loader2, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  location: z.string().trim().min(1, "Location is required").max(100),
  has_bike: z.boolean(),
  source: z.string().trim().min(1, "Source is required").max(50),
  status: z.enum(["New", "Contacted", "Assigned", "Rejected"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  aadhar_number: z.string().refine(val => !val || /^\d{12}$/.test(val), {
    message: "Enter valid 12-digit Aadhar number",
  }).optional().or(z.literal("")),
  pan_number: z.string().refine(val => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
    message: "Enter valid PAN format (ABCDE1234F)",
  }).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: Candidate | null;
}

const STATUSES: CandidateStatus[] = ["New", "Contacted", "Assigned", "Rejected"];
const SOURCES = ["Referral", "Walk-in", "Job Portal", "Social Media", "Agency", "Other"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-fade-in">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}

export default function CandidateFormModal({ open, onOpenChange, candidate }: Props) {
  const { toast } = useToast();
  const { agencyId, isAdmin } = useAuth();
  const isEdit = !!candidate;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      location: "",
      has_bike: false,
      source: "Referral",
      status: "New",
      notes: "",
      aadhar_number: "",
      pan_number: "",
    },
  });

  const aadharVal = watch("aadhar_number") || "";
  const panVal = watch("pan_number") || "";

  const isAadharValid = aadharVal.length === 12 && /^\d{12}$/.test(aadharVal);
  const isPanValid = panVal.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal);

  useEffect(() => {
    if (open) {
      reset({
        name: candidate?.name ?? "",
        phone: candidate?.phone ?? "",
        location: candidate?.location ?? "",
        has_bike: candidate?.has_bike ?? false,
        source: candidate?.source ?? "Referral",
        status: candidate?.status ?? "New",
        notes: candidate?.notes ?? "",
        aadhar_number: candidate?.aadhar_number ?? "",
        pan_number: candidate?.pan_number ?? "",
      });
    }
  }, [open, candidate, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const finalPayload = {
        ...values,
        aadhar_number: values.aadhar_number ? values.aadhar_number : null,
        pan_number: values.pan_number ? values.pan_number : null,
        aadhar_verified: !!values.aadhar_number && isAadharValid,
        pan_verified: !!values.pan_number && isPanValid,
      };

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
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border bg-gradient-soft">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-brand">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg text-foreground">
                {isEdit ? "Edit candidate" : "Add candidate"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5 text-muted-foreground">
                {isEdit
                  ? "Update candidate details."
                  : "Create a new candidate record. Phone numbers must be unique."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </Label>
              <Input
                id="name"
                className={cn("mt-1.5", errors.name && "border-destructive focus-visible:ring-destructive/20")}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="sm:col-span-1">
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
            <div className="sm:col-span-1">
              <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Location
              </Label>
              <Input
                id="location"
                className={cn("mt-1.5", errors.location && "border-destructive focus-visible:ring-destructive/20")}
                {...register("location")}
              />
              <FieldError message={errors.location?.message} />
            </div>
            <div className="sm:col-span-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Source
              </Label>
              <Select value={watch("source")} onValueChange={(v) => setValue("source", v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1">
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
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-1">
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
              <p className="text-[10px] text-muted-foreground mt-1">Aadhar must be exactly 12 digits</p>
              <FieldError message={errors.aadhar_number?.message} />
              <p className={cn("text-[11px] font-medium mt-1", isAadharValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                Aadhar: {isAadharValid ? "Verified" : "Pending"}
              </p>
            </div>

            <div className="sm:col-span-1">
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
              <p className={cn("text-[11px] font-medium mt-1", isPanValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                PAN: {isPanValid ? "Verified" : "Pending"}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 sm:col-span-1 mt-[22px]">
              <div>
                <p className="text-sm font-medium">Has bike</p>
                <p className="text-[11px] text-muted-foreground">Owns own transport</p>
              </div>
              <Switch
                checked={watch("has_bike")}
                onCheckedChange={(v) => setValue("has_bike", v)}
              />
            </div>

            <div className="sm:col-span-3">
              <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Optional notes about the candidate…"
                className="mt-1.5 resize-none"
                {...register("notes")}
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
