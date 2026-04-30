import { ReactNode } from "react";
import { CheckSquare } from "lucide-react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { theme, toggle } = useTheme();
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <CheckSquare className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Taskify</span>
        </div>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            {children}
          </div>

          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
