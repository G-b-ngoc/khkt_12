import clsx from "clsx";
import Image from "next/image";

const SIZE_CLASS = {
  sm: { ring: "h-9 w-9 p-[2px]", pad: "p-1" },
  md: { ring: "h-11 w-11 p-[2.5px]", pad: "p-1.5" },
  lg: { ring: "h-16 w-16 p-[3px]", pad: "p-2" },
} as const;

/**
 * Biểu tượng thương hiệu THB Phone Manager dùng chung toàn hệ thống (title bar, sidebar,
 * trang đăng nhập) — logo do người dùng cung cấp (`public/logo.png`, đã tách nền trong suốt),
 * đặt trong vòng viền gradient đỏ lấy cảm hứng phong cách avatar cao cấp (vòng gradient quanh
 * hình tròn) để đồng bộ với theme — không sao chép nhận diện của bên thứ ba.
 */
export function Logo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { ring, pad } = SIZE_CLASS[size];
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 rounded-full transition-transform duration-200 ease-out hover:scale-105",
        ring,
        className
      )}
      style={{
        background:
          "linear-gradient(135deg, var(--brand-ring-from), var(--brand-ring-via), var(--brand-ring-to))",
      }}
    >
      <span className={clsx("relative h-full w-full rounded-full bg-white", pad)}>
        <Image
          src="/logo.png"
          alt="THB Phone Manager"
          fill
          sizes="64px"
          className="object-contain"
          priority
        />
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
