"use client";

import { useEffect, useState } from "react";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { useToast } from "@/components/ui/Toast";

type AccountRow = {
  id: string;
  username: string;
  fullName: string;
  role: "MANAGER" | "TEACHER" | "ADMIN";
  isLocked: boolean;
  lastLoginAt: string | null;
  classes: string[];
};
type ClassOpt = { id: string; code: string; name: string };

const ROLE_LABEL: Record<AccountRow["role"], string> = {
  MANAGER: "Cấp 1 — Quản lý lớp",
  TEACHER: "Cấp 2 — Giáo viên",
  ADMIN: "Cấp 3 — Quản trị",
};

export default function AdminAccountsPage() {
  const { show } = useToast();
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AccountRow["role"]>("MANAGER");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<AccountRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  function load() {
    fetch("/api/admin/accounts")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setAccounts)
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);
  useEffect(() => {
    fetch("/api/admin/classes").then((r) => r.json()).then(setClasses).catch(() => {});
  }, []);

  async function create() {
    if (!username.trim() || !fullName.trim() || password.length < 8 || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, fullName, password, role, classIds: role === "ADMIN" ? [] : classIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Không thể tạo tài khoản");
        return;
      }
      show("success", `Đã tạo tài khoản ${username}`);
      setCreateOpen(false);
      setUsername("");
      setFullName("");
      setPassword("");
      setClassIds([]);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock(acc: AccountRow) {
    const res = await fetch(`/api/admin/accounts/${acc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: acc.isLocked ? "UNLOCK" : "LOCK" }),
    });
    const data = await res.json();
    if (!res.ok) {
      show("error", data.error ?? "Thất bại");
      return;
    }
    show("success", acc.isLocked ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản (mọi phiên đang mở bị thu hồi)");
    load();
  }

  async function doReset() {
    if (!resetTarget || newPassword.length < 8) return;
    const res = await fetch(`/api/admin/accounts/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESET_PASSWORD", newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      show("error", data.error ?? "Thất bại");
      return;
    }
    show("success", "Đã đặt lại mật khẩu — tài khoản phải đăng nhập lại");
    setResetTarget(null);
    setNewPassword("");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Quản lý tài khoản</h2>
        <Button onClick={() => setCreateOpen(true)}>+ Tạo tài khoản</Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && accounts === null && <p className="text-sm text-text-muted">Đang tải...</p>}

      <div className="flex flex-col gap-2">
        {accounts?.map((acc) => (
          <Card key={acc.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-text">{acc.fullName} <span className="text-text-muted">· @{acc.username}</span></p>
                <p className="text-xs text-text-muted">
                  {ROLE_LABEL[acc.role]} {acc.classes.length > 0 && `· Lớp ${acc.classes.join(", ")}`}
                </p>
              </div>
              <StatusPill tone={acc.isLocked ? "danger" : "success"}>{acc.isLocked ? "Bị khóa" : "Hoạt động"}</StatusPill>
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              <button onClick={() => toggleLock(acc)} className="text-accent hover:underline">
                {acc.isLocked ? "Mở khóa" : "Khóa tài khoản"}
              </button>
              <button onClick={() => setResetTarget(acc)} className="text-warning hover:underline">
                Đặt lại mật khẩu
              </button>
            </div>
          </Card>
        ))}
      </div>

      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo tài khoản mới">
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Tên đăng nhập</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Họ tên</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Mật khẩu ban đầu (≥8 ký tự)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Vai trò</label>
            <select value={role} onChange={(e) => setRole(e.target.value as AccountRow["role"])} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
              <option value="MANAGER">Cấp 1 — Quản lý lớp</option>
              <option value="TEACHER">Cấp 2 — Giáo viên</option>
              <option value="ADMIN">Cấp 3 — Quản trị</option>
            </select>
          </div>
          {role !== "ADMIN" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Gán lớp (chọn nhiều)</label>
              <select
                multiple
                value={classIds}
                onChange={(e) => setClassIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="h-28 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button className="w-full" onClick={create} loading={saving} disabled={!username.trim() || !fullName.trim() || password.length < 8}>
            Tạo tài khoản
          </Button>
        </div>
      </SlideOver>

      <SlideOver open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Đặt lại mật khẩu cho ${resetTarget?.username ?? ""}`}>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mật khẩu mới (≥8 ký tự)"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <p className="mt-2 text-xs text-text-muted">Quản trị viên không thể xem mật khẩu hiện tại — chỉ có thể đặt mật khẩu mới.</p>
        <Button className="mt-3 w-full" onClick={doReset} disabled={newPassword.length < 8}>
          Xác nhận đặt lại
        </Button>
      </SlideOver>
    </div>
  );
}
