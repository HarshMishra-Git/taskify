import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Users, ListChecks, UserPlus, Calendar, CalendarIcon, Trash2 } from "lucide-react";
import { api, ApiError, Member, Project, Task, TaskStatus, User } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { PageLoader, InlineLoader } from "@/components/Loader";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo",        label: "Todo"        },
  { value: "in_progress", label: "In Progress" },
  { value: "done",        label: "Done"        },
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { setMeta } = usePageHeader();

  const [project,    setProject]    = useState<Project | null>(null);
  const [members,    setMembers]    = useState<Member[] | null>(null);
  const [tasks,      setTasks]      = useState<Task[]   | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [memberOpen, setMemberOpen] = useState(false);
  const [taskOpen,   setTaskOpen]   = useState(false);

  useEffect(() => {
    setMeta({ title: project?.name || "Project", description: undefined });
    return () => setMeta({ title: "" });
  }, [project?.name, setMeta]);

  const isAdmin = useMemo(() => {
    const me = members?.find((m) => m.user_id === user?.id && !m.pending);
    return me?.role === "admin";
  }, [members, user]);

  const loadAll = async () => {
    if (!id) return;
    try {
      const [p, rawMembers, rawTasks] = await Promise.all([
        api<Project>(`/projects/${id}`),
        api<Member[]>(`/projects/${id}/members`).catch(() => [] as Member[]),
        api<Task[]>(`/tasks`, { query: { project_id: id } }).catch(() => [] as Task[]),
      ]);
      setProject(p);
      setMembers(Array.isArray(rawMembers) ? rawMembers : []);
      setTasks(Array.isArray(rawTasks) ? rawTasks : []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load project";
      toast({ title: "Could not load project", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); loadAll(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <PageLoader />;
  if (!project) return (
    <EmptyState title="Project not found" description="It may have been deleted or you no longer have access." />
  );

  const canUpdateTask = (t: Task) =>
    isAdmin || (t.assigned_to !== null && String(t.assigned_to) === String(user?.id));

  return (
    <div className="space-y-10">

      {/* ── Members ─────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Members</h2>
            <span className="text-xs text-muted-foreground">{members?.length ?? 0}</span>
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setMemberOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add member
            </Button>
          )}
        </div>

        {!members || members.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="No members yet"
            description={isAdmin
              ? "Invite teammates to collaborate on this project."
              : "Members added by an admin will appear here."}
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {members.map((m) => (
              <li key={m.user_id ?? m.email} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.name} email={m.email} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name || m.email || "Unknown"}
                    </p>
                    {m.email && (
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.pending && (
                    <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      Pending
                    </span>
                  )}
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize
                    ${m.role === "admin"
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-border text-muted-foreground"}`}
                  >
                    {m.role}
                  </span>
                  {isAdmin && m.user_id !== user?.id && (
                    <RemoveMemberButton
                      projectId={String(id)}
                      member={m}
                      onRemoved={loadAll}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Tasks ───────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Tasks</h2>
            <span className="text-xs text-muted-foreground">{tasks?.length ?? 0}</span>
          </div>
          <Button size="sm" onClick={() => setTaskOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New task
          </Button>
        </div>

        {!tasks || tasks.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-7 w-7" />}
            title="No tasks yet"
            description="Create your first task to get started."
            action={
              <Button size="sm" onClick={() => setTaskOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />New task
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {tasks.map((t) => {
              const assignee = members?.find((m) => !m.pending && m.user_id === t.assigned_to);
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent sm:gap-4 sm:px-5 sm:py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      {t.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(t.due_date)}
                        </span>
                      )}
                      {assignee && (
                        <span className="truncate">
                          {assignee.name || assignee.email || "Assigned"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {assignee && <Avatar name={assignee.name} email={assignee.email} size={24} className="hidden sm:flex" />}
                    <TaskStatusControl
                      task={t}
                      canUpdate={canUpdateTask(t)}
                      onUpdated={(next) =>
                        setTasks((prev) => prev?.map((x) => x.id === t.id ? { ...x, status: next } : x) ?? prev)
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <AddMemberDialog
        open={memberOpen}
        onOpenChange={setMemberOpen}
        projectId={String(id)}
        onAdded={loadAll}
      />
      <NewTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        projectId={String(id)}
        members={members ?? []}
        onCreated={loadAll}
      />
    </div>
  );
}

// ── RemoveMemberButton ───────────────────────────────────────────────────────

function RemoveMemberButton({ projectId, member, onRemoved }: {
  projectId: string;
  member: Member;
  onRemoved: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      if (member.pending) {
        await api(`/projects/${projectId}/invites?email=${encodeURIComponent(member.email!)}`, { method: "DELETE" });
      } else {
        await api(`/projects/${projectId}/members/${member.user_id}`, { method: "DELETE" });
      }
      onRemoved();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof ApiError ? e.message : "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={loading}
          aria-label="Remove member"
          className="rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {member.pending
              ? `This will revoke the invitation sent to ${member.email}.`
              : `This will remove ${member.name || member.email} from the project. They will lose access to all tasks and data.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handle}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Removing..." : "Remove member"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── TaskStatusControl ────────────────────────────────────────────────────────

function TaskStatusControl({
  task, canUpdate, onUpdated,
}: {
  task: Task;
  canUpdate: boolean;
  onUpdated: (next: TaskStatus) => void;
}) {
  const [updating, setUpdating] = useState(false);

  if (!canUpdate) return <StatusBadge status={task.status} />;

  const handleChange = async (next: string) => {
    if (next === task.status) return;
    setUpdating(true);
    try {
      await api(`/tasks/${task.id}/status`, { method: "PATCH", body: { status: next } });
      onUpdated(next as TaskStatus);
    } catch (e) {
      toast({ title: "Could not update task", description: e instanceof ApiError ? e.message : "Failed", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Select value={task.status} onValueChange={handleChange} disabled={updating}>
      <SelectTrigger className="h-8 w-[110px] text-xs sm:w-[140px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── AddMemberDialog ──────────────────────────────────────────────────────────
// Flow: user enters email → lookup /users/by-email → get user_id → POST /projects/{id}/members

function AddMemberDialog({
  open, onOpenChange, projectId, onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  onAdded: () => void;
}) {
  const [email,      setEmail]      = useState("");
  const [role,       setRole]       = useState<"admin" | "member">("member");
  const [error,      setError]      = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setEmail(""); setRole("member"); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await api(`/projects/${projectId}/invite`, {
        method: "POST",
        body: { email: email.trim(), role },
      });
      toast({ title: "Invite sent", description: `${email} will receive an email invite.` });
      reset();
      onOpenChange(false);
      onAdded();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) {
          setError("This person is already a member of the project.");
        } else {
          setError(e.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-email">Email address</Label>
            <Input
              id="m-email"
              type="email"
              autoFocus
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              required
              maxLength={255}
              disabled={submitting}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")} disabled={submitting}>
              <SelectTrigger id="m-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => { onOpenChange(false); reset(); }} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !email.trim()}>
              {submitting && <InlineLoader className="mr-2" />}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── NewTaskDialog ────────────────────────────────────────────────────────────

function NewTaskDialog({
  open, onOpenChange, projectId, members, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  members: Member[];
  onCreated: () => void;
}) {
  const [title,      setTitle]      = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate,    setDueDate]    = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setTitle(""); setAssignedTo(""); setDueDate(undefined); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await api(`/tasks`, {
        method: "POST",
        body: {
          project_id:  projectId,
          title:       title.trim(),
          assigned_to: assignedTo || null,
          due_date:    dueDate ? format(dueDate, "yyyy-MM-dd") : null,
          status:      "todo",
        },
      });
      toast({ title: "Task created" });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast({ title: "Could not create task", description: e instanceof ApiError ? e.message : "Failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a task to this project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input
              id="t-title"
              autoFocus
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={255}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-assignee">Assignee</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={submitting}>
                <SelectTrigger id="t-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {members.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No members yet</div>
                  ) : (
                    members.filter((m) => !m.pending).map((m) => (
                      <SelectItem key={m.user_id!} value={m.user_id!}>
                        {m.name || m.email || "Unknown"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                    disabled={submitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarUI
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting && <InlineLoader className="mr-2" />}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}
