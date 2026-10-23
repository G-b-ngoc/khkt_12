"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type ReportRow = {
  id: string;
  scope: "CLASS" | "SCHOOL";
  classCode: string;
  weekStart: string;
  weekEnd: string;
  status: "DRAFT" | "PREVIEW" | "APPROVED" | "SENT" | "POSTPONED" | "CANCELLED" | "FAILED";
  hasIssues: boolean;
};

function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

const STATUS_TONE: Record<ReportRow["status"], "neutral" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  PREVIEW: "warning",
  APPROVED: "warning",
  SENT: "success",
  POSTPONED: "warning",
  CANCELLED: "danger",
  FAILED: "danger",
};
const STATUS_LABEL: Record<ReportRow["status"], string> = {
  DRAFT: "Bản nháp",
  PREVIEW: "Đang xem trước",
  APPROVED: "Đã duyệt",
  SENT: "Đã gửi",
  POSTPONED: "Đã hoãn",
  CANCELLED: "Đã hủy",
  FAILED: "Gửi lỗi",
};

export default function AdminReportsPage() {
  const { show } = useToast();
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [generating, setGenerating] = useState(false);

  function load() {
    fetch("/api/admin/reports")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setReports)
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function generate() {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Không thể tạo bản dự thảo");
        return;
      }
      show("success", `Đã tạo/cập nhật ${data.count} bản dự thảo cho tuần này`);
      load();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold text-text">Hòm thư — Báo cáo cuối tuần</h2>
      <p className="text-sm text-text-muted">
        Chỉ Cấp 3 được tạo, duyệt và quyết định gửi báo cáo tổng hợp. Hệ thống không tự gửi khi chưa được phê duyệt.
      </p>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Tuần bắt đầu (Thứ Hai)</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <Button onClick={generate} loading={generating}>Tạo bản dự thảo cho tuần này</Button>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && reports === null && <p className="text-sm text-text-muted">Đang tải...</p>}
      {reports !== null && reports.length === 0 && (
        <Card className="p-5 text-sm text-text-muted">Chưa có báo cáo nào — hãy tạo bản dự thảo.</Card>
      )}

      <div className="flex flex-col gap-2">
        {reports?.map((r) => (
          <Link key={r.id} href={`/admin/reports/${r.id}`}>
            <Card className="flex items-center justify-between p-4 transition-colors hover:border-accent/40">
              <div>
                <p className="font-medium text-text">
                  {r.scope === "SCHOOL" ? "Toàn trường" : r.classCode}
                </p>
                <p className="text-xs text-text-muted">
                  Tuần {new Date(r.weekStart).toLocaleDateString("vi-VN")} – {new Date(r.weekEnd).toLocaleDateString("vi-VN")}
                  {r.hasIssues && " · ⚠ có cảnh báo dữ liệu"}
                </p>
              </div>
              <StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
