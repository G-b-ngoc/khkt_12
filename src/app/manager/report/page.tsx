"use client";

import { useEffect, useState } from "react";
import { Card, StatusPill } from "@/components/ui/Card";

type Txn = {
  id: string;
  studentCode: string;
  fullName: string;
  type: "CHECK_IN" | "CHECK_OUT";
  performedBy: string;
  createdAt: string;
};

export default function ManagerReportPage() {
  const [items, setItems] = useState<Txn[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/manager/transactions/today")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-4 text-lg font-semibold text-text">Hoạt động hôm nay</h2>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && items === null && <p className="text-sm text-text-muted">Đang tải...</p>}
      {items !== null && items.length === 0 && (
        <p className="text-sm text-text-muted">Chưa có giao dịch nào hôm nay.</p>
      )}

      <div className="flex flex-col gap-2">
        {items?.map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-medium text-text">
                {t.fullName} <span className="text-text-muted">· {t.studentCode}</span>
              </p>
              <p className="text-xs text-text-muted">
                {new Date(t.createdAt).toLocaleTimeString("vi-VN")} · {t.performedBy}
              </p>
            </div>
            <StatusPill tone={t.type === "CHECK_IN" ? "success" : "neutral"}>
              {t.type === "CHECK_IN" ? "Đã cất" : "Đã trả"}
            </StatusPill>
          </Card>
        ))}
      </div>
    </div>
  );
}
