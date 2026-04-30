import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineLoader, PageLoader } from "@/components/Loader";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type InviteInfo = {
  email:        string;
  project_id:   string;
  project_name: string;
  role:         string;
  user_exists:  boolean;
};

const pwRules = [
  { id: "len",   label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter",   test: (p: string) => /[A-Z]/.test(p) },
  { id: "num",   label: "One number or symbol",   test: (p: string) => /[0-9!@#$%^&*]/.test(p) },
];

export default function InvitePage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const { user, loading, login, loginWithToken } = useAuth();

  const token = searchParams.get("token") ?? "";

  const [info,        setInfo]        = useState<InviteInfo | null>(null);
  const [infoError,   setInfoError]   = useState("");
  const [infoLoading, setInfoLoading] = useState(true);

  // Fetch invite metadata
  useEffect(() => {
    if (!token) { setInfoError("Missing invite token"); setInfoLoading(false); return; }
    (async () => {
      try {
        const data = await api<InviteInfo>(`/projects/invites/info?token=${token}`, { auth: false });
        setInfo(data);
      } catch (e) {
        setInfoError(e instanceof ApiError ? e.message : "Invalid invite link");
      } finally {
        setInfoLoading(false);
      }
    })();
  }, [token]);

  // Case 1: already logged in — accept and redirect
  useEffect(() => {
    if (loading || !user || !info) return;
    (async () => {
      try {
        const res = await api<{ project_id: string }>(`/projects/invites/accept?token=${token}`);
        navigate(`/projects/${res.project_id}`, { replace: true });
      } catch (e) {
        toast({ title: "Could not accept invite", description: e instanceof ApiError ? e.message : "Error", variant: "destructive" });
        navigate("/", { replace: true });
      }
    })();
  }, [user, info, loading]); // eslint-disable-line

  if (infoLoading || loading) return <PageLoader />;

  if (infoError) {
    return (
      <AuthShell title="Invalid invite" subtitle={infoError}>
        <Button onClick={() => navigate("/login")} className="w-full">Go to sign in</Button>
      </AuthShell>
    );
  }

  if (!info) return null;

  if (info.user_exists) {
    return <InviteLogin token={token} info={info} login={login} />;
  }

  return <InviteSignup token={token} info={info} loginWithToken={loginWithToken} />;
}

// ── InviteLogin ──────────────────────────────────────────────────────────────

function InviteLogin({
  token, info, login,
}: {
  token: string;
  info: InviteInfo;
  login: (email: string, password: string) => Promise<void>;
}) {
  const navigate    = useNavigate();
  const [password,   setPassword]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(info.email, password);
      const res = await api<{ project_id: string }>(`/projects/invites/accept?token=${token}`);
      navigate(`/projects/${res.project_id}`, { replace: true });
    } catch (err) {
      toast({ title: "Sign in failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={`Join ${info.project_name}`}
      subtitle={`Sign in to accept your invite as ${info.role}`}
      footer={<>Don't have an account? <Link to={`/invite?token=${token}`} className="font-medium text-foreground underline-offset-4 hover:underline">Sign up instead</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={info.email} readOnly className="bg-muted text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-password">Password</Label>
          <Input
            id="inv-password"
            type="password"
            autoFocus
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting || !password}>
          {submitting && <InlineLoader className="mr-2" />}
          Sign in & join project
        </Button>
      </form>
    </AuthShell>
  );
}

// ── InviteSignup ─────────────────────────────────────────────────────────────

function InviteSignup({
  token, info, loginWithToken,
}: {
  token: string;
  info: InviteInfo;
  loginWithToken: (t: string) => void;
}) {
  const navigate    = useNavigate();
  const defaultName = info.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const [name,       setName]       = useState(defaultName);
  const [password,   setPassword]   = useState("");
  const [touched,    setTouched]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passValid = pwRules.every((r) => r.test(password));
  const formValid = name.trim() && passValid;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!formValid) return;
    setSubmitting(true);
    try {
      await api("/auth/signup", {
        method: "POST",
        body:   { name: name.trim(), email: info.email, password },
        auth:   false,
      });

      const loginRes = await api<{ access_token: string }>(
        `/auth/login-invite?email=${encodeURIComponent(info.email)}&password=${encodeURIComponent(password)}`,
        { method: "POST", auth: false },
      );

      loginWithToken(loginRes.access_token);

      const inviteRes = await api<{ project_id: string }>(`/projects/invites/accept?token=${token}`);
      navigate(`/projects/${inviteRes.project_id}`, { replace: true });
    } catch (err) {
      toast({ title: "Sign up failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={`Join ${info.project_name}`}
      subtitle={`Create your account to accept the invite as ${info.role}`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={info.email} readOnly className="bg-muted text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-name">Your name</Label>
          <Input
            id="inv-name"
            autoFocus
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-pass">Password</Label>
          <Input
            id="inv-pass"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
            required
          />
          {(touched || password) && (
            <ul className="mt-2 space-y-1">
              {pwRules.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.id} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-foreground" : "text-muted-foreground")}>
                    {ok ? <Check className="h-3 w-3 text-foreground" /> : <X className="h-3 w-3 text-muted-foreground" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting || (touched && !formValid)}>
          {submitting && <InlineLoader className="mr-2" />}
          Create account & join project
        </Button>
      </form>
    </AuthShell>
  );
}
