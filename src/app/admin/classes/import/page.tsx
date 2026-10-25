"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type ClassOpt = { id: string; code: string; name: string };

type RowOutcome = {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  outcome: "NEW" | "UPDATE" | "CLASS_CONFLICT" | "DUPLICATE_IN_FILE" | "INVALID";
  existingClassCode?: string;
  previousFullName?: string;
  reason?: string;
};

type PreviewResult = {
  batchId: string;
  classCode: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  newCount: number;
  updateCount: number;
  conflictCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: RowOutcome[];
};

type CommitResult = {
  createdCount: number;
  updatedCount: number;
  conflictCount: number;
  duplicateCount: number;
  invalidCount: number;
};

type HistoryItem = {
  id: string;
  classCode: string;
  fileName: string;
  status: "COMMITTED" | "FAILED" | "PROCESSING";
  totalRows: number;
  validRows: number;
  createdCount: number | null;
  updatedCount: number | null;
  conflictCount: number | null;
  duplicateCount: number | null;
  invalidCount: number | null;
  errorMessage: string | null;
  uploadedByName: string;
  createdAt: string;
  committedAt: string | null;
};

const OUTCOME_LABEL: Record<RowOutcome["outcome"], string> = {
  NEW: "Học sinh mới",
  UPDATE: "Cập nhật họ tên",
  CLASS_CONFLICT: "Mã thuộc lớp khác — bỏ qua",
  DUPLICATE_IN_FILE: "Trùng mã trong file — bỏ qua",
  INVALID: "Thiếu dữ liệu — bỏ qua",
};

const OUTCOME_TONE: Record<RowOutcome["outcome"], "neutral" | "success" | "warning" | "danger"> = {
  NEW: "success",
  UPDATE: "neutral",
  CLASS_CONFLICT: "warning",
  DUPLICATE_IN_FILE: "warning",
  INVALID: "danger",
};

export default function AdminImportStudentsPage() {
  const { show } = useToast();
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [classId, setClassId] = useState("");
  const didAutoSelectClass = useRef(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [savingClass, setSavingClass] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);

  const [history, setHistory] = useState<HistoryItem[] | null>(null);

  function loadClasses() {
    fetch("/api/admin/classes")
      .then((r) => r.json())
      .then((cs: ClassOpt[]) => {
        setClasses(cs);
        if (!didAutoSelectClass.current && cs[0]) {
          didAutoSelectClass.current = true;
          setClassId(cs[0].id);
        }
      })
      .catch(() => {});
  }

  function loadHistory(cid: string) {
    if (!cid) return;
    fetch(`/api/admin/classes/import?classId=${cid}`)
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  function selectClass(id: string) {
    setClassId(id);
    setPreview(null);
    setPreviewError(null);
    setResult(null);
  }

  useEffect(loadClasses, []);
  useEffect(() => {
    loadHistory(classId);
  }, [classId]);

  async function createClass() {
    if (!newCode.trim() || !newName.trim() || savingClass) return;
    setSavingClass(true);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode.trim(), name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Không thể tạo lớp");
        return;
      }
      show("success", "Đã tạo lớp mới");
      setCreatingClass(false);
      setNewCode("");
      setNewName("");
      selectClass(data.id);
      loadClasses();
    } finally {
      setSavingClass(false);
    }
  }

  async function analyzeFile() {
    if (!file || !classId || analyzing) return;
    setAnalyzing(true);
    setPreviewError(null);
    setPreview(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("classId", classId);
      form.set("file", file);
      const res = await fetch("/api/admin/classes/import/preview", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error ?? "Không thể phân tích file");
        return;
      }
      setPreview(data);
    } catch {
      setPreviewError("Không thể kết nối tới máy chủ");
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirmCommit() {
    if (!preview || committing) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/admin/classes/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: preview.batchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Nhập dữ liệu thất bại");
        return;
      }
      setResult(data);
      show("success", `Đã nhập xong: ${data.createdCount} học sinh mới, ${data.updatedCount} cập nhật.`);
      setPreview(null);
      setFile(null);
      loadClasses();
      loadHistory(classId);
    } finally {
      setCommitting(false);
    }
  }

  const selectedClass = classes.find((c) => c.id === classId);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Thêm lớp / Nhập danh sách từ file</h2>
          <p className="text-sm text-text-muted">Chỉ quản trị viên Cấp 3 mới dùng được chức năng này.</p>
        </div>
        <Link href="/admin/classes" className="text-sm text-accent hover:underline">
          ← Quay lại Quản lý lớp
        </Link>
      </div>

      {/* Bước 1: chọn/tạo lớp */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">1. Chọn lớp cần nhập danh sách</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={classId}
            onChange={(e) => selectClass(e.target.value)}
            className="min-w-[220px] rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="md" onClick={() => setCreatingClass((v) => !v)}>
            {creatingClass ? "Hủy tạo lớp mới" : "+ Tạo lớp mới"}
          </Button>
        </div>

        {creatingClass && (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-muted p-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Mã lớp</label>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="VD: 12A3"
                className="w-32 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Tên lớp</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Lớp 12A3"
                className="w-56 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <Button size="md" onClick={createClass} loading={savingClass} disabled={!newCode.trim() || !newName.trim()}>
              Tạo lớp
            </Button>
          </div>
        )}
      </Card>

      {/* Bước 2: tải file mẫu + chọn file */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">2. Tải file danh sách học sinh</h3>
        <p className="mb-3 text-sm text-text-muted">
          File cần có tối thiểu 2 cột: <strong>Mã HS</strong> và <strong>Họ và tên</strong> (chấp nhận nhiều cách viết
          khác nhau, không quan trọng thứ tự cột). Hỗ trợ .xlsx, .xls, .csv (UTF-8).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* Liên kết tới API tải file nhị phân, không phải route trang — dùng <a> thường, không dùng next/link */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/admin/classes/import/template" className="text-sm font-medium text-accent hover:underline">
            ⬇ Tải file mẫu (.xlsx)
          </a>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <Button size="md" onClick={analyzeFile} loading={analyzing} disabled={!file || !classId}>
            Phân tích file
          </Button>
        </div>
        {previewError && <p className="mt-3 text-sm text-danger">{previewError}</p>}
      </Card>

      {/* Bước 3: xem trước + xác nhận */}
      {preview && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">
            3. Xem trước — nhập vào lớp {preview.classCode} ({preview.fileName})
          </h3>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <MiniStat label="Tổng dòng" value={preview.totalRows} />
            <MiniStat label="Hợp lệ" value={preview.validRows} tone="success" />
            <MiniStat label="Mới" value={preview.newCount} tone="success" />
            <MiniStat label="Cập nhật" value={preview.updateCount} />
            <MiniStat
              label="Lỗi/bỏ qua"
              value={preview.conflictCount + preview.duplicateCount + preview.invalidCount}
              tone="warning"
            />
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="sticky top-0 bg-surface-muted text-xs uppercase text-text-muted">
                <tr>
                  <th className="border-b border-border px-3 py-2 text-left">Dòng</th>
                  <th className="border-b border-border px-3 py-2 text-left">Mã HS</th>
                  <th className="border-b border-border px-3 py-2 text-left">Họ và tên</th>
                  <th className="border-b border-border px-3 py-2 text-left">Kết quả</th>
                  <th className="border-b border-border px-3 py-2 text-left">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 text-text-muted">{r.rowNumber}</td>
                    <td className="px-3 py-2 font-medium text-text">{r.studentCode || "—"}</td>
                    <td className="px-3 py-2">{r.fullName || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusPill tone={OUTCOME_TONE[r.outcome]}>{OUTCOME_LABEL[r.outcome]}</StatusPill>
                    </td>
                    <td className="px-3 py-2 text-xs text-text-muted">
                      {r.outcome === "CLASS_CONFLICT" && `Hiện thuộc lớp ${r.existingClassCode}`}
                      {r.outcome === "UPDATE" && r.previousFullName !== r.fullName && `Tên cũ: ${r.previousFullName}`}
                      {r.outcome === "INVALID" && r.reason}
                      {r.outcome === "DUPLICATE_IN_FILE" && r.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={confirmCommit} loading={committing} disabled={preview.validRows === 0}>
              Xác nhận nhập ({preview.validRows} học sinh)
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={committing}>
              Hủy
            </Button>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Các dòng &quot;mã thuộc lớp khác&quot; sẽ KHÔNG được tự động chuyển lớp — bỏ qua an toàn. Các dòng &quot;trùng
            mã trong file&quot; hoặc thiếu dữ liệu cũng sẽ bị bỏ qua, chỉ phần hợp lệ được nhập.
          </p>
        </Card>
      )}

      {result && (
        <Card className="border-success/40 bg-success/5 p-4">
          <p className="text-sm font-medium text-text">Đã nhập xong</p>
          <p className="mt-1 text-sm text-text-muted">
            {result.createdCount} học sinh mới · {result.updatedCount} cập nhật họ tên · {result.conflictCount} bỏ qua
            (thuộc lớp khác) · {result.duplicateCount} bỏ qua (trùng mã trong file) · {result.invalidCount} bỏ qua
            (thiếu dữ liệu).
          </p>
        </Card>
      )}

      {/* Nhật ký import của lớp đang chọn */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">
          Lịch sử nhập danh sách — lớp {selectedClass?.code ?? ""}
        </h3>
        {history === null && <p className="text-sm text-text-muted">Đang tải...</p>}
        {history !== null && history.length === 0 && (
          <p className="text-sm text-text-muted">Chưa có lần nhập nào cho lớp này.</p>
        )}
        {history !== null && history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2">Thời gian</th>
                  <th className="py-2">File</th>
                  <th className="py-2">Người thực hiện</th>
                  <th className="py-2">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 text-text-muted">{new Date(h.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="py-2">{h.fileName}</td>
                    <td className="py-2">{h.uploadedByName}</td>
                    <td className="py-2">
                      {h.status === "FAILED" ? (
                        <StatusPill tone="danger">Lỗi: {h.errorMessage ?? "không xác định"}</StatusPill>
                      ) : (
                        <span className="text-xs text-text-muted">
                          +{h.createdCount ?? 0} mới · {h.updatedCount ?? 0} cập nhật ·{" "}
                          {(h.conflictCount ?? 0) + (h.duplicateCount ?? 0) + (h.invalidCount ?? 0)} bỏ qua
                        </span>
                      )}
                    </td>
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

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-text";
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
