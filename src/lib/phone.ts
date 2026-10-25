import { prisma } from "@/lib/prisma";
import type { TransactionType } from "@prisma/client";

export type PhoneStatus = "IN" | "OUT"; // IN = điện thoại đang được nhà trường cất giữ

/** Trạng thái hiện tại của học sinh dựa trên giao dịch gần nhất (nguồn sự thật duy nhất). */
export async function getStudentPhoneStatus(studentId: string): Promise<PhoneStatus> {
  const last = await prisma.phoneTransaction.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return "OUT"; // chưa từng cất -> coi như đang giữ điện thoại ở học sinh
  return last.type === "CHECK_IN" ? "IN" : "OUT";
}

export function statusLabel(status: PhoneStatus): string {
  return status === "IN" ? "Đã cất tại trạm" : "Đang giữ (chưa cất / đã trả)";
}

export type DayTxn = { type: TransactionType; createdAt: Date; note: string | null };

export type DayPhoneState = {
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInStatus: "Đã cất" | "Chưa ghi nhận cất";
  /** "Chưa áp dụng" khi ngày đó chưa có lượt cất nên không có gì để trả — không phải vắng mặt/vi phạm. */
  checkOutStatus: "Đã trả" | "Cần xác minh" | "Chưa áp dụng";
  note: string | null;
};

/**
 * Suy ra trạng thái cất/trả của 1 học sinh trong 1 ngày CHỈ từ các giao dịch thật đã ghi
 * nhận trong ngày đó — không suy diễn vắng mặt/vi phạm/miễn khi chưa có dữ liệu xác nhận.
 * "Cần xác minh" chỉ dùng cho đúng 1 trường hợp có dữ liệu: đã có lượt cất trong ngày
 * nhưng chưa thấy lượt trả nào sau đó (giao dịch còn dang dở), cùng logic đã dùng khi tạo
 * báo cáo cuối tuần ở src/lib/reports.ts (stillCheckedInAtWeekEnd).
 */
export function computeDayPhoneState(dayTxns: DayTxn[]): DayPhoneState {
  const sorted = [...dayTxns].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const checkIn = sorted.find((t) => t.type === "CHECK_IN") ?? null;
  const checkOut =
    sorted.find((t) => t.type === "CHECK_OUT" && (!checkIn || t.createdAt >= checkIn.createdAt)) ?? null;

  const checkInStatus: DayPhoneState["checkInStatus"] = checkIn ? "Đã cất" : "Chưa ghi nhận cất";
  const checkOutStatus: DayPhoneState["checkOutStatus"] = checkOut
    ? "Đã trả"
    : checkIn
      ? "Cần xác minh"
      : "Chưa áp dụng";

  const manualNotes = sorted.map((t) => t.note).filter((n): n is string => Boolean(n && n.trim()));
  const autoNote = checkOutStatus === "Cần xác minh" ? "Cần xác minh: chưa ghi nhận lượt trả trong ngày." : null;
  const note = [...manualNotes, autoNote].filter(Boolean).join(" ") || null;

  return {
    checkInAt: checkIn ? checkIn.createdAt.toISOString() : null,
    checkOutAt: checkOut ? checkOut.createdAt.toISOString() : null,
    checkInStatus,
    checkOutStatus,
    note,
  };
}
