"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutIcon } from "@/components/ui/Icons";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={
        className ??
        // Mặc định dùng trong footer sidebar (nền --rail đậm); trang tài khoản truyền className riêng.
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rail-muted transition-colors hover:bg-white/5 hover:text-rail-fg disabled:opacity-50"
      }
    >
      <LogoutIcon className="h-4 w-4" />
      {loading ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
