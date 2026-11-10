import clsx from "clsx";
import Image from "next/image";

const SIZE_PX = {
  sm: { outer: 36, img: 28, radius: 10 },
  md: { outer: 44, img: 34, radius: 12 },
  lg: { outer: 64, img: 50, radius: 18 },
  xl: { outer: 80, img: 62, radius: 22 },
} as const;

/**
 * Biểu tượng thương hiệu EduPhone Manager dùng chung toàn hệ thống (title bar, sidebar,
 * trang đăng nhập) — logo do người dùng cung cấp (`public/logo.png`). Logo đã có màu xanh mực
 * nên chỉ đặt trên ô trắng bo góc, viền mảnh: rõ trên cả nền sáng lẫn nền thanh điều hướng đậm.
 */
export function Logo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const { outer, img, radius } = SIZE_PX[size];
  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center border border-black/5 bg-white shadow-sm",
        className
      )}
      style={{ width: outer, height: outer, borderRadius: radius }}
    >
      <Image
        src="/logo.png"
        alt="EduPhone Manager"
        width={img}
        height={img}
        sizes={`${img}px`}
        className="object-contain"
        priority
      />
    </span>
  );
}

/** Logo + tên thương hiệu, dùng ở phần đầu sidebar (nền đậm) hoặc nền sáng. */
export function LogoWithWordmark({
  size = "md",
  onDark = false,
  className,
}: {
  size?: "sm" | "md";
  /** true khi đặt trên nền thanh điều hướng đậm (--rail). */
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <span className="flex flex-col leading-tight">
        <span className={clsx("text-sm font-semibold", onDark ? "text-rail-fg" : "text-text")}>
          EduPhone Manager
        </span>
        <span className={clsx("text-[11px]", onDark ? "text-rail-muted" : "text-text-muted")}>
          Quản lý cất/trả điện thoại
        </span>
      </span>
    </span>
  );
}
