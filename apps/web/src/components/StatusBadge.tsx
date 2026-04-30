import { TaskStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "todo" && "bg-muted-foreground",
          status === "in_progress" && "bg-foreground",
          status === "done" && "bg-foreground/40",
        )}
      />
      {LABELS[status]}
    </span>
  );
}
