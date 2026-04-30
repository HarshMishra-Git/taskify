import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { InlineLoader } from "@/components/Loader";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const rules = [
  { id: "len",   label: "At least 8 characters",      test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter",        test: (p: string) => /[A-Z]/.test(p) },
  { id: "num",   label: "One number or symbol",        test: (p: string) => /[0-9!@#$%^&*]/.test(p) },
];

export default function Signup() {
  const { signup } = useAuth();
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [touched,      setTouched]      = useState(false);
  const [showPwd,      setShowPwd]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [submitting,   setSubmitting]   = useState(false);

  const passValid   = rules.every((r) => r.test(password));
  const matchValid  = password === confirm;
  const formValid   = name.trim() && email && passValid && matchValid;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!formValid) return;
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      // AuthContext.signup navigates to /verify
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not create account";
      toast({ title: "Sign up failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Get started in seconds"
      footer={<>Already have an account? <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
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

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
              required
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              tabIndex={-1}
              aria-label={showPwd ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Live rules */}
          {(touched || password) && (
            <ul className="mt-2 space-y-1">
              {rules.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.id} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-foreground" : "text-muted-foreground")}>
                    {ok
                      ? <Check className="h-3 w-3 text-foreground" />
                      : <X    className="h-3 w-3 text-muted-foreground" />
                    }
                    {r.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              tabIndex={-1}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {touched && confirm && !matchValid && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={submitting || (touched && !formValid)}>
          {submitting && <InlineLoader className="mr-2" />}
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
