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

export function PillBottomNav({
  items,
  className,
}: {
  items: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)]",
        className
      )}
      aria-label="Điều hướng chính"
    >
      <div
        className={clsx(
          "flex w-full max-w-lg items-stretch gap-1 overflow-x-auto rounded-[var(--radius-pill)] border border-border bg-surface/95 p-1.5 shadow-float backdrop-blur",
          items.length <= 5 && "justify-center"
        )}
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-[calc(var(--radius-pill)-4px)] px-2 py-2 text-[11px] font-medium transition-colors",
                active ? "bg-accent/10 text-accent" : "text-text-muted hover:text-text"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
