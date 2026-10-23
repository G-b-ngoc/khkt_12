"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatusPill } from "@/components/ui/Card";

type StudentRow = {
  id: string;
  studentCode: string;
  fullName: string;
  classCode: string;
  status: "IN" | "OUT";
  statusLabel: string;
};

export default function TeacherDashboardPage() {
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/teacher/students?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
          return res.json();
        })
        .then(setStudents)
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const inCount = students?.filter((s) => s.status === "IN").length ?? 0;
  const total = students?.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-text-muted">Tổng học sinh</p>
          <p className="text-2xl font-semibold text-text">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">Đang cất tại trạm</p>
          <p className="text-2xl font-semibold text-accent">{inCount}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Danh sách học sinh</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc mã..."
            className="w-48 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {!error && students === null && <p className="text-sm text-text-muted">Đang tải...</p>}
        {students !== null && students.length === 0 && (
          <p className="text-sm text-text-muted">Không có học sinh phù hợp.</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {students?.map((s) => (
                <tr key={s.id} className="border-t border-border first:border-t-0">
                  <td className="py-2.5">
                    <Link href={`/teacher/students/${s.id}`} className="font-medium text-text hover:text-accent">
                      {s.fullName}
                    </Link>
                    <p className="text-xs text-text-muted">{s.studentCode} · {s.classCode}</p>
                  </td>
                  <td className="py-2.5 text-right">
                    <StatusPill tone={s.status === "IN" ? "success" : "neutral"}>
                      {s.statusLabel}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
