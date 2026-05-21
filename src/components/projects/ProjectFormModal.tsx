import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createProject, updateProject } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useProjectStatuses } from "@/hooks/useProjectStatuses";
import { useAuth } from "@/context/AuthContext";
import type { Project } from "@/types";
import { Loader2, Briefcase, AlertCircle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Project name is required").max(100),
  client_id: z.string().optional().or(z.literal("")),
  client_name: z.string().trim().max(100).optional().or(z.literal("")),
  location: z.string().trim().min(1, "Location is required").max(100),
  start_date: z.string().optional(),
  status: z.string().trim().min(1, "Status is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-fade-in">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}

export default function ProjectFormModal({ open, onOpenChange, project }: Props) {
  const { toast } = useToast();
  const { agencyId, isAdmin } = useAuth();
  const { clients } = useClients();
  const { statuses, addStatus, removeStatus } = useProjectStatuses();
  const isEdit = !!project;

  const [showManualClient, setShowManualClient] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState("");
  const [addingStatus, setAddingStatus] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [newCustomStatusInput, setNewCustomStatusInput] = useState("");
  const [onboardingStatuses, setOnboardingStatuses] = useState<string[]>([]);
  const [newOnboardingStatusInput, setNewOnboardingStatusInput] = useState("");

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", client_id: "", client_name: "", location: "", start_date: "", status: "" },
  });

  const selectedClientId = watch("client_id");

  useEffect(() => {
    if (open) {
      const sd = (project?.start_date as any)?.toDate?.() as Date | undefined;
      const hasLinkedClient = !!project?.client_id && clientMap.has(project.client_id);
      reset({
        name: project?.name ?? "",
        client_id: hasLinkedClient ? project.client_id! : "",
        client_name: hasLinkedClient ? "" : (project?.client_name ?? ""),
        location: project?.location ?? "",
        start_date: sd ? sd.toISOString().slice(0, 10) : "",
        status: project?.status ?? "",
      });
      setShowManualClient(!hasLinkedClient);
      setCustomStatuses(project?.custom_statuses ?? []);
      setOnboardingStatuses(project?.onboarding_statuses ?? []);
      setNewCustomStatusInput("");
      setNewOnboardingStatusInput("");
    }
  }, [open, project, reset, clientMap]);

  useEffect(() => {
    if (selectedClientId && selectedClientId !== "__manual__") {
      const client = clientMap.get(selectedClientId);
      if (client) {
        setValue("client_name", client.name);
        setShowManualClient(false);
      }
    } else if (selectedClientId === "__manual__") {
      setValue("client_name", "");
      setShowManualClient(true);
    }
  }, [selectedClientId, clientMap, setValue]);

  async function onSubmit(values: FormValues) {
    try {
      const clientId = values.client_id && values.client_id !== "__manual__" ? values.client_id : null;
      const payload = {
        name: values.name,
        client_name: values.client_name || "",
        client_id: clientId,
        location: values.location,
        start_date: values.start_date ? new Date(values.start_date) : null,
        status: values.status,
        custom_statuses: customStatuses,
        onboarding_statuses: onboardingStatuses,
      };
      if (isEdit && project) {
        await updateProject(project.id, payload);
        toast({ title: "Project updated" });
      } else {
        await createProject(payload, { agency_id: agencyId });
        toast({ title: "Project created" });
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
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden gap-0 flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border bg-gradient-soft">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-brand">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg text-foreground">
                {isEdit ? "Edit project" : "New project"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5 text-muted-foreground">
                {isEdit ? "Update project details." : "Add a new project to your workspace."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div>
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project name
            </Label>
            <Input
              id="name"
              className={cn("mt-1.5", errors.name && "border-destructive focus-visible:ring-destructive/20")}
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Client selector */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Client
              </Label>
              <Select
                value={watch("client_id")}
                onValueChange={(v) => setValue("client_id", v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select an existing client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.company_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__manual__">Other / Enter manually</SelectItem>
                </SelectContent>
              </Select>
              {showManualClient && (
                <Input
                  id="client_name"
                  placeholder="Enter client name"
                  className="mt-2"
                  {...register("client_name")}
                />
              )}
            </div>

            {/* Location + Start date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
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
              <div>
                <Label htmlFor="start_date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Start date
                </Label>
                <Input id="start_date" type="date" className="mt-1.5" {...register("start_date")} />
              </div>
            </div>

            {/* Status — admin-managed chips */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <div className="mt-1.5 space-y-2">
                {/* Existing statuses as selectable chips */}
                <div className="flex flex-wrap gap-1.5">
                  {statuses.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setValue("status", s.name, { shouldValidate: true })}
                      className={cn(
                        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        watch("status") === s.name
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {s.name}
                      {isAdmin && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStatus(s.id);
                          }}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Add new status */}
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add new status…"
                      value={newStatusInput}
                      onChange={(e) => setNewStatusInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newStatusInput.trim()) {
                          e.preventDefault();
                          setAddingStatus(true);
                          addStatus(newStatusInput)
                            .then(() => {
                              setValue("status", newStatusInput.trim(), { shouldValidate: true });
                              setNewStatusInput("");
                            })
                            .catch((err: any) => {
                              toast({ title: "Error", description: err.message, variant: "destructive" });
                            })
                            .finally(() => setAddingStatus(false));
                        }
                      }}
                      className="h-8 text-xs"
                      disabled={addingStatus}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs shrink-0"
                      disabled={!newStatusInput.trim() || addingStatus}
                      onClick={() => {
                        setAddingStatus(true);
                        addStatus(newStatusInput)
                          .then(() => {
                            setValue("status", newStatusInput.trim(), { shouldValidate: true });
                            setNewStatusInput("");
                          })
                          .catch((err: any) => {
                            toast({ title: "Error", description: err.message, variant: "destructive" });
                          })
                          .finally(() => setAddingStatus(false));
                      }}
                    >
                      {addingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add
                    </Button>
                  </div>
                )}
              </div>
              <FieldError message={errors.status?.message} />
            </div>

            {/* Candidate Workflow Statuses — per-project internal tags */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Candidate Workflow Statuses
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                Internal stages shown per assigned candidate (e.g. "EFID Pending", "Biometric Done").
              </p>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {customStatuses.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/30"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setCustomStatuses((prev) => prev.filter((x) => x !== s))}
                        className="ml-0.5 hover:text-destructive transition-colors"
                        aria-label={`Remove ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {customStatuses.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No workflow statuses added yet.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add workflow status…"
                    value={newCustomStatusInput}
                    onChange={(e) => setNewCustomStatusInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = newCustomStatusInput.trim();
                        if (!trimmed) return;
                        if (customStatuses.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
                        setCustomStatuses((prev) => [...prev, trimmed]);
                        setNewCustomStatusInput("");
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs shrink-0"
                    disabled={!newCustomStatusInput.trim() || customStatuses.some((s) => s.toLowerCase() === newCustomStatusInput.trim().toLowerCase())}
                    onClick={() => {
                      const trimmed = newCustomStatusInput.trim();
                      if (!trimmed) return;
                      if (customStatuses.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
                      setCustomStatuses((prev) => [...prev, trimmed]);
                      setNewCustomStatusInput("");
                    }}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Onboarding Statuses — per-project tags used in onboarding table */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Onboarding Statuses
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                Status options for onboarding phase (e.g. "Training Pending", "Docs Pending", "Ready for Project").
              </p>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {onboardingStatuses.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary border border-primary/30"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setOnboardingStatuses((prev) => prev.filter((x) => x !== s))}
                        className="ml-0.5 hover:text-destructive transition-colors"
                        aria-label={`Remove ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {onboardingStatuses.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No onboarding statuses added yet.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add onboarding status..."
                    value={newOnboardingStatusInput}
                    onChange={(e) => setNewOnboardingStatusInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = newOnboardingStatusInput.trim();
                        if (!trimmed) return;
                        if (onboardingStatuses.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
                        setOnboardingStatuses((prev) => [...prev, trimmed]);
                        setNewOnboardingStatusInput("");
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs shrink-0"
                    disabled={!newOnboardingStatusInput.trim() || onboardingStatuses.some((s) => s.toLowerCase() === newOnboardingStatusInput.trim().toLowerCase())}
                    onClick={() => {
                      const trimmed = newOnboardingStatusInput.trim();
                      if (!trimmed) return;
                      if (onboardingStatuses.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
                      setOnboardingStatuses((prev) => [...prev, trimmed]);
                      setNewOnboardingStatusInput("");
                    }}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
