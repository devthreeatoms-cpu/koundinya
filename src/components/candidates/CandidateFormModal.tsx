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
import type { Candidate, CandidateStatus } from "@/types";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  location: z.string().trim().min(1, "Location is required").max(100),
  has_bike: z.boolean(),
  source: z.string().trim().min(1, "Source is required").max(50),
  status: z.enum(["New", "Contacted", "Assigned", "Rejected"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
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
    defaultValues: {
      name: "",
      phone: "",
      location: "",
      has_bike: false,
      source: "Referral",
      status: "New",
      notes: "",
    },
  });

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
      });
    }
  }, [open, candidate, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && candidate) {
        await updateCandidate(candidate.id, values);
        toast({ title: "Candidate updated" });
      } else {
        await createCandidate(values);
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
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-gradient-soft">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-brand">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEdit ? "Edit candidate" : "Add candidate"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isEdit
                  ? "Update candidate details."
                  : "Create a new candidate record. Phone numbers must be unique."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
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
            <div className="col-span-2 sm:col-span-1">
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
            <div className="col-span-2 sm:col-span-1">
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
            <div className="col-span-2 sm:col-span-1">
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
            <div className="col-span-2 sm:col-span-1">
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
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 col-span-2 sm:col-span-1 mt-[22px]">
              <div>
                <p className="text-sm font-medium">Has bike</p>
                <p className="text-[11px] text-muted-foreground">Owns own transport</p>
              </div>
              <Switch
                checked={watch("has_bike")}
                onCheckedChange={(v) => setValue("has_bike", v)}
              />
            </div>
          </div>
          <div>
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

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
