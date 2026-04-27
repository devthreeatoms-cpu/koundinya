import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logo from "@/assets/koundinya-logo.jpeg";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { user, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register, handleSubmit, formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!authLoading && user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast({ title: "Welcome back", description: "Signed in successfully." });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({
        title: "Sign-in failed",
        description: err?.message ?? "Check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-brand text-white relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white p-1.5 shadow-elevated">
            <img src={logo} alt="Koundinya" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-semibold">Koundinya</p>
            <p className="text-xs text-white/80">Workforce Management</p>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Manage your workforce. Effortlessly.
          </h1>
          <p className="text-white/85">
            Centralize candidates, track projects, and assign teams in one place — built for fast-moving BPO operations.
          </p>
        </div>
        <p className="text-xs text-white/70">© {new Date().getFullYear()} Koundinya. All rights reserved.</p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <img src={logo} alt="Koundinya" className="h-10 w-10 object-contain" />
            <span className="font-semibold">Koundinya WMS</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use your administrator email and password.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="admin@koundinya.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-gradient-brand text-white shadow-brand hover:opacity-95" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Don't have an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
