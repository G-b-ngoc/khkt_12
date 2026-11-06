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

/** Thẻ thống kê dùng chung (dashboard, Theo dõi Cấp 2/Cấp 3) — nâng nhẹ + đổ bóng mềm khi hover. */
export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-text";
  return (
    <Card className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={clsx("text-2xl font-semibold", toneClass)}>{value}</p>
    </Card>
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
