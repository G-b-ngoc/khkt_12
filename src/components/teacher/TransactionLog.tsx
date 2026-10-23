"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Txn = {
  id: string;
  studentCode: string;
  fullName: string;
  type: "CHECK_IN" | "CHECK_OUT";
  performedBy: string;
  createdAt: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionLog({ type, emptyLabel }: { type: "CHECK_IN" | "CHECK_OUT"; emptyLabel: string }) {
  const [date, setDate] = useState(todayStr());
  const [items, setItems] = useState<Txn[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    fetch(`/api/teacher/transactions?type=${type}&date=${date}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [type, date]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-text-muted">
        Chỉ xem — tài khoản giáo viên không thực hiện được thao tác cất/trả.
      </p>

      <div className="flex items-center gap-2">
        <label htmlFor="date-filter" className="text-sm text-text-muted">Ngày</label>
        <input
          id="date-filter"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && items === null && <p className="text-sm text-text-muted">Đang tải...</p>}
      {items !== null && items.length === 0 && <p className="text-sm text-text-muted">{emptyLabel}</p>}

      <div className="flex flex-col gap-2">
        {items?.map((t) => (
          <Card key={t.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium text-text">
                {t.fullName} <span className="text-text-muted">· {t.studentCode}</span>
              </p>
              <p className="text-xs text-text-muted">{t.performedBy}</p>
            </div>
            <span className="text-xs text-text-muted">{new Date(t.createdAt).toLocaleTimeString("vi-VN")}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
