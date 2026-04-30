import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { FolderKanban, Plus, ArrowRight } from "lucide-react";
import { api, Project, ApiError } from "@/lib/api";
import { PageLoader } from "@/components/Loader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { toast } from "@/hooks/use-toast";
import { usePageMeta } from "@/contexts/PageHeaderContext";

type Ctx = { reloadProjects: () => Promise<void> };

export default function Projects() {
  usePageMeta("Projects", "Organize work and collaborate with your team.");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [open, setOpen] = useState(false);
  const ctx = useOutletContext<Ctx>();

  const load = async () => {
    try {
      const list = await api<Project[]>("/projects");
      setProjects(Array.isArray(list) ? list : []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load projects";
      toast({ title: "Could not load projects", description: msg, variant: "destructive" });
      setProjects([]);
    }
  };

  useEffect(() => { load(); }, []);

  if (projects === null) return <PageLoader />;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-end gap-4">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New project
        </Button>
      </header>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-8 w-8" />}
          title="No projects yet"
          description="Create your first project to start organizing tasks."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />New project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <h3 className="mt-4 truncate text-sm font-semibold">{p.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.created_at ? `Created ${formatDate(p.created_at)}` : "—"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <NewProjectDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => { load(); ctx?.reloadProjects?.(); }}
      />
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
