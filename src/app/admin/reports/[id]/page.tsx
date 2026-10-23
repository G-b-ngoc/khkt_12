"use client";

import { useEffect, useState, use as useParam } from "react";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type Detail = {
  id: string;
  scope: "CLASS" | "SCHOOL";
  classCode: string | null;
  weekStart: string;
  weekEnd: string;
  status: string;
  content: Record<string, unknown> & { summary?: string };
  contentVersion: number;
  dataIssues: string[];
  approvedBy: string | null;
  approvedAt: string | null;
  recipients: string[];
  sendLogs: { recipient: string; status: string; adapter: string; error: string | null; createdAt: string }[];
};

const CAN_EDIT = new Set(["DRAFT", "PREVIEW", "POSTPONED"]);
const CAN_SEND = new Set(["DRAFT", "PREVIEW", "POSTPONED"]);

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = useParam(params);
  const { show } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [recipients, setRecipients] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/admin/reports/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then((d: Detail) => {
        setData(d);
        setSummary(d.content.summary ?? "");
        if (d.recipients.length) setRecipients(d.recipients.join(", "));
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  async function saveSummary() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const d = await res.json();
      if (!res.ok) return show("error", d.error ?? "Không thể lưu");
      show("success", "Đã lưu nội dung tổng hợp");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const list = recipients.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return show("error", "Cần ít nhất một email người nhận");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: list }),
      });
      const d = await res.json();
      if (!res.ok) return show("error", d.error ?? "Gửi thất bại");
      if (d.isPreviewOnly) {
        show("info", "Đã ghi nhận phê duyệt. SMTP chưa cấu hình nên đây là CHẾ ĐỘ XEM TRƯỚC — chưa gửi email thật.");
      } else {
        show(d.ok ? "success" : "error", d.ok ? "Đã gửi báo cáo" : "Một số người nhận gửi thất bại");
      }
      load();
    } finally {
      setBusy(false);
    }
  }

  async function postponeOrCancel(action: "postpone" | "cancel") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}/${action}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) return show("error", d.error ?? "Thất bại");
      show("success", action === "postpone" ? "Đã hoãn gửi báo cáo" : "Đã hủy báo cáo");
      load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-text-muted">Đang tải...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">
          {data.scope === "SCHOOL" ? "Báo cáo toàn trường" : `Lớp ${data.classCode}`}
        </h2>
        <StatusPill tone={data.status === "SENT" ? "success" : "neutral"}>{data.status}</StatusPill>
      </div>
      <p className="text-sm text-text-muted">
        Tuần {new Date(data.weekStart).toLocaleDateString("vi-VN")} – {new Date(data.weekEnd).toLocaleDateString("vi-VN")}
        {" · v"}{data.contentVersion}
      </p>

      {data.dataIssues.length > 0 && (
        <Card className="border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-medium text-warning">Cảnh báo dữ liệu</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-warning">
            {data.dataIssues.map((issue, i) => <li key={i}>{issue}</li>)}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-text">Dữ liệu tổng hợp (tự động, không chỉnh sửa)</h3>
        <pre className="max-h-64 overflow-auto rounded-lg bg-surface-muted p-3 text-xs text-text-muted">
          {JSON.stringify({ ...data.content, summary: undefined }, null, 2)}
        </pre>
      </Card>

      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-text">Nội dung tổng hợp (được phép chỉnh sửa)</h3>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          disabled={!CAN_EDIT.has(data.status)}
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
          placeholder="Nhận xét/tổng hợp thêm của quản trị viên trước khi gửi..."
        />
        {CAN_EDIT.has(data.status) && (
          <Button className="mt-2" size="md" onClick={saveSummary} loading={busy}>Lưu nội dung</Button>
        )}
      </Card>

      {CAN_SEND.has(data.status) ? (
        <Card className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-text">Người nhận</h3>
          <input
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="email1@truong.edu.vn, email2@truong.edu.vn"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={send} loading={busy}>Phê duyệt & Gửi</Button>
            <Button variant="secondary" onClick={() => postponeOrCancel("postpone")} disabled={busy}>Hoãn gửi</Button>
            <Button variant="danger" onClick={() => postponeOrCancel("cancel")} disabled={busy}>Hủy báo cáo</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-text-muted">
            Đã phê duyệt bởi <span className="font-medium text-text">{data.approvedBy}</span> lúc{" "}
            {data.approvedAt && new Date(data.approvedAt).toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-sm text-text-muted">Người nhận: {data.recipients.join(", ") || "—"}</p>
        </Card>
      )}

      {data.sendLogs.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-text">Trạng thái gửi</h3>
          <ul className="space-y-1 text-sm">
            {data.sendLogs.map((l, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{l.recipient} <span className="text-xs text-text-muted">({l.adapter})</span></span>
                <StatusPill tone={l.status === "SUCCESS" ? "success" : "danger"}>{l.status}</StatusPill>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
