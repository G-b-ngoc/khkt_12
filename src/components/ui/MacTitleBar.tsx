import Link from "next/link";
import clsx from "clsx";
import { Logo } from "@/components/ui/Logo";

export function MacTitleBar({
  title,
  subtitle,
  titleHref,
  hideLogoOnDesktop = false,
}: {
  title: string;
  subtitle?: string;
  /** Nếu có, tiêu đề trở thành link (dùng cho trang tổng quan ngoài 4-5 mục nav chính). */
  titleHref?: string;
  /** true ở layout có sidebar: sidebar đã hiện logo trên desktop, tránh lặp logo 2 lần. */
  hideLogoOnDesktop?: boolean;
}) {
  const titleEl = (
    <span className="truncate text-sm font-semibold text-text">{title}</span>
  );
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-2.5 backdrop-blur">
      <Logo size="sm" className={clsx(hideLogoOnDesktop && "md:hidden")} />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {titleHref ? <Link href={titleHref}>{titleEl}</Link> : titleEl}
        {subtitle && <span className="truncate text-xs text-text-muted">{subtitle}</span>}
      </div>
    </div>
  );
}
