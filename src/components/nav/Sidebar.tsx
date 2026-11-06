"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ICONS } from "@/components/ui/Icons";
import { LogoWithWordmark } from "@/components/ui/Logo";
import type { NavItem } from "./PillBottomNav";

export function Sidebar({
  items,
  highlightHref,
  user,
  footer,
}: {
  items: NavItem[];
  /** href của mục cần nổi bật khác biệt (ví dụ "Hòm thư" của Cấp 3) */
  highlightHref?: string;
  /** Hiển thị ở khu vực thông tin người dùng, phía trên nút đăng xuất. */
  user?: { name: string; roleLabel: string };
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <div className="border-b border-border px-4 py-4">
        <LogoWithWordmark size="sm" />
      </div>

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
                "group relative flex items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent/10 text-accent"
                  : isHighlight
                    ? "bg-warning/10 text-warning hover:bg-warning/15"
                    : "text-text-muted hover:translate-x-0.5 hover:bg-surface-muted hover:text-text"
              )}
            >
              <span
                className={clsx(
                  "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent transition-opacity duration-150",
                  active ? "opacity-100" : "opacity-0"
                )}
                aria-hidden
              />
              <Icon
                className={clsx(
                  "h-[18px] w-[18px] shrink-0 transition-transform duration-150",
                  !active && "group-hover:scale-110"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-border px-4 py-3">
          <p className="truncate text-sm font-medium text-text">{user.name}</p>
          <p className="truncate text-xs text-text-muted">{user.roleLabel}</p>
        </div>
      )}
      {footer && <div className="border-t border-border p-3">{footer}</div>}
    </aside>
  );
}
