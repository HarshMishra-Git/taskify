import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { InlineLoader } from "@/components/Loader";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const state     = location.state as { from?: { pathname?: string }; email?: string } | null;
  const from      = state?.from?.pathname || "/";
  const [email,      setEmail]      = useState(state?.email ?? "");
  const [password,   setPassword]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid credentials";
      toast({ title: "Sign in failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your workspace"
      footer={<>Don't have an account? <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">Create one</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            maxLength={128}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <InlineLoader className="mr-2" />}
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
