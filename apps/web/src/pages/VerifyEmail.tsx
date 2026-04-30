import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/Loader";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const VERIFIED_KEY = "auth_verified";

export default function VerifyEmail() {
  const [searchParams]  = useSearchParams();
  const location        = useLocation();
  const navigate        = useNavigate();
  const { loginWithToken, user, loading } = useAuth();

  const token = searchParams.get("token");
  const email = (location.state as { email?: string } | null)?.email ?? "";

  const [status,    setStatus]    = useState<"idle" | "verifying" | "success" | "error">(token ? "verifying" : "idle");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [resending, setResending] = useState(false);

  // If already authenticated, no need to stay on this page
  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  // Auto-verify if token present in URL
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api<{ access_token: string }>(`/auth/verify?token=${token}`, { auth: false });
        // Signal other open tabs that verification succeeded
        localStorage.setItem(VERIFIED_KEY, "true");
        setStatus("success");
        setTimeout(() => {
          loginWithToken(res.access_token);
          navigate("/", { replace: true });
        }, 1200);
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof ApiError ? e.message : "Verification failed");
      }
    })();
  }, [token]); // eslint-disable-line

  // Cross-tab sync: redirect idle tab when another tab completes verification
  useEffect(() => {
    if (status !== "idle") return;

    // Check immediately in case flag was set before this effect ran
    if (localStorage.getItem(VERIFIED_KEY) === "true") {
      localStorage.removeItem(VERIFIED_KEY);
      navigate("/", { replace: true });
      return;
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === VERIFIED_KEY && e.newValue === "true") {
        localStorage.removeItem(VERIFIED_KEY);
        navigate("/", { replace: true });
      }
    };

    // Fallback: check on tab focus (handles browsers that batch storage events)
    const onFocus = () => {
      if (localStorage.getItem(VERIFIED_KEY) === "true") {
        localStorage.removeItem(VERIFIED_KEY);
        navigate("/", { replace: true });
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [status, navigate]);

  const resend = async () => {
    if (!email) {
      toast({ title: "Enter your email on the signup page to resend", variant: "destructive" });
      return;
    }
    setResending(true);
    try {
      await api(`/auth/resend-verification?email=${encodeURIComponent(email)}`, { method: "POST", auth: false });
      toast({ title: "Verification email sent", description: "Check your inbox." });
    } catch (e) {
      toast({ title: "Could not resend", description: e instanceof ApiError ? e.message : "Try again", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  // ── Verifying ──
  if (status === "verifying") {
    return (
      <AuthShell title="Verifying…" subtitle="Please wait">
        <div className="flex justify-center py-6">
          <InlineLoader className="h-6 w-6" />
        </div>
      </AuthShell>
    );
  }

  // ── Success ──
  if (status === "success") {
    return (
      <AuthShell title="Email verified" subtitle="Redirecting you to the app…">
        <div className="flex justify-center py-6">
          <CheckCircle2 className="h-10 w-10 text-foreground" />
        </div>
      </AuthShell>
    );
  }

  // ── Error ──
  if (status === "error") {
    return (
      <AuthShell title="Link expired" subtitle={errorMsg}>
        <div className="flex flex-col items-center gap-4 py-4">
          <XCircle className="h-10 w-10 text-destructive" />
          <Button onClick={() => navigate("/signup")} variant="outline" className="w-full">
            Back to sign up
          </Button>
        </div>
      </AuthShell>
    );
  }

  // ── Idle — waiting for user to click email link ──
  return (
    <AuthShell
      title="Check your email"
      subtitle={email ? `We sent a verification link to ${email}` : "We sent a verification link to your email"}
    >
      <div className="space-y-5">
        <div className="flex justify-center py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
            <Mail className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Click the link in the email to verify your account and sign in.
          The link expires in 30 minutes.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={resend} variant="outline" className="w-full" disabled={resending}>
            {resending && <InlineLoader className="mr-2" />}
            Resend verification email
          </Button>
          <Button onClick={() => navigate("/login")} variant="ghost" className="w-full">
            Back to sign in
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
