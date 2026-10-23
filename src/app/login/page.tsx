"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const ROLE_HOME: Record<string, string> = {
  MANAGER: "/manager",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return; // chống gửi yêu cầu lặp
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Đăng nhập thất bại");
        setSubmitting(false);
        return;
      }
      router.push(ROLE_HOME[data.role] ?? "/");
      router.refresh();
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-xl font-semibold text-accent-foreground shadow-card">
            TP
          </div>
          <h1 className="text-xl font-semibold text-text">THB Phone Manager</h1>
          <p className="mt-1 text-sm text-text-muted">Đăng nhập để tiếp tục</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-text">
                Tên đăng nhập
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
