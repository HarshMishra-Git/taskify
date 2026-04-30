import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, tokenStore, User, ApiError } from "@/lib/api";

type AuthContextValue = {
  user:            User | null;
  loading:         boolean;
  login:           (email: string, password: string) => Promise<void>;
  loginWithToken:  (token: string) => void;
  signup:          (name: string, email: string, password: string) => Promise<void>;
  logout:          () => void;
  refresh:         () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!tokenStore.get());
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>("/users/me");
      setUser(me);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        tokenStore.clear();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ access_token?: string; token?: string }>("/auth/login", {
      method: "POST",
      body:   { email, password },
      auth:   false,
    });
    const token = res.access_token || res.token;
    if (!token) throw new Error("No token returned from server");
    tokenStore.set(token);
    await refresh();
  }, [refresh]);

  // Used after email verification or invite accept — token already obtained
  const loginWithToken = useCallback((token: string) => {
    tokenStore.set(token);
    refresh();
  }, [refresh]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    await api("/auth/signup", {
      method: "POST",
      body:   { name, email, password },
      auth:   false,
    });
    navigate("/verify", { state: { email }, replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
