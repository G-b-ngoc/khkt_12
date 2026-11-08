"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ICONS } from "@/components/ui/Icons";
import { LogoWithWordmark } from "@/components/ui/Logo";
import { getActiveHref, type NavItem } from "./PillBottomNav";

/** Chữ cái đầu của từ đầu + từ cuối trong họ tên (vd. "Lê Thu Hà" -> "LH"), dùng cho ô avatar. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

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
  const activeHref = getActiveHref(pathname, items);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-rail text-rail-fg md:flex">
      <div className="px-4 pb-3 pt-5">
        <LogoWithWordmark size="sm" onDark />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Điều hướng chính">
        {items.map((item) => {
          const active = item.href === activeHref;
          const isHighlight = item.href === highlightHref;
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors duration-150",
                active
                  ? "bg-rail-active font-semibold text-rail-fg"
                  : "font-medium text-rail-muted hover:bg-white/5 hover:text-rail-fg"
              )}
            >
              <Icon
                className={clsx(
                  "h-[18px] w-[18px] shrink-0 transition-transform duration-150",
                  !active && "group-hover:scale-110"
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {isHighlight && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-label="Mục quan trọng" />
              )}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {initials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-rail-fg">{user.name}</span>
            <span className="block truncate text-[11px] text-rail-muted">{user.roleLabel}</span>
          </span>
        </div>
      )}
      {footer && <div className="border-t border-white/10 p-3">{footer}</div>}
    </aside>
  );
}
