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
import { useAuth } from "@/context/AuthContext";
import type { Project, ProjectStatus } from "@/types";
import { Loader2, Briefcase, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Project name is required").max(100),
  client_id: z.string().optional().or(z.literal("")),
  client_name: z.string().trim().max(100).optional().or(z.literal("")),
  location: z.string().trim().min(1, "Location is required").max(100),
  start_date: z.string().optional(),
  status: z.enum(["Active", "Completed"]),
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
  const { agencyId } = useAuth();
  const { clients } = useClients();
  const isEdit = !!project;

  const [showManualClient, setShowManualClient] = useState(false);

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
    defaultValues: { name: "", client_id: "", client_name: "", location: "", start_date: "", status: "Active" },
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
        status: project?.status ?? "Active",
      });
      setShowManualClient(!hasLinkedClient);
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
        status: values.status as ProjectStatus,
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
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
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
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as ProjectStatus)}
              >
                <SelectTrigger className="mt-1.5 w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
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
