"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { useToast } from "@/components/ui/Toast";

type Comment = {
  id: string;
  content: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  authorName: string;
  editable: boolean;
  createdAt: string;
  updatedAt: string;
};

type StudentRow = { id: string; studentCode: string; fullName: string };

export default function TeacherCommentsPage() {
  const { show } = useToast();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentId, setStudentId] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/teacher/comments")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setComments)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    fetch("/api/teacher/students")
      .then((r) => r.json())
      .then(setStudents)
      .catch(() => {});
  }, []);

  async function openNew() {
    setStudentId(students[0]?.id ?? "");
    setDraft("");
    setPanelOpen(true);
  }

  async function save() {
    if (!draft.trim() || !studentId || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, content: draft }),
      });
      const result = await res.json();
      if (!res.ok) {
        show("error", result.error ?? "Không thể lưu nhận xét");
        return;
      }
      show("success", "Đã thêm nhận xét");
      setPanelOpen(false);
      load();
    } catch {
      show("error", "Không thể kết nối tới máy chủ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Nhận xét của giáo viên</h2>
        <Button onClick={openNew}>+ Thêm nhận xét</Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && comments === null && <p className="text-sm text-text-muted">Đang tải...</p>}
      {comments !== null && comments.length === 0 && (
        <p className="text-sm text-text-muted">Chưa có nhận xét nào.</p>
      )}

      <div className="flex flex-col gap-3">
        {comments?.map((c) => (
          <Card key={c.id} className="p-4">
            <Link href={`/teacher/students/${c.studentId}`} className="text-sm font-medium text-accent hover:underline">
              {c.studentName} · {c.studentCode}
            </Link>
            <p className="mt-1 text-sm text-text">{c.content}</p>
            <p className="mt-1 text-xs text-text-muted">
              {c.authorName} · {new Date(c.createdAt).toLocaleString("vi-VN")}
            </p>
          </Card>
        ))}
      </div>

      <SlideOver open={panelOpen} onClose={() => setPanelOpen(false)} title="Thêm nhận xét">
        <label className="mb-1.5 block text-sm font-medium text-text">Học sinh</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} ({s.studentCode})
            </option>
          ))}
        </select>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Nhận xét về học sinh..."
        />
        <Button className="mt-3 w-full" onClick={save} loading={saving} disabled={!draft.trim() || !studentId}>
          Lưu nhận xét
        </Button>
      </SlideOver>
    </div>
  );
}
