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

export type PillTone = "neutral" | "accent" | "success" | "warning" | "danger" | "violet";

/**
 * Thẻ thống kê dùng chung (dashboard, Theo dõi Cấp 2/Cấp 3). Gọn trên điện thoại (p-3, chữ
 * nhỏ hơn) để 5-7 thẻ không chiếm hết màn hình trước khi tới bảng dữ liệu.
 */
export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: Exclude<PillTone, "neutral">;
}) {
  const toneClass: Record<Exclude<PillTone, "neutral">, string> = {
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    violet: "text-violet",
  };
  return (
    <Card className="p-3 transition-shadow duration-200 hover:shadow-float sm:p-4">
      <p className="truncate text-xs text-text-muted">{label}</p>
      <p className={clsx("text-xl font-semibold tabular-nums sm:text-2xl", tone ? toneClass[tone] : "text-text")}>
        {value}
      </p>
    </Card>
  );
}

/** Nhãn trạng thái: nền màu nhạt (*-soft) + chấm tròn cùng màu chữ, đọc rõ ở cả chế độ sáng/tối. */
export function StatusPill({
  tone,
  children,
}: {
  tone: PillTone;
  children: React.ReactNode;
}) {
  const toneClass: Record<PillTone, string> = {
    neutral: "bg-surface-muted text-text-muted",
    accent: "bg-accent-soft text-accent-ink",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    violet: "bg-violet-soft text-violet",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2 pr-2.5 text-xs font-semibold",
        toneClass[tone]
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}
