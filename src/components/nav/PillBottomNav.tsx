"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ICONS, type IconName } from "@/components/ui/Icons";

export type NavItem = {
  href: string;
  label: string;
  /** Tên icon (string) — không truyền function/component qua ranh giới Server->Client. */
  icon: IconName;
};

/**
 * href của mục đang chọn: mục có href DÀI NHẤT khớp với pathname (khớp chính xác, hoặc là
 * tiền tố theo segment). Nhờ vậy mục gốc như "/teacher" không bị sáng cùng lúc với
 * "/teacher/comments" khi đang ở trang con.
 */
export function getActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches = pathname === item.href || pathname.startsWith(item.href + "/");
    if (matches && (best === null || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export function PillBottomNav({
  items,
  className,
}: {
  items: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname, items);

  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]",
        className
      )}
      aria-label="Điều hướng chính"
    >
      <div
        className={clsx(
          "scroll-touch flex w-full max-w-lg items-stretch gap-1 overflow-x-auto rounded-[22px] border border-border bg-surface/95 p-1.5 shadow-float backdrop-blur"
        )}
      >
        {items.map((item) => {
          const active = item.href === activeHref;
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "group flex min-w-[68px] flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors duration-150",
                active ? "bg-accent-soft text-accent-ink" : "text-text-muted hover:bg-surface-muted hover:text-text"
              )}
            >
              <Icon
                className={clsx(
                  "h-5 w-5 transition-transform duration-150",
                  !active && "group-hover:scale-110"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
