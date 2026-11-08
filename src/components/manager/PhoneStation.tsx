"use client";

import { useRef, useState } from "react";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { SearchIcon } from "@/components/ui/Icons";

type Lookup = {
  studentCode: string;
  fullName: string;
  classCode: string;
  status: "IN" | "OUT";
  statusLabel: string;
};

export function PhoneStation({
  mode,
  title,
  actionLabel,
  icon,
}: {
  mode: "CHECK_IN" | "CHECK_OUT";
  title: string;
  actionLabel: string;
  icon: React.ReactNode;
}) {
  const { show } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [student, setStudent] = useState<Lookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const expectedStatus = mode === "CHECK_IN" ? "OUT" : "IN";
  const canConfirm = student && student.status === expectedStatus && !submitting;

  async function lookup() {
    const trimmed = code.trim();
    if (!trimmed || looking) return;
    setLooking(true);
    setError(null);
    setStudent(null);
    try {
      const res = await fetch(`/api/manager/students/lookup?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Không tìm thấy học sinh");
        return;
      }
      setStudent(data);
    } catch {
      setError("Không thể kết nối tới máy chủ");
    } finally {
      setLooking(false);
    }
  }

  async function confirm() {
    if (!student || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/manager/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode: student.studentCode, type: mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        show("error", data.error ?? "Giao dịch thất bại");
        if (data.invalidTransaction) setError(data.error);
        return;
      }
      show("success", `${actionLabel} thành công cho ${data.fullName} (${data.studentCode})`);
      setStudent(null);
      setCode("");
      inputRef.current?.focus();
    } catch {
      show("error", "Không thể kết nối tới máy chủ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-text">
        {icon}
        {title}
      </div>

      <Card className="p-4">
        <label htmlFor="student-code" className="mb-1.5 block text-sm font-medium text-text">
          Mã học sinh
        </label>
        <div className="flex gap-2">
          {/* min-w-0: cho phép ô nhập co lại, tránh đẩy nút Tra cứu tràn ra ngoài thẻ trên màn hình hẹp. */}
          <input
            id="student-code"
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") lookup();
            }}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Nhập mã học sinh"
            className="tabular min-w-0 flex-1 rounded-xl border-[1.5px] border-border bg-surface px-4 py-3 text-lg font-semibold tracking-wide text-text outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-text-muted focus:border-accent focus:ring-4 focus:ring-accent-soft"
          />
          <Button
            variant="soft"
            onClick={lookup}
            loading={looking}
            aria-label="Tra cứu"
            className="shrink-0 px-4"
          >
            {!looking && <SearchIcon className="h-5 w-5" />}
            <span className="hidden sm:inline">Tra cứu</span>
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-muted">Nhấn Enter hoặc nút kính lúp để tra cứu.</p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </Card>

      {student && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-text">{student.fullName}</p>
              <p className="text-sm text-text-muted">
                <span className="tabular">{student.studentCode}</span> · Lớp {student.classCode}
              </p>
            </div>
            <StatusPill tone={student.status === "IN" ? "accent" : "neutral"}>
              {student.statusLabel}
            </StatusPill>
          </div>

          {student.status !== expectedStatus && (
            <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              Không thể {actionLabel.toLowerCase()}: trạng thái hiện tại không phù hợp.
            </p>
          )}

          <Button
            size="lg"
            className="mt-4 w-full"
            onClick={confirm}
            disabled={!canConfirm}
            loading={submitting}
          >
            Xác nhận {actionLabel.toLowerCase()}
          </Button>
        </Card>
      )}
    </div>
  );
}
