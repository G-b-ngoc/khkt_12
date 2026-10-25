"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { matchesSearchQuery } from "@/lib/search";

type OverviewRow = {
  id: string;
  studentCode: string;
  fullName: string;
  classCode: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInStatus: "Đã cất" | "Chưa ghi nhận cất";
  checkOutStatus: "Đã trả" | "Cần xác minh" | "Chưa áp dụng";
  note: string | null;
};

type CheckInFilter = "ALL" | "DONE" | "MISSING";
type CheckOutFilter = "ALL" | "DONE" | "NEEDS_VERIFY" | "NA";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function TeacherOverviewPage() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<OverviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("ALL");
  const [checkOutFilter, setCheckOutFilter] = useState<CheckOutFilter>("ALL");

  function load(selectedDate: string) {
    fetch(`/api/teacher/overview?date=${selectedDate}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tải dữ liệu");
        return res.json();
      })
      .then((data: { rows: OverviewRow[] }) => {
        setError(null);
        setRows(data.rows);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load(date);
  }, [date]);

  // Tìm kiếm + lọc chạy ngay trên dữ liệu của ngày đã tải, không gọi lại API khi gõ/đổi bộ lọc.
  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (checkInFilter === "DONE" && r.checkInStatus !== "Đã cất") return false;
      if (checkInFilter === "MISSING" && r.checkInStatus !== "Chưa ghi nhận cất") return false;
      if (checkOutFilter === "DONE" && r.checkOutStatus !== "Đã trả") return false;
      if (checkOutFilter === "NEEDS_VERIFY" && r.checkOutStatus !== "Cần xác minh") return false;
      if (checkOutFilter === "NA" && r.checkOutStatus !== "Chưa áp dụng") return false;
      return matchesSearchQuery(`${r.fullName} ${r.studentCode}`, q);
    });
  }, [rows, q, checkInFilter, checkOutFilter]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      checkedIn: filtered.filter((r) => r.checkInStatus === "Đã cất").length,
      checkedOut: filtered.filter((r) => r.checkOutStatus === "Đã trả").length,
      missing: filtered.filter((r) => r.checkInStatus === "Chưa ghi nhận cất").length,
      needsVerify: filtered.filter((r) => r.checkOutStatus === "Cần xác minh").length,
    }),
    [filtered]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">Theo dõi cất/trả điện thoại</h1>
          <p className="text-sm text-text-muted">
            Lớp bạn được phân công — chỉ xem, không thực hiện cất/trả.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="overview-date" className="text-sm text-text-muted">Ngày</label>
          <input
            id="overview-date"
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <Button variant="secondary" size="md" onClick={() => load(date)}>
            Làm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Tổng học sinh" value={stats.total} />
        <StatCard label="Đã cất" value={stats.checkedIn} tone="success" />
        <StatCard label="Đã trả" value={stats.checkedOut} tone="success" />
        <StatCard label="Chưa ghi nhận cất" value={stats.missing} />
        <StatCard label="Cần xác minh" value={stats.needsVerify} tone="warning" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên học sinh hoặc mã học sinh…"
              aria-label="Tìm theo tên học sinh hoặc mã học sinh"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={checkInFilter}
              onChange={(e) => setCheckInFilter(e.target.value as CheckInFilter)}
              aria-label="Lọc theo trạng thái cất"
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="ALL">Trạng thái cất: Tất cả</option>
              <option value="DONE">Đã cất</option>
              <option value="MISSING">Chưa ghi nhận cất</option>
            </select>
            <select
              value={checkOutFilter}
              onChange={(e) => setCheckOutFilter(e.target.value as CheckOutFilter)}
              aria-label="Lọc theo trạng thái trả"
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="ALL">Trạng thái trả: Tất cả</option>
              <option value="DONE">Đã trả</option>
              <option value="NEEDS_VERIFY">Cần xác minh</option>
              <option value="NA">Chưa áp dụng</option>
            </select>
          </div>
        </div>

        <p className="mt-3 text-xs text-text-muted">
          {rows === null ? "Đang tải..." : `${filtered.length} / ${rows.length} học sinh phù hợp`}
        </p>

        {error && <p className="mt-3 text-sm text-danger">Không thể tải dữ liệu: {error}</p>}

        {!error && rows !== null && filtered.length === 0 && (
          <p className="mt-3 text-sm text-text-muted">
            {rows.length === 0 ? "Lớp bạn phụ trách chưa có học sinh." : "Không tìm thấy học sinh phù hợp."}
          </p>
        )}

        {!error && filtered.length > 0 && (
          <div className="mt-4 max-h-[60vh] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-surface-muted text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="border-b border-border px-3 py-2 text-left">STT</th>
                  <th className="border-b border-border px-3 py-2 text-left">Mã HS</th>
                  <th className="border-b border-border px-3 py-2 text-left">Họ và tên</th>
                  <th className="border-b border-border px-3 py-2 text-left">Trạng thái cất</th>
                  <th className="border-b border-border px-3 py-2 text-left">Thời gian cất</th>
                  <th className="border-b border-border px-3 py-2 text-left">Trạng thái trả</th>
                  <th className="border-b border-border px-3 py-2 text-left">Thời gian trả</th>
                  <th className="border-b border-border px-3 py-2 text-left">Ghi chú / cần xác minh</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted/60">
                    <td className="px-3 py-2 text-text-muted">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-text">{r.studentCode}</td>
                    <td className="px-3 py-2">
                      <Link href={`/teacher/students/${r.id}`} className="text-text hover:text-accent">
                        {r.fullName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill tone={r.checkInStatus === "Đã cất" ? "success" : "neutral"}>
                        {r.checkInStatus}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{formatTime(r.checkInAt)}</td>
                    <td className="px-3 py-2">
                      <StatusPill
                        tone={
                          r.checkOutStatus === "Đã trả"
                            ? "success"
                            : r.checkOutStatus === "Cần xác minh"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {r.checkOutStatus}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{formatTime(r.checkOutAt)}</td>
                    <td className="px-3 py-2 text-text-muted">{r.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-text";
  return (
    <Card className="p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
    </Card>
  );
}
