import clsx from "clsx";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-card)] border border-border bg-surface shadow-card",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const toneClass: Record<typeof tone, string> = {
    neutral: "bg-surface-muted text-text-muted border-border",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger: "bg-danger/10 text-danger border-danger/30",
  };
  const icon: Record<typeof tone, string> = {
    neutral: "●",
    success: "✓",
    warning: "!",
    danger: "✕",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClass[tone]
      )}
    >
      <span aria-hidden>{icon[tone]}</span>
      {children}
    </span>
  );
}
