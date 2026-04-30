import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex h-full min-h-[40vh] w-full items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export function InlineLoader({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} />;
}
