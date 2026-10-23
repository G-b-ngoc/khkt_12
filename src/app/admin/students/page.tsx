"use client";

import { useEffect, useState } from "react";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { useToast } from "@/components/ui/Toast";

type StudentRow = {
  id: string;
  studentCode: string;
  fullName: string;
  classCode: string;
  classId: string;
  status: "ACTIVE" | "ARCHIVED";
  transactionCount: number;
};
type ClassOpt = { id: string; code: string; name: string };

export default function AdminStudentsPage() {
  const { show } = useToast();
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/admin/students${includeArchived ? "?includeArchived=1" : ""}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setStudents)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [includeArchived]);
  useEffect(() => {
    fetch("/api/admin/classes")
      .then((r) => r.json())
      .then((cs) => {
        setClasses(cs);
        if (cs[0]) setClassId(cs[0].id);
      })
      .catch(() => {});
  }, []);

  async function create() {
    if (!code.trim() || !name.trim() || !classId || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode: code, fullName: name, classId }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Không thể thêm học sinh");
        return;
      }
      show("success", "Đã thêm học sinh");
      setOpen(false);
      setCode("");
      setName("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, action: "ARCHIVE" | "UNARCHIVE" | "DELETE") {
    const res = await fetch(`/api/admin/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      show("error", data.error ?? "Thất bại");
      return;
    }
    show(
      "success",
      data.message ?? (action === "DELETE" ? "Đã xóa học sinh" : action === "ARCHIVE" ? "Đã lưu trữ" : "Đã khôi phục")
    );
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Quản lý học sinh</h2>
        <Button onClick={() => setOpen(true)}>+ Thêm học sinh</Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
        Hiện cả học sinh đã lưu trữ
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && students === null && <p className="text-sm text-text-muted">Đang tải...</p>}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              <th className="px-4 py-2.5">Học sinh</th>
              <th className="px-4 py-2.5">Lớp</th>
              <th className="px-4 py-2.5">Trạng thái</th>
              <th className="px-4 py-2.5 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {students?.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-text">{s.fullName}</p>
                  <p className="text-xs text-text-muted">{s.studentCode}</p>
                </td>
                <td className="px-4 py-2.5">{s.classCode}</td>
                <td className="px-4 py-2.5">
                  <StatusPill tone={s.status === "ACTIVE" ? "success" : "neutral"}>
                    {s.status === "ACTIVE" ? "Hoạt động" : "Đã lưu trữ"}
                  </StatusPill>
                </td>
                <td className="px-4 py-2.5 text-right text-xs">
                  {s.status === "ACTIVE" ? (
                    <button onClick={() => act(s.id, "ARCHIVE")} className="text-warning hover:underline">
                      Lưu trữ
                    </button>
                  ) : (
                    <button onClick={() => act(s.id, "UNARCHIVE")} className="mr-3 text-accent hover:underline">
                      Khôi phục
                    </button>
                  )}
                  {" · "}
                  <button onClick={() => act(s.id, "DELETE")} className="text-danger hover:underline">
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Thêm học sinh mới">
        <label className="mb-1.5 block text-sm font-medium text-text">Mã học sinh</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <label className="mb-1.5 block text-sm font-medium text-text">Họ tên</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <label className="mb-1.5 block text-sm font-medium text-text">Lớp</label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
          ))}
        </select>
        <Button className="mt-4 w-full" onClick={create} loading={saving} disabled={!code.trim() || !name.trim() || !classId}>
          Thêm học sinh
        </Button>
      </SlideOver>
    </div>
  );
}
