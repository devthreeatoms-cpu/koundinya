import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createProject, updateProject } from "@/hooks/useProjects";
import type { Project, ProjectStatus } from "@/types";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Project name is required").max(100),
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

export default function ProjectFormModal({ open, onOpenChange, project }: Props) {
  const { toast } = useToast();
  const isEdit = !!project;

  const {
    register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", client_name: "", location: "", start_date: "", status: "Active" },
  });

  useEffect(() => {
    if (open) {
      const sd = (project?.start_date as any)?.toDate?.() as Date | undefined;
      reset({
        name: project?.name ?? "",
        client_name: project?.client_name ?? "",
        location: project?.location ?? "",
        start_date: sd ? sd.toISOString().slice(0, 10) : "",
        status: project?.status ?? "Active",
      });
    }
  }, [open, project, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        name: values.name,
        client_name: values.client_name || "",
        location: values.location,
        start_date: values.start_date ? new Date(values.start_date) : null,
        status: values.status as ProjectStatus,
      };
      if (isEdit && project) {
        await updateProject(project.id, payload);
        toast({ title: "Project updated" });
      } else {
        await createProject(payload);
        toast({ title: "Project created" });
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
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update project details." : "Add a new project to your workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Client</Label>
              <Input id="client_name" {...register("client_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} />
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as ProjectStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
