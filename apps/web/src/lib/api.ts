const BASE_URL = "/api";

const TOKEN_KEY = "tasks.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = opts;

  let url = BASE_URL + path;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const qs = params.toString();
    if (qs) url += "?" + qs;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = tokenStore.get();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network error. Please check your connection.", 0, null);
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    const msg =
      (typeof data === "object" && data && "detail" in data && typeof (data as Record<string, unknown>).detail === "string"
        ? (data as { detail: string }).detail
        : undefined) ||
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  name?: string;
  email: string;
};

export type Project = {
  id: string;
  name: string;
  created_by: string;
  created_at?: string;
};

export type Member = {
  user_id: string;
  project_id: string;
  role: "admin" | "member";
  // enriched client-side after lookup
  name?: string;
  email?: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  project_id: string;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  // client-side enriched
  assignee?: { id: string; name?: string; email?: string } | null;
  assignee_id?: string | null;
};

// Matches backend GET /dashboard response exactly
export type DashboardResponse = {
  total: number;
  by_status: {
    todo: number;
    in_progress: number;
    done: number;
  };
  overdue: {
    id: string;
    title: string;
    project_id: string;
    due_date: string;
    status: TaskStatus;
  }[];
};

// Shape used by Dashboard page (mapped from DashboardResponse)
export type DashboardStats = {
  total: number;
  in_progress: number;
  done: number;
  overdue: number;
  my_tasks: Task[];
};
