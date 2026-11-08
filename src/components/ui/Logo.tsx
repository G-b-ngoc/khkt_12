import clsx from "clsx";
import Image from "next/image";

const SIZE_PX = {
  sm: { outer: 36, ring: 2, pad: 4 },
  md: { outer: 44, ring: 2.5, pad: 6 },
  lg: { outer: 64, ring: 3, pad: 9 },
} as const;

/**
 * Biểu tượng thương hiệu THB Phone Manager dùng chung toàn hệ thống (title bar, sidebar,
 * trang đăng nhập) — logo do người dùng cung cấp (`public/logo.png`, đã tách nền trong suốt).
 * Vòng ngoài là dải cầu vồng 7 sắc đứng im, lớp trong có ánh bóng mô phỏng mặt kính —
 * cùng 1 component nên mobile (title bar/login) và desktop (sidebar) hiển thị giống nhau.
 */
export function Logo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { outer, ring, pad } = SIZE_PX[size];
  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 rounded-full transition-transform duration-200 ease-out hover:scale-105",
        className
      )}
      style={{ width: outer, height: outer }}
    >
      <span aria-hidden className="logo-rainbow-ring absolute inset-0 rounded-full" />
      <span
        className="absolute overflow-hidden rounded-full bg-white"
        style={{ inset: ring }}
      >
        <span className="relative block h-full w-full" style={{ padding: pad }}>
          <Image
            src="/logo.png"
            alt="THB Phone Manager"
            fill
            sizes="64px"
            className="object-contain"
            priority
          />
        </span>
        <span aria-hidden className="logo-gloss pointer-events-none absolute inset-0 rounded-full" />
      </span>
    </span>
  );
}

/** Logo + tên thương hiệu, dùng ở phần đầu sidebar / trang đăng nhập. */
export function LogoWithWordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-text">THB Phone Manager</span>
        <span className="text-[11px] text-text-muted">Quản lý cất/trả điện thoại</span>
      </span>
    </span>
  );
}
