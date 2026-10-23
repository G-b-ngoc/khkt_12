"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ICONS } from "@/components/ui/Icons";
import type { NavItem } from "./PillBottomNav";

export function Sidebar({
  items,
  highlightHref,
  footer,
}: {
  items: NavItem[];
  /** href của mục cần nổi bật khác biệt (ví dụ "Hòm thư" của Cấp 3) */
  highlightHref?: string;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 flex-col border-r border-border bg-surface md:flex">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const isHighlight = item.href === highlightHref;
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : isHighlight
                    ? "bg-warning/10 text-warning hover:bg-warning/15"
                    : "text-text-muted hover:bg-surface-muted hover:text-text"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="border-t border-border p-3">{footer}</div>}
    </aside>
  );
}
