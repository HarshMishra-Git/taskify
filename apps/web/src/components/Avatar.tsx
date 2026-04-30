export function Avatar({ name, email, size = 28 }: { name?: string; email?: string; size?: number }) {
  const label = (name || email || "?").trim();
  const initials = label
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || label.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-medium text-foreground"
      style={{ width: size, height: size }}
      aria-label={label}
    >
      {initials}
    </div>
  );
}
