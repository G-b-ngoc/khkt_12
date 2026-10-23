"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Report = {
  id: string;
  weekStart: string;
  weekEnd: string;
  content: Record<string, unknown>;
  approvedAt: string | null;
};

export default function TeacherReportPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teacher/reports")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setReports)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold text-text">Báo cáo cuối tuần — Lớp của bạn</h2>
      <p className="text-sm text-text-muted">
        Chỉ hiển thị báo cáo đã được Quản trị viên phê duyệt và gửi cho lớp bạn.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && reports === null && <p className="text-sm text-text-muted">Đang tải...</p>}
      {reports !== null && reports.length === 0 && (
        <Card className="p-5 text-sm text-text-muted">
          Chưa có báo cáo cuối tuần nào được gửi cho lớp bạn.
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {reports?.map((r) => (
          <Card key={r.id} className="p-5">
            <p className="text-sm font-semibold text-text">
              Tuần {new Date(r.weekStart).toLocaleDateString("vi-VN")} – {new Date(r.weekEnd).toLocaleDateString("vi-VN")}
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-text-muted">
              {JSON.stringify(r.content, null, 2)}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
