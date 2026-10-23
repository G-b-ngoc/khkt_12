"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
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
      <div className="flex w-full max-w-md items-stretch gap-1 rounded-[var(--radius-pill)] border border-border bg-surface/95 p-1.5 shadow-float backdrop-blur">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 rounded-[calc(var(--radius-pill)-4px)] px-2 py-2 text-[11px] font-medium transition-colors",
                active ? "bg-accent/10 text-accent" : "text-text-muted hover:text-text"
              )}
            >
              {item.icon({ className: "h-5 w-5" })}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
