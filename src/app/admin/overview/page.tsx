"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { useToast } from "@/components/ui/Toast";
import { matchesSearchQuery } from "@/lib/search";
import { todayInAppTimezone, formatTimeInAppTimezone } from "@/lib/timezone";
import {
  EFFECTIVE_STATUS_LABEL,
  EFFECTIVE_STATUS_TONE,
  EFFECTIVE_STATUS_CODES,
  type EffectiveStatusCode,
} from "@/lib/overviewStatus";

type ClassOpt = { id: string; code: string; name: string };

type OverviewRow = {
  id: string;
  studentCode: string;
  fullName: string;
  classId: string;
  classCode: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInStatus: "Đã cất" | "Chưa ghi nhận cất";
  checkOutStatus: "Đã trả" | "Cần xác minh" | "Chưa áp dụng";
  note: string | null;
  effectiveStatus: EffectiveStatusCode;
  adjustment: {
    newStatus: EffectiveStatusCode;
    reason: string;
    note: string | null;
    adjustedByName: string;
    createdAt: string;
  } | null;
};

type AdjustmentHistoryItem = {
  id: string;
  studentCode: string;
  fullName: string;
  classCode: string;
  date: string;
  previousStatus: EffectiveStatusCode;
  newStatus: EffectiveStatusCode;
  reason: string;
  note: string | null;
  adjustedByName: string;
  createdAt: string;
};

type SortField = "name" | "code" | "status" | "checkInAt" | "checkOutAt";

export default function AdminOverviewPage() {
  const { show } = useToast();
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayInAppTimezone());

  const [rows, setRows] = useState<OverviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<EffectiveStatusCode | "ALL">("ALL");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [adjustRow, setAdjustRow] = useState<OverviewRow | null>(null);
  const [newStatus, setNewStatus] = useState<EffectiveStatusCode>("CHECKED_IN");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AdjustmentHistoryItem[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/classes")
      .then((r) => r.json())
      .then((cs: ClassOpt[]) => {
        setClasses(cs);
        setClassId((prev) => prev || cs[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  function load() {
    if (!classId) return;
    fetch(`/api/admin/overview?classId=${classId}&date=${date}`)
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  function loadHistory() {
    if (!classId) return;
    fetch(`/api/admin/overview/adjustments?classId=${classId}`)
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  useEffect(() => {
    if (showHistory) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory, classId]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    let list = rows.filter((r) => {
      if (statusFilter !== "ALL" && r.effectiveStatus !== statusFilter) return false;
      return matchesSearchQuery(`${r.fullName} ${r.studentCode}`, q);
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.fullName.localeCompare(b.fullName, "vi");
      else if (sortField === "code") cmp = a.studentCode.localeCompare(b.studentCode, "vi");
      else if (sortField === "status") cmp = a.effectiveStatus.localeCompare(b.effectiveStatus);
      else if (sortField === "checkInAt") cmp = (a.checkInAt ?? "").localeCompare(b.checkInAt ?? "");
      else if (sortField === "checkOutAt") cmp = (a.checkOutAt ?? "").localeCompare(b.checkOutAt ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, q, statusFilter, sortField, sortDir]);

  const stats = useMemo(() => {
    const count = (code: EffectiveStatusCode) => filtered.filter((r) => r.effectiveStatus === code).length;
    return {
      total: filtered.length,
      checkedIn: count("CHECKED_IN"),
      checkedOut: count("CHECKED_OUT"),
      notRecorded: count("NOT_RECORDED"),
      needsVerify: count("NEEDS_VERIFICATION"),
      absent: count("ABSENT"),
      exempted: count("EXEMPTED"),
    };
  }, [filtered]);

  function openAdjust(row: OverviewRow) {
    setAdjustRow(row);
    setNewStatus(row.effectiveStatus);
    setReason("");
    setNote("");
  }

  async function submitAdjust() {
    if (!adjustRow || !reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/overview/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: adjustRow.id, date, newStatus, reason: reason.trim(), note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Không thể lưu điều chỉnh");
        return;
      }
      show("success", "Đã lưu điều chỉnh trạng thái");
      setAdjustRow(null);
      load();
      if (showHistory) loadHistory();
    } finally {
      setSubmitting(false);
    }
  }

  const exportUrl = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams({ classId, date, format });
    if (q) params.set("q", q);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    return `/api/admin/overview/export?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text">Theo dõi cất/trả điện thoại</h1>
        <p className="text-sm text-text-muted">Xem toàn trường theo lớp và ngày — Cấp 3 có thể điều chỉnh trạng thái khi cần, theo quy trình kiểm soát.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-text-muted">Lớp</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="min-w-[180px] rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Ngày</label>
            <input
              type="date"
              value={date}
              max={todayInAppTimezone()}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="relative min-w-[220px] flex-1">
            <label className="mb-1 block text-xs text-text-muted">Tìm kiếm</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên học sinh hoặc mã học sinh…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-sm outline-none focus:border-accent"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-[34px] text-text-muted hover:text-text"
              >
                ✕
              </button>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EffectiveStatusCode | "ALL")}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="ALL">Tất cả</option>
              {EFFECTIVE_STATUS_CODES.map((c) => (
                <option key={c} value={c}>
                  {EFFECTIVE_STATUS_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Sắp xếp</label>
            <div className="flex gap-1">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="name">Họ tên</option>
                <option value="code">Mã HS</option>
                <option value="status">Trạng thái</option>
                <option value="checkInAt">Giờ cất</option>
                <option value="checkOutAt">Giờ trả</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d: "asc" | "desc") => (d === "asc" ? "desc" : "asc"))}
                className="rounded-lg border border-border bg-surface px-2.5 text-sm text-text-muted hover:text-text"
                title={sortDir === "asc" ? "Tăng dần" : "Giảm dần"}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
          <Button variant="secondary" size="md" onClick={load}>
            Làm mới
          </Button>
          <a href={exportUrl("csv")}>
            <Button variant="secondary" size="md">Xuất CSV</Button>
          </a>
          <a href={exportUrl("xlsx")}>
            <Button variant="secondary" size="md">Xuất Excel</Button>
          </a>
          <Button variant="ghost" size="md" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "Ẩn lịch sử điều chỉnh" : "Xem lịch sử điều chỉnh"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Tổng học sinh" value={stats.total} />
        <StatCard label="Đã cất" value={stats.checkedIn} tone="success" />
        <StatCard label="Đã trả" value={stats.checkedOut} tone="success" />
        <StatCard label="Chưa ghi nhận cất" value={stats.notRecorded} />
        <StatCard label="Cần xác minh" value={stats.needsVerify} tone="warning" />
        <StatCard label="Vắng mặt" value={stats.absent} tone="warning" />
        <StatCard label="Được miễn" value={stats.exempted} />
      </div>

      {showHistory && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">Lịch sử điều chỉnh — lớp {classes.find((c) => c.id === classId)?.code}</h3>
          {history === null && <p className="text-sm text-text-muted">Đang tải...</p>}
          {history !== null && history.length === 0 && <p className="text-sm text-text-muted">Chưa có điều chỉnh nào cho lớp này.</p>}
          {history !== null && history.length > 0 && (
            <div className="max-h-80 overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="py-2">Học sinh</th>
                    <th className="py-2">Ngày</th>
                    <th className="py-2">Trước → Sau</th>
                    <th className="py-2">Lý do</th>
                    <th className="py-2">Người thực hiện</th>
                    <th className="py-2">Thời điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-border last:border-b-0">
                      <td className="py-2">
                        {h.fullName} <span className="text-text-muted">· {h.studentCode}</span>
                      </td>
                      <td className="py-2 text-text-muted">{h.date}</td>
                      <td className="py-2 text-xs text-text-muted">
                        {EFFECTIVE_STATUS_LABEL[h.previousStatus]} → {EFFECTIVE_STATUS_LABEL[h.newStatus]}
                      </td>
                      <td className="py-2">{h.reason}</td>
                      <td className="py-2 text-text-muted">{h.adjustedByName}</td>
                      <td className="py-2 text-text-muted">{new Date(h.createdAt).toLocaleString("vi-VN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <p className="mb-3 text-xs text-text-muted">
          {rows === null ? "Đang tải..." : `${filtered.length} / ${rows.length} học sinh phù hợp`}
        </p>

        {error && <p className="text-sm text-danger">Không thể tải dữ liệu: {error}</p>}

        {!error && rows !== null && filtered.length === 0 && (
          <p className="text-sm text-text-muted">{rows.length === 0 ? "Lớp này chưa có học sinh." : "Không tìm thấy học sinh phù hợp."}</p>
        )}

        {!error && filtered.length > 0 && (
          <div className="max-h-[65vh] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-surface-muted text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="border-b border-border px-3 py-2 text-left">STT</th>
                  <th className="border-b border-border px-3 py-2 text-left">Mã HS</th>
                  <th className="border-b border-border px-3 py-2 text-left">Họ và tên</th>
                  <th className="border-b border-border px-3 py-2 text-left">Trạng thái cất</th>
                  <th className="border-b border-border px-3 py-2 text-left">Giờ cất</th>
                  <th className="border-b border-border px-3 py-2 text-left">Trạng thái trả</th>
                  <th className="border-b border-border px-3 py-2 text-left">Giờ trả</th>
                  <th className="border-b border-border px-3 py-2 text-left">Ghi chú</th>
                  <th className="border-b border-border px-3 py-2 text-left">Điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted/60">
                    <td className="px-3 py-2 text-text-muted">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-text">{r.studentCode}</td>
                    <td className="px-3 py-2">{r.fullName}</td>
                    <td className="px-3 py-2">
                      <StatusPill tone={r.checkInStatus === "Đã cất" ? "success" : "neutral"}>{r.checkInStatus}</StatusPill>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{formatTimeInAppTimezone(r.checkInAt)}</td>
                    <td className="px-3 py-2">
                      <StatusPill
                        tone={r.checkOutStatus === "Đã trả" ? "success" : r.checkOutStatus === "Cần xác minh" ? "warning" : "neutral"}
                      >
                        {r.checkOutStatus}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{formatTimeInAppTimezone(r.checkOutAt)}</td>
                    <td className="px-3 py-2 text-xs text-text-muted">
                      {r.adjustment ? (
                        <span>
                          <StatusPill tone={EFFECTIVE_STATUS_TONE[r.adjustment.newStatus]}>
                            {EFFECTIVE_STATUS_LABEL[r.adjustment.newStatus]}
                          </StatusPill>
                          <span className="ml-1">— {r.adjustment.reason}</span>
                        </span>
                      ) : (
                        r.note ?? "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => openAdjust(r)} className="text-xs font-medium text-accent hover:underline">
                        Điều chỉnh
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SlideOver open={!!adjustRow} onClose={() => setAdjustRow(null)} title="Điều chỉnh trạng thái">
        {adjustRow && (
          <div className="space-y-3">
            <div className="rounded-lg bg-surface-muted p-3 text-sm">
              <p className="font-medium text-text">
                {adjustRow.fullName} <span className="text-text-muted">· {adjustRow.studentCode}</span>
              </p>
              <p className="text-text-muted">
                Lớp {adjustRow.classCode} · Ngày {date}
              </p>
              <p className="mt-1 text-text-muted">
                Trạng thái hiện tại: <strong className="text-text">{EFFECTIVE_STATUS_LABEL[adjustRow.effectiveStatus]}</strong>
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">Trạng thái mới</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as EffectiveStatusCode)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {EFFECTIVE_STATUS_CODES.map((c) => (
                  <option key={c} value={c}>
                    {EFFECTIVE_STATUS_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                Lý do điều chỉnh <span className="text-danger">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Bắt buộc — ví dụ: phụ huynh xin phép nghỉ có xác nhận của GVCN"
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text">Ghi chú bổ sung (tuỳ chọn)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Thông tin xác minh thêm, nếu có"
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setAdjustRow(null)} disabled={submitting}>
                Hủy
              </Button>
              <Button className="flex-1" onClick={submitAdjust} loading={submitting} disabled={!reason.trim()}>
                Xác nhận điều chỉnh
              </Button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-text";
  return (
    <Card className="p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
    </Card>
  );
}
