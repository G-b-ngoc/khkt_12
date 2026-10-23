"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { useToast } from "@/components/ui/Toast";

type ClassRow = {
  id: string;
  code: string;
  name: string;
  studentCount: number;
  managers: string[];
  teachers: string[];
};

export default function AdminClassesPage() {
  const { show } = useToast();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/classes")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setClasses)
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function create() {
    if (!code.trim() || !name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Không thể tạo lớp");
        return;
      }
      show("success", `Đã tạo lớp ${code}`);
      setOpen(false);
      setCode("");
      setName("");
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Quản lý lớp</h2>
        <Button onClick={() => setOpen(true)}>+ Thêm lớp</Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && classes === null && <p className="text-sm text-text-muted">Đang tải...</p>}

      <div className="flex flex-col gap-2">
        {classes?.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">{c.code} — {c.name}</p>
                <p className="text-xs text-text-muted">{c.studentCount} học sinh</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
              <span>Quản lý: {c.managers.join(", ") || "chưa có"}</span>
              <span>GVCN: {c.teachers.join(", ") || "chưa có"}</span>
            </div>
          </Card>
        ))}
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Thêm lớp mới">
        <label className="mb-1.5 block text-sm font-medium text-text">Mã lớp</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="VD: 12A3"
          className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <label className="mb-1.5 block text-sm font-medium text-text">Tên lớp</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Lớp 12A3"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <Button className="mt-4 w-full" onClick={create} loading={saving} disabled={!code.trim() || !name.trim()}>
          Tạo lớp
        </Button>
      </SlideOver>
    </div>
  );
}
