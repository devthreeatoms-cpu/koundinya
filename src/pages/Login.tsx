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
import { Loader2, ShieldCheck, Sparkles, Zap, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
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
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-white/5 blur-2xl animate-float" />

        <div className="relative flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white p-1.5 shadow-elevated animate-float">
            <img src={logo} alt="Koundinya" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Koundinya</p>
            <p className="text-xs text-white/80">Workforce Management</p>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium border border-white/20">
            <Sparkles className="h-3.5 w-3.5" /> Built for fast-moving BPO ops
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
            Manage your workforce.
            <br />
            <span className="text-white/80">Effortlessly.</span>
          </h1>
          <p className="text-white/85 text-base leading-relaxed">
            Centralize candidates, track projects, and assign teams in one
            beautifully crafted workspace.
          </p>

          <div className="grid grid-cols-1 gap-3 pt-4">
            {[
              { icon: ShieldCheck, title: "Enterprise-grade security", desc: "Encrypted, audited, reliable." },
              { icon: Zap, title: "Real-time updates", desc: "Live data synced across teams." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur border border-white/15 p-3"
                >
                  <div className="h-9 w-9 rounded-lg bg-white/20 grid place-items-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-white/75">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-xs text-white/70">
          © {new Date().getFullYear()} Koundinya. All rights reserved.
        </p>
      </div>

      {/* Right form */}
      <div className="relative flex items-center justify-center p-6 sm:p-12 bg-mesh">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="h-12 w-12 rounded-xl bg-white p-1.5 shadow-card">
              <img src={logo} alt="Koundinya" className="h-full w-full object-contain" />
            </div>
            <span className="font-semibold tracking-tight text-lg">Koundinya WMS</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to continue to your workspace.
            </p>
          </div>

          <div className="glass rounded-2xl p-6 sm:p-8 shadow-elevated">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@koundinya.com"
                  className="h-11"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-destructive" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-destructive" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="premium"
                className="w-full h-11 text-base font-semibold"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Don't have an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
