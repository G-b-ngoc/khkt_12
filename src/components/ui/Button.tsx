"use client";

import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "lg";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent/90 disabled:bg-accent/40",
  secondary:
    "bg-surface-muted text-text border border-border hover:bg-border/60 disabled:opacity-50",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/40",
  ghost: "bg-transparent text-text hover:bg-surface-muted disabled:opacity-40",
};

const SIZE_CLASS: Record<Size, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-4 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
