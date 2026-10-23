"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Log = {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold text-text">Nhật ký kiểm toán</h2>
      <p className="text-sm text-text-muted">Mọi hành động quản trị quan trọng đều được ghi lại, không thể sửa/xóa qua giao diện.</p>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && logs === null && <p className="text-sm text-text-muted">Đang tải...</p>}

      <div className="flex flex-col gap-2">
        {logs?.map((l) => (
          <Card key={l.id} className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text">{l.action}</span>
              <span className="text-xs text-text-muted">{new Date(l.createdAt).toLocaleString("vi-VN")}</span>
            </div>
            <p className="text-xs text-text-muted">
              {l.actorName} · {l.targetType} #{l.targetId.slice(0, 8)}
            </p>
            {l.metadata && (
              <pre className="mt-1 overflow-x-auto text-[11px] text-text-muted">{JSON.stringify(l.metadata)}</pre>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
