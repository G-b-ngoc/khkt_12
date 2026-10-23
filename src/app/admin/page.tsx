"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Dashboard = {
  classCount: number;
  studentCount: number;
  lockedAccounts: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  pendingReports: number;
  perClass: { classCode: string; studentCount: number; checkInsToday: number }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-text-muted">Đang tải...</p>;

  const stats = [
    { label: "Số lớp", value: data.classCount },
    { label: "Tổng học sinh", value: data.studentCount },
    { label: "Cất hôm nay", value: data.todayCheckIns },
    { label: "Trả hôm nay", value: data.todayCheckOuts },
    { label: "Tài khoản bị khóa", value: data.lockedAccounts },
    { label: "Báo cáo chờ xử lý", value: data.pendingReports },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-2xl font-semibold text-text">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-text">Theo lớp</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted">
              <th className="pb-2">Lớp</th>
              <th className="pb-2 text-right">Học sinh</th>
              <th className="pb-2 text-right">Cất hôm nay</th>
            </tr>
          </thead>
          <tbody>
            {data.perClass.map((c) => (
              <tr key={c.classCode} className="border-t border-border">
                <td className="py-2">{c.classCode}</td>
                <td className="py-2 text-right">{c.studentCount}</td>
                <td className="py-2 text-right">{c.checkInsToday}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
