"use client";

import { useEffect } from "react";
import clsx from "clsx";

/**
 * Modal căn giữa (khác SlideOver trượt từ cạnh) — dùng cho các luồng cần tập trung chú ý,
 * ví dụ điều chỉnh trạng thái cất/trả của Cấp 2.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 animate-[modal-fade-in_0.15s_ease-out]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        className={clsx(
          "scroll-touch relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-float animate-[modal-pop-in_0.18s_ease-out] sm:p-6",
          maxWidthClassName
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-text-muted transition-colors duration-150 hover:bg-surface-muted hover:text-text"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-pop-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
