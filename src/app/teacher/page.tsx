"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, StatusPill, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { matchesSearchQuery } from "@/lib/search";
import { todayInAppTimezone, formatTimeInAppTimezone } from "@/lib/timezone";
import {
  EFFECTIVE_STATUS_LABEL,
  EFFECTIVE_STATUS_TONE,
  EFFECTIVE_STATUS_CODES,
  type EffectiveStatusCode,
} from "@/lib/overviewStatus";

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
  effectiveStatus: EffectiveStatusCode;
  adjustment: { newStatus: EffectiveStatusCode; reason: string; note: string | null; adjustedByName: string } | null;
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

/**
 * 4 trạng thái Cấp 2 được phép tự đặt tay — khớp với danh sách cho phép ở backend
 * (/api/teacher/overview/adjust). "Chưa ghi nhận cất" và "Cần xác minh" là trạng thái suy ra
 * tự động từ giao dịch thật, không đưa vào đây để tránh giáo viên tự đặt tay nhầm.
 */
const TEACHER_ADJUSTABLE_STATUS = ["CHECKED_IN", "CHECKED_OUT", "ABSENT", "EXEMPTED"] as const;
type TeacherAdjustableStatus = (typeof TEACHER_ADJUSTABLE_STATUS)[number];

export default function TeacherOverviewPage() {
  const { show } = useToast();
  const [date, setDate] = useState(todayInAppTimezone());
  const [rows, setRows] = useState<OverviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<EffectiveStatusCode | "ALL">("ALL");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [exportScope, setExportScope] = useState<"all" | "filtered">("all");

  // --- Điều chỉnh trạng thái ---
  const [adjustRow, setAdjustRow] = useState<OverviewRow | null>(null);
  const [adjustPhase, setAdjustPhase] = useState<"edit" | "confirm">("edit");
  const [newStatus, setNewStatus] = useState<TeacherAdjustableStatus>("CHECKED_IN");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AdjustmentHistoryItem[] | null>(null);

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

  function loadHistory() {
    fetch(`/api/teacher/overview/adjustments?date=${date}`)
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  useEffect(() => {
    if (showHistory) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory, date]);

  // Tìm kiếm + lọc chạy ngay trên dữ liệu của ngày đã tải, không gọi lại API khi gõ/đổi bộ lọc.
  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.effectiveStatus !== statusFilter) return false;
      return matchesSearchQuery(`${r.fullName} ${r.studentCode}`, q);
    });
  }, [rows, q, statusFilter]);

  // Thống kê tính lại trên đúng tập đã lọc, theo trạng thái HIỆU LỰC (đã gồm điều chỉnh nếu có).
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

  const hasActiveFilter = q.trim() !== "" || statusFilter !== "ALL";
  // Nếu không còn bộ lọc nào đang áp dụng, "chỉ xuất kết quả đang lọc" không có ý nghĩa — coi như xuất toàn bộ.
  const effectiveExportScope = hasActiveFilter ? exportScope : "all";

  // Backend (/api/teacher/overview/export) tự xác định lớp từ phiên đăng nhập, không nhận
  // classId từ client — nên xuất ở đây không thể lộ dữ liệu lớp khác dù sửa URL thủ công.
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({ date, format: exportFormat, scope: effectiveExportScope });
    if (effectiveExportScope === "filtered") {
      if (q) params.set("q", q);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
    }
    return `/api/teacher/overview/export?${params.toString()}`;
  }, [date, exportFormat, effectiveExportScope, q, statusFilter]);

  function openAdjust(row: OverviewRow) {
    const current = row.effectiveStatus;
    setAdjustRow(row);
    setAdjustPhase("edit");
    setNewStatus((TEACHER_ADJUSTABLE_STATUS as readonly string[]).includes(current) ? (current as TeacherAdjustableStatus) : "CHECKED_IN");
    setReason("");
    setNote("");
  }

  function closeAdjust() {
    if (submitting) return;
    setAdjustRow(null);
  }

  // "Đã trả" chỉ hợp lệ khi đã có giao dịch cất THẬT trong ngày — chặn luôn ở giao diện để
  // giáo viên không mất công điền form rồi bị backend từ chối; backend vẫn kiểm tra lại.
  const checkoutDisabled = adjustRow ? adjustRow.checkInStatus !== "Đã cất" : false;

  async function submitAdjust() {
    if (!adjustRow || !reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/overview/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: adjustRow.id,
          date,
          newStatus,
          reason: reason.trim(),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Không thể lưu điều chỉnh");
        return;
      }
      show("success", `Đã cập nhật trạng thái của ${adjustRow.fullName} thành "${EFFECTIVE_STATUS_LABEL[newStatus]}"`);
      setAdjustRow(null);
      load(date);
      if (showHistory) loadHistory();
    } catch {
      show("error", "Không thể lưu điều chỉnh — kiểm tra kết nối mạng và thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">Theo dõi cất/trả điện thoại</h1>
          <p className="text-sm text-text-muted">
            Lớp bạn được phân công — xem trạng thái theo ngày và điều chỉnh khi cần (bắt buộc nêu lý do).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="overview-date" className="text-sm text-text-muted">Ngày</label>
          <input
            id="overview-date"
            type="date"
            value={date}
            max={todayInAppTimezone()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <Button variant="secondary" size="md" onClick={() => load(date)}>
            Làm mới
          </Button>
          <Button variant="ghost" size="md" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "Ẩn lịch sử điều chỉnh" : "Xem lịch sử điều chỉnh"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
        <StatCard label="Tổng học sinh" value={stats.total} />
        <StatCard label="Đã cất" value={stats.checkedIn} tone="accent" />
        <StatCard label="Đã trả" value={stats.checkedOut} tone="success" />
        <StatCard label="Chưa ghi nhận" value={stats.notRecorded} />
        <StatCard label="Cần xác minh" value={stats.needsVerify} tone="warning" />
        <StatCard label="Vắng mặt" value={stats.absent} tone="danger" />
        <StatCard label="Được miễn" value={stats.exempted} tone="violet" />
      </div>

      {showHistory && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">Lịch sử điều chỉnh — ngày {date}</h3>
          {history === null && <p className="text-sm text-text-muted">Đang tải...</p>}
          {history !== null && history.length === 0 && (
            <p className="text-sm text-text-muted">Chưa có điều chỉnh nào cho ngày này.</p>
          )}
          {history !== null && history.length > 0 && (
            <div className="scroll-touch max-h-80 overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="py-2">Học sinh</th>
                    <th className="py-2">Trước → Sau</th>
                    <th className="py-2">Lý do</th>
                    <th className="py-2">Người thực hiện</th>
                    <th className="py-2">Thời điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-muted/60">
                      <td className="py-2">
                        {h.fullName} <span className="text-text-muted">· {h.studentCode}</span>
                      </td>
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
            <label htmlFor="status-filter" className="text-xs text-text-muted">Trạng thái</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EffectiveStatusCode | "ALL")}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="ALL">Tất cả</option>
              {EFFECTIVE_STATUS_CODES.map((c) => (
                <option key={c} value={c}>
                  {EFFECTIVE_STATUS_LABEL[c]}
                </option>
              ))}
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
          <div className="scroll-touch mt-4 max-h-[60vh] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[960px] border-collapse text-sm">
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
                  <th className="border-b border-border px-3 py-2 text-left">Điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted/60">
                    <td className="px-3 py-2 text-text-muted">{idx + 1}</td>
                    <td className="tabular px-3 py-2 font-medium text-text">{r.studentCode}</td>
                    <td className="px-3 py-2">
                      <Link href={`/teacher/students/${r.id}`} className="text-text hover:text-accent">
                        {r.fullName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openAdjust(r)}
                        title="Nhấn để điều chỉnh trạng thái"
                        className="rounded-full transition-transform duration-150 hover:scale-105"
                      >
                        {r.adjustment ? (
                          <StatusPill tone={EFFECTIVE_STATUS_TONE[r.adjustment.newStatus]}>
                            {EFFECTIVE_STATUS_LABEL[r.adjustment.newStatus]}
                          </StatusPill>
                        ) : (
                          <StatusPill tone={r.checkInStatus === "Đã cất" ? "accent" : "neutral"}>
                            {r.checkInStatus}
                          </StatusPill>
                        )}
                      </button>
                    </td>
                    <td className="tabular px-3 py-2 text-text-muted">{formatTimeInAppTimezone(r.checkInAt)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openAdjust(r)}
                        title="Nhấn để điều chỉnh trạng thái"
                        className="rounded-full transition-transform duration-150 hover:scale-105"
                      >
                        {r.adjustment ? (
                          <StatusPill tone={EFFECTIVE_STATUS_TONE[r.adjustment.newStatus]}>
                            {EFFECTIVE_STATUS_LABEL[r.adjustment.newStatus]}
                          </StatusPill>
                        ) : (
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
                        )}
                      </button>
                    </td>
                    <td className="tabular px-3 py-2 text-text-muted">{formatTimeInAppTimezone(r.checkOutAt)}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {r.adjustment ? `Đã điều chỉnh (${r.adjustment.adjustedByName}): ${r.adjustment.reason}` : r.note ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openAdjust(r)}
                        className="text-xs font-medium text-accent hover:underline"
                      >
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

      {/* Khối tải báo cáo đặt sau bảng: trên điện thoại, thống kê + bảng hiện ngay đầu trang. */}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <h2 className="w-full text-sm font-semibold text-text">Tải báo cáo ngày này</h2>
        <div>
          <label htmlFor="export-scope" className="mb-1 block text-xs text-text-muted">Phạm vi xuất</label>
          <select
            id="export-scope"
            value={effectiveExportScope}
            onChange={(e) => setExportScope(e.target.value as "all" | "filtered")}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="all">Toàn bộ danh sách lớp ({rows?.length ?? 0})</option>
            <option value="filtered" disabled={!hasActiveFilter}>
              Chỉ kết quả đang tìm/lọc {hasActiveFilter ? `(${filtered.length})` : ""}
            </option>
          </select>
        </div>
        <div>
          <label htmlFor="export-format" className="mb-1 block text-xs text-text-muted">Định dạng</label>
          <select
            id="export-format"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as "xlsx" | "csv")}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        <a href={exportUrl}>
          <Button variant="primary" size="md">Tải xuống báo cáo</Button>
        </a>
        <p className="w-full text-xs text-text-muted">
          File chỉ gồm học sinh lớp bạn được phân công, đúng ngày {date} đang chọn ở đầu trang — phản ánh trạng thái mới nhất kể cả sau khi điều chỉnh.
        </p>
      </Card>

      <Modal open={!!adjustRow} onClose={closeAdjust} title="Điều chỉnh trạng thái cất/trả">
        {adjustRow && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-muted p-3 text-sm">
              <p className="font-medium text-text">
                {adjustRow.fullName} <span className="text-text-muted">· {adjustRow.studentCode}</span>
              </p>
              <p className="text-text-muted">
                Lớp {adjustRow.classCode} · Ngày {date}
              </p>
              <p className="mt-1 text-text-muted">
                Trạng thái hiện tại:{" "}
                <StatusPill tone={EFFECTIVE_STATUS_TONE[adjustRow.effectiveStatus]}>
                  {EFFECTIVE_STATUS_LABEL[adjustRow.effectiveStatus]}
                </StatusPill>
              </p>
            </div>

            {adjustPhase === "edit" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text">Trạng thái mới</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TeacherAdjustableStatus)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  >
                    {TEACHER_ADJUSTABLE_STATUS.map((c) => (
                      <option key={c} value={c} disabled={c === "CHECKED_OUT" && checkoutDisabled}>
                        {EFFECTIVE_STATUS_LABEL[c]}
                        {c === "CHECKED_OUT" && checkoutDisabled ? " (chưa có giao dịch cất trong ngày)" : ""}
                      </option>
                    ))}
                  </select>
                  {checkoutDisabled && newStatus === "CHECKED_OUT" && (
                    <p className="mt-1 text-xs text-warning">
                      Học sinh chưa có giao dịch cất điện thoại trong ngày này — chỉ Cấp 3 mới xử lý được trường hợp đặc biệt này.
                    </p>
                  )}
                  {newStatus !== adjustRow.effectiveStatus && (
                    <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                      ⚠ Trạng thái sẽ thay đổi: <strong>{EFFECTIVE_STATUS_LABEL[adjustRow.effectiveStatus]}</strong> →{" "}
                      <strong>{EFFECTIVE_STATUS_LABEL[newStatus]}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-text">
                    Lý do điều chỉnh <span className="text-danger">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Bắt buộc — ví dụ: phụ huynh xin phép nghỉ có xác nhận"
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
                  <Button variant="ghost" className="flex-1" onClick={closeAdjust}>
                    Hủy
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setAdjustPhase("confirm")}
                    disabled={!reason.trim() || (newStatus === "CHECKED_OUT" && checkoutDisabled)}
                  >
                    Tiếp tục
                  </Button>
                </div>
              </>
            )}

            {adjustPhase === "confirm" && (
              <>
                <div className="space-y-2 rounded-lg border border-accent/30 bg-accent-soft/60 p-3 text-sm">
                  <p className="font-medium text-text">Xác nhận cập nhật trạng thái</p>
                  <p className="text-text-muted">
                    {adjustRow.fullName} ({adjustRow.studentCode}) — ngày {date}
                  </p>
                  <p>
                    <StatusPill tone={EFFECTIVE_STATUS_TONE[adjustRow.effectiveStatus]}>
                      {EFFECTIVE_STATUS_LABEL[adjustRow.effectiveStatus]}
                    </StatusPill>
                    <span className="mx-2 text-text-muted">→</span>
                    <StatusPill tone={EFFECTIVE_STATUS_TONE[newStatus]}>{EFFECTIVE_STATUS_LABEL[newStatus]}</StatusPill>
                  </p>
                  <p className="text-text-muted">
                    Lý do: <span className="text-text">{reason}</span>
                  </p>
                  {note.trim() && (
                    <p className="text-text-muted">
                      Ghi chú: <span className="text-text">{note}</span>
                    </p>
                  )}
                  <p className="text-xs text-text-muted">
                    Thao tác này sẽ được lưu vào lịch sử điều chỉnh, kèm tài khoản và thời điểm thực hiện. Giao dịch cất/trả gốc (nếu có) không bị thay đổi.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setAdjustPhase("edit")} disabled={submitting}>
                    Quay lại
                  </Button>
                  <Button className="flex-1" onClick={submitAdjust} loading={submitting}>
                    Xác nhận cập nhật
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
