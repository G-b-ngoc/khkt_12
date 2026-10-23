"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<{ show: (kind: ToastKind, message: string) => void } | null>(
  null
);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải dùng trong ToastProvider");
  return ctx;
}

const KIND_STYLE: Record<ToastKind, string> = {
  success: "border-success/30 bg-white text-text before:bg-success",
  error: "border-danger/30 bg-white text-text before:bg-danger",
  info: "border-border bg-white text-text before:bg-accent",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border pl-4 pr-4 py-3 text-sm shadow-float before:absolute before:left-0 before:top-0 before:h-full before:w-1 animate-[toast-in_0.18s_ease-out] ${KIND_STYLE[t.kind]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
