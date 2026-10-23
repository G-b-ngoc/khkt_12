"use client";

import { useRef, useState } from "react";
import { Card, StatusPill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

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
      <div className="flex items-center justify-center gap-2 text-2xl font-semibold text-text">
        {icon}
        {title}
      </div>

      <Card className="p-4">
        <label htmlFor="student-code" className="mb-1.5 block text-sm font-medium text-text">
          Mã học sinh
        </label>
        <div className="flex gap-2">
          <input
            id="student-code"
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") lookup();
            }}
            autoFocus
            placeholder="Nhập mã rồi nhấn Enter"
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3.5 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <Button size="lg" variant="secondary" onClick={lookup} loading={looking}>
            Tra cứu
          </Button>
        </div>
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
                Mã: {student.studentCode} · Lớp {student.classCode}
              </p>
            </div>
            <StatusPill tone={student.status === "IN" ? "success" : "neutral"}>
              {student.statusLabel}
            </StatusPill>
          </div>

          {student.status !== expectedStatus && (
            <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
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
