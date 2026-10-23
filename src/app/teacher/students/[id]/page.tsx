"use client";

import { useEffect, useState, use as useParam } from "react";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { useToast } from "@/components/ui/Toast";

type Detail = {
  id: string;
  studentCode: string;
  fullName: string;
  classCode: string;
  status: "IN" | "OUT";
  statusLabel: string;
  transactions: { id: string; type: "CHECK_IN" | "CHECK_OUT"; performedBy: string; createdAt: string }[];
  comments: {
    id: string;
    content: string;
    authorName: string;
    createdAt: string;
    updatedAt: string;
    editable: boolean;
  }[];
};

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = useParam(params);
  const { show } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/teacher/students/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openNew() {
    setEditingId(null);
    setDraft("");
    setPanelOpen(true);
  }

  function openEdit(commentId: string, content: string) {
    setEditingId(commentId);
    setDraft(content);
    setPanelOpen(true);
  }

  async function save() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`/api/teacher/comments/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: draft }),
          })
        : await fetch(`/api/teacher/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: id, content: draft }),
          });
      const result = await res.json();
      if (!res.ok) {
        show("error", result.error ?? "Không thể lưu nhận xét");
        return;
      }
      show("success", editingId ? "Đã cập nhật nhận xét" : "Đã thêm nhận xét");
      setPanelOpen(false);
      load();
    } catch {
      show("error", "Không thể kết nối tới máy chủ");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-text-muted">Đang tải...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-text">{data.fullName}</p>
            <p className="text-sm text-text-muted">{data.studentCode} · Lớp {data.classCode}</p>
          </div>
          <StatusPill tone={data.status === "IN" ? "success" : "neutral"}>{data.statusLabel}</StatusPill>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-text">Lịch sử cất/trả (chỉ xem)</h3>
        {data.transactions.length === 0 ? (
          <p className="text-sm text-text-muted">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {data.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between border-t border-border pt-2 first:border-t-0 first:pt-0">
                <span>{t.type === "CHECK_IN" ? "Cất điện thoại" : "Trả điện thoại"} · {t.performedBy}</span>
                <span className="text-text-muted">{new Date(t.createdAt).toLocaleString("vi-VN")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Nhận xét của giáo viên</h3>
          <Button size="md" onClick={openNew}>+ Thêm nhận xét</Button>
        </div>
        {data.comments.length === 0 ? (
          <p className="text-sm text-text-muted">Chưa có nhận xét nào.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.comments.map((c) => (
              <li key={c.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm text-text">{c.content}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                  <span>
                    {c.authorName} · {new Date(c.createdAt).toLocaleString("vi-VN")}
                    {c.updatedAt !== c.createdAt && " (đã sửa)"}
                  </span>
                  {c.editable && (
                    <button onClick={() => openEdit(c.id, c.content)} className="text-accent hover:underline">
                      Sửa
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SlideOver open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? "Cập nhật nhận xét" : "Thêm nhận xét"}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          autoFocus
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Nhận xét về học sinh..."
        />
        <Button className="mt-3 w-full" onClick={save} loading={saving} disabled={!draft.trim()}>
          Lưu nhận xét
        </Button>
      </SlideOver>
    </div>
  );
}
