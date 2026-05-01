import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/Loader";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, tokenStore } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [searchParams]  = useSearchParams();
  const location        = useLocation();
  const navigate        = useNavigate();
  const { loginWithToken, user, loading, refresh } = useAuth();

  const token = searchParams.get("token");
  const email = (location.state as { email?: string } | null)?.email ?? "";

  const [status,    setStatus]    = useState<"idle" | "verifying" | "success" | "error">(token ? "verifying" : "idle");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [resending, setResending] = useState(false);

  // ── (B) Auth Watcher ──
  // Automatically redirect once the user state is populated (verified & logged in)
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // ── Auto-verify if token present in URL ──
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api<{ access_token: string }>(`/auth/verify?token=${token}`, { auth: false });
        setStatus("success");
        
        // Brief delay for visual feedback, then trigger login & sync
        setTimeout(() => {
          loginWithToken(res.access_token);
        }, 1200);
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof ApiError ? e.message : "Verification failed");
      }
    })();
  }, [token, loginWithToken]);

  // ── (A) Storage Event Listener ──
  // Listen for login/verification events triggered in other tabs
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === "auth_event") {
        try {
          const data = JSON.parse(event.newValue || "{}");
          if (data.type === "LOGIN") {
            refresh(); // Refetch user info locally
          }
        } catch { /* ignore */ }
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh]);

  // ── (4) Polling Fallback ──
  // Background polling to catch status change if storage events aren't captured
  useEffect(() => {
    if (user) return;

    let isRefreshing = false;
    let attempts = 0;
    const maxAttempts = 15; // 15 * 2s = 30s

    const interval = setInterval(async () => {
      attempts++;
      
      // Stop polling after 30s or if user becomes authenticated
      if (attempts >= maxAttempts || user) {
        clearInterval(interval);
        return;
      }

      // Only poll if we have a token and no refresh is currently in flight
      if (tokenStore.get() && !isRefreshing) {
        isRefreshing = true;
        try {
          await refresh();
        } catch {
          /* ignore failures while polling */
        } finally {
          isRefreshing = false;
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, refresh]);

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

  // ── UI States ──

  if (status === "verifying") {
    return (
      <AuthShell title="Verifying…" subtitle="Please wait">
        <div className="flex justify-center py-6">
          <InlineLoader className="h-6 w-6" />
        </div>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell title="Email verified" subtitle="Redirecting you to the app…">
        <div className="flex justify-center py-6">
          <CheckCircle2 className="h-10 w-10 text-foreground" />
        </div>
      </AuthShell>
    );
  }

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
