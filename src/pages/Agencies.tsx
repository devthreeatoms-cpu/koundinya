import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Building2,
  Loader2,
  UserPlus,
  Mail,
  ShieldCheck,
  Users as UsersIcon,
  Pencil,
  Trash2,
  Phone as PhoneIcon,
  RotateCcw,
  Eye,
  Calendar,
  Hash,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  useAgencies,
  useAllUsers,
  createAgency,
  createAgencyUser,
  updateAgency,
  softDeleteAgency,
  restoreAgency,
} from "@/hooks/useAgencies";
import { formatDate } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import type { Agency, AppUser } from "@/types";

const agencySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});
type AgencyForm = z.infer<typeof agencySchema>;

const userSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  agency_id: z.string().min(1, "Pick an agency"),
});
type UserForm = z.infer<typeof userSchema>;

export default function AgenciesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [showInactive, setShowInactive] = useState(true);
  const { agencies, loading: aLoading } = useAgencies({ includeDeleted: showInactive });
  const { users, loading: uLoading } = useAllUsers();

  const [agencyOpen, setAgencyOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [presetAgencyId, setPresetAgencyId] = useState<string | null>(null);
  const [editAgency, setEditAgency] = useState<Agency | null>(null);
  const [deleteAgency, setDeleteAgency] = useState<Agency | null>(null);
  const [viewUser, setViewUser] = useState<AppUser | null>(null);

  // Hooks must run unconditionally — guard render below.
  const usersByAgency = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of users) {
      if (u.role === "agency" && u.agency_id) {
        m.set(u.agency_id, (m.get(u.agency_id) ?? 0) + 1);
      }
    }
    return m;
  }, [users]);

  // Active agencies (for the invite-user dropdown — never offer deleted ones).
  const activeAgencies = useMemo(
    () => agencies.filter((a) => !a.is_deleted),
    [agencies]
  );

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
        title="Agencies"
        description="Create agencies and invite their users. Each agency only sees its own data."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPresetAgencyId(null);
                setUserOpen(true);
              }}
              disabled={activeAgencies.length === 0}
            >
              <UserPlus className="h-4 w-4" /> <span className="truncate">Invite user</span>
            </Button>
            <Button variant="premium" onClick={() => setAgencyOpen(true)}>
              <Plus className="h-4 w-4" /> <span className="truncate">New agency</span>
            </Button>
          </>
        }
      />

      {/* Filter toggle */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 sm:px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Show inactive agencies</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
            Deactivated agencies stay in the database with all their data preserved.
          </p>
        </div>
        <Switch
          checked={showInactive}
          onCheckedChange={setShowInactive}
          aria-label="Show inactive agencies"
          className="shrink-0"
        />
      </div>

      {aLoading || uLoading ? (
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
            {showInactive ? "No agencies found" : "No active agencies"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {showInactive
              ? "Create your first agency, then invite a user to access it."
              : "Toggle \"Show inactive\" to see deactivated ones, or create a new agency."}
          </p>
          <Button variant="premium" className="mt-5" onClick={() => setAgencyOpen(true)}>
            <Plus className="h-4 w-4" /> New agency
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((a) => {
            const userCount = usersByAgency.get(a.id) ?? 0;
            const inactive = !!a.is_deleted;
            return (
              <Card
                key={a.id}
                className={cn(
                  "glass-card p-5 hover-lift relative group",
                  inactive && "opacity-75"
                )}
              >
                <Link
                  to={`/agencies/${a.id}`}
                  className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Open ${a.name}`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "h-11 w-11 rounded-xl text-white grid place-items-center shadow-sm",
                      inactive ? "bg-muted-foreground/60" : "bg-gradient-brand"
                    )}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {inactive && (
                      <Badge
                        variant="outline"
                        className="border-muted-foreground/30 text-muted-foreground bg-muted/40"
                      >
                        Inactive
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="border-primary/40 text-primary bg-primary-soft"
                    >
                      <UsersIcon className="h-3 w-3 mr-1" /> {userCount}
                    </Badge>
                  </div>
                </div>

                <h3
                  className={cn(
                    "font-semibold tracking-tight text-base mt-4 break-words transition-colors",
                    inactive
                      ? "text-muted-foreground"
                      : "group-hover:text-primary"
                  )}
                >
                  {a.name}
                </h3>

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
                  <p>Created {formatDate((a.created_at as any)?.toDate?.()) || "—"}</p>
                </div>

                {/* Action row — keep above the click overlay. */}
                <div className="mt-4 flex items-center gap-2 relative z-10">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={inactive}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPresetAgencyId(a.id);
                      setUserOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4" /> Invite
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2.5"
                    aria-label="Edit agency"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditAgency(a);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {inactive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2.5 text-primary hover:text-primary hover:bg-primary-soft"
                      aria-label="Reactivate agency"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          await restoreAgency(a.id);
                        } catch {/* noop */}
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label="Deactivate agency"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteAgency(a);
                      }}
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

      {/* All users table */}
      <Card className="glass-card p-4 sm:p-6 hover-lift">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-primary-soft text-primary grid place-items-center">
            <UsersIcon className="h-3.5 w-3.5" />
          </div>
          <h3 className="font-semibold tracking-tight">Users</h3>
        </div>
        {uLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No users yet.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => {
              const ag = agencies.find((a) => a.id === u.agency_id);
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-brand text-white grid place-items-center shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-all">{u.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ag
                        ? `${ag.name}${ag.is_deleted ? " · Inactive" : ""}`
                        : u.role === "admin"
                        ? "Global admin"
                        : "Unassigned"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      u.role === "admin"
                        ? "border-primary/40 text-primary bg-primary-soft"
                        : "border-border text-muted-foreground"
                    }
                  >
                    {u.role === "admin" ? (
                      <>
                        <ShieldCheck className="h-3 w-3 mr-1" /> Admin
                      </>
                    ) : (
                      "Agency"
                    )}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <CreateAgencyDialog
        open={agencyOpen}
        onOpenChange={setAgencyOpen}
        onCreated={(id) => {
          setPresetAgencyId(id);
          setAgencyOpen(false);
          setUserOpen(true);
        }}
      />
      <EditAgencyDialog
        agency={editAgency}
        onOpenChange={(open) => {
          if (!open) setEditAgency(null);
        }}
      />
      <DeleteAgencyDialog
        agency={deleteAgency}
        onOpenChange={(open) => {
          if (!open) setDeleteAgency(null);
        }}
      />
      <InviteUserDialog
        open={userOpen}
        onOpenChange={(o) => {
          setUserOpen(o);
          if (!o) setPresetAgencyId(null);
        }}
        agencies={activeAgencies.map((a) => ({ id: a.id, name: a.name }))}
        defaultAgencyId={presetAgencyId}
      />
    </div>
  );
}

function CreateAgencyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgencyForm>({
    resolver: zodResolver(agencySchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  async function onSubmit(values: AgencyForm) {
    try {
      const id = await createAgency({
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
      });
      toast({ title: "Agency created" });
      reset();
      onCreated(id);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New agency</DialogTitle>
          <DialogDescription>
            Create an agency. After this, invite a user to access it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Agency name</Label>
            <Input id="name" className="mt-1.5" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="email" type="email" className="mt-1.5" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="phone" className="mt-1.5" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create agency
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAgencyDialog({
  agency,
  onOpenChange,
}: {
  agency: Agency | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgencyForm>({
    resolver: zodResolver(agencySchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  // Repopulate when a different agency is opened.
  useEffect(() => {
    if (agency) {
      reset({
        name: agency.name ?? "",
        email: agency.email ?? "",
        phone: agency.phone ?? "",
      });
    }
  }, [agency, reset]);

  async function onSubmit(values: AgencyForm) {
    if (!agency) return;
    try {
      await updateAgency(agency.id, {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
      });
      toast({ title: "Agency updated" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={!!agency} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit agency</DialogTitle>
          <DialogDescription>
            Update the agency's details. Existing candidates, projects, and assignments are preserved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Agency name</Label>
            <Input id="edit-name" className="mt-1.5" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" className="mt-1.5" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" className="mt-1.5" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
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

function DeleteAgencyDialog({
  agency,
  onOpenChange,
}: {
  agency: Agency | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!agency) return;
    setSubmitting(true);
    try {
      await softDeleteAgency(agency.id);
      toast({
        title: "Agency deactivated",
        description: `${agency.name} can no longer sign in. Their data is preserved.`,
      });
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
          <AlertDialogTitle>Are you sure you want to deactivate this agency?</AlertDialogTitle>
          <AlertDialogDescription>
            {agency ? (
              <>
                <span className="font-medium text-foreground">{agency.name}</span> will be marked
                inactive. Their users will no longer be able to sign in. All candidates, projects,
                and assignments are preserved and remain visible to admins.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
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

function InviteUserDialog({
  open,
  onOpenChange,
  agencies,
  defaultAgencyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencies: { id: string; name: string }[];
  defaultAgencyId: string | null;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", password: "", agency_id: defaultAgencyId ?? "" },
  });

  // Reset agency_id when dialog opens with a different preset.
  useEffect(() => {
    if (open) {
      reset({ email: "", password: "", agency_id: defaultAgencyId ?? "" });
    }
  }, [open, defaultAgencyId, reset]);

  async function onSubmit(values: UserForm) {
    try {
      await createAgencyUser({
        email: values.email,
        password: values.password,
        agency_id: values.agency_id,
      });
      toast({
        title: "User invited",
        description: `${values.email} can now sign in and will see only their agency's data.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not create user",
        description: err?.message ?? "Something went wrong",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite agency user</DialogTitle>
          <DialogDescription>
            Sets up sign-in credentials for an agency user. They'll only see their agency's data.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Agency</Label>
            <Select value={watch("agency_id")} onValueChange={(v) => setValue("agency_id", v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pick an agency" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.agency_id && (
              <p className="text-xs text-destructive mt-1">{errors.agency_id.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className="mt-1.5" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              type="text"
              className="mt-1.5"
              placeholder="At least 6 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Share this with the user — they can change it later.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
