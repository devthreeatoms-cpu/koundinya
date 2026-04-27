import { useMemo, useState } from "react";
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
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/hooks/useAgencies";
import { formatDate } from "@/lib/utils-format";

const agencySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
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
  const { toast } = useToast();
  const { agencies, loading: aLoading } = useAgencies();
  const { users, loading: uLoading } = useAllUsers();

  const [agencyOpen, setAgencyOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [presetAgencyId, setPresetAgencyId] = useState<string | null>(null);

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPresetAgencyId(null);
                setUserOpen(true);
              }}
              disabled={agencies.length === 0}
            >
              <UserPlus className="h-4 w-4" /> Invite user
            </Button>
            <Button variant="premium" onClick={() => setAgencyOpen(true)}>
              <Plus className="h-4 w-4" /> New agency
            </Button>
          </div>
        }
      />

      {aLoading || uLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <Card className="glass-card p-16 text-center hover-lift">
          <div className="h-16 w-16 rounded-2xl bg-gradient-soft mx-auto mb-4 grid place-items-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">No agencies yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first agency, then invite a user to access it.
          </p>
          <Button variant="premium" className="mt-5" onClick={() => setAgencyOpen(true)}>
            <Plus className="h-4 w-4" /> New agency
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((a) => {
            const userCount = usersByAgency.get(a.id) ?? 0;
            return (
              <Card key={a.id} className="glass-card p-5 hover-lift relative group">
                <Link
                  to={`/agencies/${a.id}`}
                  className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Open ${a.name}`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-brand text-white grid place-items-center shadow-sm">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-primary/40 text-primary bg-primary-soft">
                    <UsersIcon className="h-3 w-3 mr-1" /> {userCount}
                  </Badge>
                </div>
                <h3 className="font-semibold tracking-tight text-base mt-4 break-words group-hover:text-primary transition-colors">
                  {a.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {formatDate((a.created_at as any)?.toDate?.()) || "—"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full relative z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPresetAgencyId(a.id);
                    setUserOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" /> Invite user
                </Button>
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
                      {ag ? ag.name : u.role === "admin" ? "Global admin" : "Unassigned"}
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
      <InviteUserDialog
        open={userOpen}
        onOpenChange={(o) => {
          setUserOpen(o);
          if (!o) setPresetAgencyId(null);
        }}
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
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
  } = useForm<AgencyForm>({ resolver: zodResolver(agencySchema), defaultValues: { name: "" } });

  async function onSubmit(values: AgencyForm) {
    try {
      const id = await createAgency(values.name);
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
  useMemo(() => {
    if (open) {
      reset({ email: "", password: "", agency_id: defaultAgencyId ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultAgencyId]);

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
