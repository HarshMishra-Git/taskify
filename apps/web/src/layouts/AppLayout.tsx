import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  CheckSquare,
  LayoutDashboard,
  FolderKanban,
  Plus,
  Moon,
  Sun,
  LogOut,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useAuth }          from "@/contexts/AuthContext";
import { useTheme }         from "@/contexts/ThemeContext";
import { usePageHeader }    from "@/contexts/PageHeaderContext";
import { api, Project }     from "@/lib/api";
import { Avatar }           from "@/components/Avatar";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { cn }               from "@/lib/utils";

const W_EXPANDED  = 224;
const W_COLLAPSED = 56;
const TOPBAR_H    = 56;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle }          = useTheme();
  const { meta }                   = usePageHeader();

  const [projects,  setProjects]  = useState<Project[] | null>(null);
  const [newOpen,   setNewOpen]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dropOpen,  setDropOpen]  = useState(false);

  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadProjects = async () => {
    try {
      const list = await api<Project[]>("/projects");
      setProjects(Array.isArray(list) ? list : []);
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const sidebarW = collapsed ? W_COLLAPSED : W_EXPANDED;

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        style={{ width: sidebarW }}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out md:flex overflow-hidden"
      >
        {/* Header */}
        <div
          style={{ height: TOPBAR_H, minHeight: TOPBAR_H }}
          className="flex shrink-0 items-center border-b border-border"
        >
          {collapsed ? (
            /* Collapsed: only expand arrow, centred */
            <div className="flex w-full items-center justify-center">
              <button
                onClick={() => setCollapsed(false)}
                aria-label="Expand sidebar"
                className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Expanded: logo + name + collapse arrow */
            <div className="flex w-full items-center gap-2 px-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                <CheckSquare className="h-4 w-4" />
              </div>
              <span className="flex-1 text-sm font-semibold tracking-tight">Taskify</span>
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Nav — icons always visible, labels + project list hidden when collapsed */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          <NavItem
            to="/"
            icon={<LayoutDashboard className="h-4 w-4 shrink-0" />}
            label="Dashboard"
            collapsed={collapsed}
            end
          />
          <NavItem
            to="/projects"
            icon={<FolderKanban className="h-4 w-4 shrink-0" />}
            label="Projects"
            collapsed={collapsed}
          />

          {/* Project list — hidden when collapsed */}
          <div
            className={cn(
              "mt-5 transition-[opacity] duration-150",
              collapsed ? "opacity-0 pointer-events-none select-none" : "opacity-100",
            )}
          >
            <span className="mb-1.5 block px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Projects
            </span>
            <div className="space-y-0.5">
              {projects === null ? (
                <div className="flex items-center px-2 py-1.5 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading…
                </div>
              ) : projects.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">No projects yet</p>
              ) : (
                projects.slice(0, 12).map((p) => (
                  <NavLink
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className={({ isActive }) =>
                      cn(
                        "block truncate rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                        isActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )
                    }
                  >
                    {p.name}
                  </NavLink>
                ))
              )}
            </div>

            <button
              onClick={() => setNewOpen(true)}
              className="mt-2 flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              New Project
            </button>
          </div>
        </nav>

        {/* Bottom — theme toggle, icon always visible, label hidden when collapsed */}
        <div className="shrink-0 border-t border-border p-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground",
              collapsed ? "justify-center px-0" : "px-2",
            )}
          >
            {theme === "dark"
              ? <Sun  className="h-4 w-4 shrink-0" />
              : <Moon className="h-4 w-4 shrink-0" />
            }
            <span
              className={cn(
                "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200",
                collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[160px]",
              )}
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div
        style={{ paddingLeft: sidebarW }}
        className="flex min-h-screen w-full flex-1 flex-col transition-[padding-left] duration-200 ease-in-out"
      >
        {/* Top bar */}
        <header
          style={{ height: TOPBAR_H, minHeight: TOPBAR_H }}
          className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-5 backdrop-blur md:px-8"
        >
          <div className="min-w-0 flex-1">
            {meta.title ? (
              <>
                <h1 className="truncate text-base font-semibold tracking-tight leading-tight">{meta.title}</h1>
                {meta.description && (
                  <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
                )}
              </>
            ) : (
              <span className="text-sm font-semibold md:hidden">Taskify</span>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative shrink-0" ref={dropRef}>
            <button
              onClick={() => setDropOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={dropOpen}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-accent"
            >
              <Avatar name={user?.name} email={user?.email} size={26} />
              <span className="hidden sm:block">{user?.name || user?.email}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
                  dropOpen && "rotate-180",
                )}
              />
            </button>

            <div
              className={cn(
                "absolute right-0 top-full mt-1.5 w-52 origin-top-right rounded-lg border border-border bg-popover py-1 shadow-sm",
                "transition-all duration-150",
                dropOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none",
              )}
            >
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-xs font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <button
                onClick={() => { setDropOpen(false); logout(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-8 md:px-8 md:py-10">
          <Outlet context={{ reloadProjects: loadProjects }} />
        </main>
      </div>

      <NewProjectDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={() => loadProjects()}
      />
    </div>
  );
}

// ── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  to,
  icon,
  label,
  collapsed,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "mb-0.5 flex items-center gap-2.5 rounded-md py-2 text-sm transition-colors duration-150",
          collapsed ? "justify-center px-0" : "px-2.5",
          isActive
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )
      }
    >
      {icon}
      <span
        className={cn(
          "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200",
          collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[160px]",
        )}
      >
        {label}
      </span>
    </NavLink>
  );
}
