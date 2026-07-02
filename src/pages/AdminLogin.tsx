import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(128),
});

const AdminLogin = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/admin" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ title: "Check your input", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const opts =
      mode === "signup"
        ? { email: parsed.data.email, password: parsed.data.password, options: { emailRedirectTo: `${window.location.origin}/admin` } }
        : { email: parsed.data.email, password: parsed.data.password };
    const { error } = await fn.call(supabase.auth, opts as any);
    setBusy(false);
    if (error) {
      toast({ title: mode === "signin" ? "Sign-in failed" : "Sign-up failed", description: error.message, variant: "destructive" });
      return;
    }
    if (mode === "signup") {
      toast({ title: "Account created", description: "Ask an existing admin to grant you access." });
    }
    nav("/admin");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto flex max-w-md flex-col px-6 pt-32">
        <h1 className="font-heading text-3xl font-bold text-foreground">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to manage tags and titles." : "Create an account. An admin will grant you access."}
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        <Link to="/" className="mt-8 text-xs text-muted-foreground hover:text-foreground">← Back to library</Link>
      </main>
    </div>
  );
};

export default AdminLogin;