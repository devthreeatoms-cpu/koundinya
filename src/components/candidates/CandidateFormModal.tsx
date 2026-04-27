import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createCandidate, updateCandidate } from "@/hooks/useCandidates";
import type { Candidate, CandidateStatus } from "@/types";
import { Loader2 } from "lucide-react";

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

export default function CandidateFormModal({ open, onOpenChange, candidate }: Props) {
  const { toast } = useToast();
  const isEdit = !!candidate;

  const {
    register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", phone: "", location: "", has_bike: false,
      source: "Referral", status: "New", notes: "",
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
      toast({ title: "Error", description: err?.message ?? "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit candidate" : "Add candidate"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update candidate details." : "Create a new candidate record. Phone numbers must be unique."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} />
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Source</Label>
              <Select value={watch("source")} onValueChange={(v) => setValue("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as CandidateStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 col-span-2 sm:col-span-1">
              <div>
                <p className="text-sm font-medium">Has bike</p>
                <p className="text-xs text-muted-foreground">Owns own transport</p>
              </div>
              <Switch checked={watch("has_bike")} onCheckedChange={(v) => setValue("has_bike", v)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Save changes" : "Add candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
