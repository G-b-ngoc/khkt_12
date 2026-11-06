import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function MacTitleBar({
  title,
  subtitle,
  titleHref,
}: {
  title: string;
  subtitle?: string;
  /** Nếu có, tiêu đề trở thành link (dùng cho trang tổng quan ngoài 4-5 mục nav chính). */
  titleHref?: string;
}) {
  const titleEl = (
    <span className="truncate text-sm font-semibold text-text">{title}</span>
  );
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
      <Logo size="sm" />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {titleHref ? <Link href={titleHref}>{titleEl}</Link> : titleEl}
        {subtitle && <span className="truncate text-xs text-text-muted">{subtitle}</span>}
      </div>
    </div>
  );
}
