import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, Project, ApiError } from "@/lib/api";
import { InlineLoader } from "@/components/Loader";
import { toast } from "@/hooks/use-toast";

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (project: Project) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const reset = () => {
    setName("");
    setDescription("");
    setSubmitting(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const project = await api<Project>("/projects", {
        method: "POST",
        body: { name: name.trim(), description: description.trim() || undefined },
      });
      onCreated?.(project);
      onOpenChange(false);
      reset();
      if (project?.id !== undefined) navigate(`/projects/${project.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to create project";
      toast({ title: "Could not create project", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Create a project to organize tasks for your team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np-name">Name</Label>
            <Input
              id="np-name"
              autoFocus
              maxLength={80}
              placeholder="e.g. Marketing Site"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="np-desc"
              maxLength={200}
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting && <InlineLoader className="mr-2" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
