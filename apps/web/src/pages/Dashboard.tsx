import { useEffect, useState } from "react";
import { CheckCircle2, Clock, ListChecks, AlertTriangle } from "lucide-react";
import { api, DashboardResponse, DashboardStats, ApiError } from "@/lib/api";
import { PageLoader } from "@/components/Loader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import { usePageMeta } from "@/contexts/PageHeaderContext";

export default function Dashboard() {
  usePageMeta("Dashboard", "An overview of what's happening across your work.");
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await api<DashboardResponse>("/dashboard");
        // Map backend shape → UI shape
        const mapped: DashboardStats = {
          total:       raw.total,
          in_progress: raw.by_status?.in_progress ?? 0,
          done:        raw.by_status?.done ?? 0,
          overdue:     raw.overdue?.length ?? 0,
          my_tasks:    (raw.overdue ?? []).map((t) => ({
            id:          t.id,
            title:       t.title,
            project_id:  t.project_id,
            assigned_to: null,
            status:      t.status,
            due_date:    t.due_date,
          })),
        };
        if (mounted) setData(mapped);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Failed to load dashboard";
        toast({ title: "Could not load dashboard", description: msg, variant: "destructive" });
        if (mounted) setData({ total: 0, in_progress: 0, done: 0, overdue: 0, my_tasks: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return null;

  const stats = [
    { label: "Total Tasks",  value: data.total,       icon: ListChecks   },
    { label: "In Progress",  value: data.in_progress,  icon: Clock        },
    { label: "Done",         value: data.done,         icon: CheckCircle2 },
    { label: "Overdue",      value: data.overdue,      icon: AlertTriangle },
  ];

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:bg-accent sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{s.value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Overdue Tasks</h2>
          <span className="text-xs text-muted-foreground">
            {data.my_tasks.length} task{data.my_tasks.length === 1 ? "" : "s"}
          </span>
        </div>

        {data.my_tasks.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-8 w-8" />}
            title="You're all caught up"
            description="Overdue tasks assigned to you will show up here."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {data.my_tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent sm:px-5 sm:py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  {t.due_date && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Due {formatDate(t.due_date)}</p>
                  )}
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}
